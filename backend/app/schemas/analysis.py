from typing import Optional
from pydantic import BaseModel


# Matches frontend zodSchemas.ts → ExplainResultSchema exactly
class ExplainResult(BaseModel):
    text:            Optional[str]        = None
    zusammenfassung: Optional[str]        = None
    titel:           Optional[str]        = None
    typ:             Optional[str]        = None
    risiko:          Optional[str]        = None   # "hoch" | "mittel" | "niedrig"
    betrag:          Optional[float]      = None
    frist:           Optional[str]        = None
    iban:            Optional[str]        = None
    aktionen:        Optional[list[str]]  = None
    confidence:      Optional[float]      = None
    kurzfassung:     Optional[str]        = None
    warnung:         Optional[str]        = None

    model_config = {"extra": "allow"}


class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    lang:     str = "de"


class ChatResponse(BaseModel):
    reply:      str
    doc_id:     str
    model_used: str
