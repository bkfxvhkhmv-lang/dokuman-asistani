from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id:         str
    titel:      Optional[str]  = None
    status:     Optional[str]  = None
    typ:        Optional[str]  = None
    risiko:     Optional[str]  = None
    betrag:     Optional[float] = None
    frist:      Optional[str]  = None
    checksum:   Optional[str]  = None
    version:    Optional[int]  = None
    updated_at: Optional[str]  = None
    duplicate:  bool = False
    existing_document_id: Optional[str] = None

    model_config = {"from_attributes": True, "extra": "allow"}


class DocumentListOut(BaseModel):
    items:    list[DocumentOut]
    total:    int
    limit:    int
    offset:   int
    has_more: bool


class SyncDocumentOut(BaseModel):
    id:         str
    user_id:    Optional[str] = None
    status:     Optional[str] = None
    checksum:   Optional[str] = None
    version:    Optional[int] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True, "extra": "allow"}


class DeltaSyncResult(BaseModel):
    changed: list[SyncDocumentOut]
    deleted: list[str]
