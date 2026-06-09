import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document
from app.models.share_link import DocumentShare
from app.schemas.share import ShareLinkCreate, ShareLinkOut
from app.api.auth import get_current_user_id

router = APIRouter(prefix="/share", tags=["share"])

_TTL_RE = re.compile(r"^(\d+)(s|m|h|d|w)$", re.I)
_MAX_SHARE = timedelta(days=90)


def _parse_ttl(ttl: str) -> timedelta:
    m = _TTL_RE.match(ttl.strip())
    if not m:
        raise HTTPException(400, "Invalid ttl: use e.g. 30m, 24h, 7d, 2w")
    n, u = int(m.group(1)), m.group(2).lower()
    mult = {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}
    delta = timedelta(seconds=n * mult[u])
    if delta <= timedelta(0) or delta > _MAX_SHARE:
        raise HTTPException(400, "ttl must be positive and at most 90 days")
    return delta


@router.post("/{doc_id}", response_model=ShareLinkOut)
async def create_share_link(
    doc_id: str,
    body: ShareLinkCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    row = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == user_id))
    doc = row.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    delta = _parse_ttl(body.ttl)
    now = datetime.now(timezone.utc)
    expires = now + delta
    token = secrets.token_urlsafe(48)[:96]

    share = DocumentShare(
        token=token,
        doc_id=doc.id,
        user_id=user_id,
        expires_at=expires,
        max_views=body.max_views,
        view_count=0,
    )
    db.add(share)

    from app.config import get_settings

    base = get_settings().share_public_base_url.rstrip("/")
    return ShareLinkOut(
        share_url=f"{base}/{token}",
        token=token,
        expires_at=expires.isoformat(),
    )


@router.delete("/{token}", status_code=204)
async def revoke_share_link(
    token: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    row = await db.execute(select(DocumentShare).where(DocumentShare.token == token))
    sh = row.scalar_one_or_none()
    if not sh or sh.user_id != user_id:
        raise HTTPException(404, "Share not found")
    await db.execute(delete(DocumentShare).where(DocumentShare.token == token))
    return None
