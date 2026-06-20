from typing import Literal, Optional

from pydantic import BaseModel, Field


class WorkerResultDocument(BaseModel):
    suggested_title: Optional[str] = None
    document_type: Optional[str] = None
    sender: Optional[str] = None
    date: Optional[str] = None
    deadline: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    raw_text: Optional[str] = None
    rechnungsnr: Optional[str] = None


class WorkerResultActionSummary(BaseModel):
    kind: Optional[str] = None
    summary: Optional[str] = None
    short_summary: Optional[str] = None
    next_action: Optional[str] = None
    deadline: Optional[str] = None
    amount: Optional[float] = None
    warnings: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


class WorkerResultMeta(BaseModel):
    source: Literal["paddle_worker"] = "paddle_worker"
    model: Optional[str] = None
    processed_at: str
    provider: Literal["paddle"] = "paddle"
    iban: Optional[str] = None


class BackendWorkerResult(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    confidence: Optional[float] = None
    language: Optional[str] = None
    document: WorkerResultDocument
    action_summary: WorkerResultActionSummary
    meta: WorkerResultMeta
    error: Optional[str] = None

    model_config = {"extra": "forbid"}
