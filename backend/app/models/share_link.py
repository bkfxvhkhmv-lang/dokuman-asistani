from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentShare(Base):
    """Time-limited public share tokens for documents (ownership enforced in API layer)."""

    __tablename__ = "document_shares"

    token: Mapped[str]           = mapped_column(String(96), primary_key=True)
    doc_id: Mapped[str]         = mapped_column(
        String, ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str]        = mapped_column(String, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_views: Mapped[int]      = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int]     = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    document = relationship("Document", backref="shares", lazy="joined")
