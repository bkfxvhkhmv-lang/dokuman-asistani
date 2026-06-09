from pydantic import BaseModel, Field


class ShareLinkCreate(BaseModel):
    ttl: str = Field(..., description="e.g. 24h, 7d, 30m")
    max_views: int = Field(0, ge=0)


class ShareLinkOut(BaseModel):
    share_url: str
    token: str
    expires_at: str

