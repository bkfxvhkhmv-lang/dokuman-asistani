import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiUsageEvent(Base):
    __tablename__ = "ai_usage_events"

    id:                          Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at:                  Mapped[datetime]         = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    feature:                     Mapped[str]              = mapped_column(String, nullable=False)
    route:                       Mapped[str]              = mapped_column(String, nullable=False)
    provider:                    Mapped[str]              = mapped_column(String, nullable=False)
    model:                       Mapped[Optional[str]]    = mapped_column(String, nullable=True)
    document_id:                 Mapped[Optional[str]]    = mapped_column(String, nullable=True)
    user_id:                     Mapped[Optional[str]]    = mapped_column(String, nullable=True)
    input_tokens:                Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)
    output_tokens:               Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)
    total_tokens:                Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)
    cache_creation_input_tokens: Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)
    cache_read_input_tokens:     Mapped[Optional[int]]    = mapped_column(Integer, nullable=True)
    estimated_cost_usd:          Mapped[Optional[Decimal]]= mapped_column(Numeric(18, 8), nullable=True)
    latency_ms:                  Mapped[Optional[Decimal]]= mapped_column(Numeric(10, 2), nullable=True)
    success:                     Mapped[bool]             = mapped_column(Boolean, nullable=False, default=True)
    error_type:                  Mapped[Optional[str]]    = mapped_column(String, nullable=True)

    __table_args__ = (
        Index("ix_ai_usage_events_created_at",    "created_at"),
        Index("ix_ai_usage_events_feature_route", "feature", "route"),
        Index("ix_ai_usage_events_document_id",   "document_id"),
    )
