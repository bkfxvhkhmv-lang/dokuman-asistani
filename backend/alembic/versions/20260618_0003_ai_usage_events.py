"""add ai_usage_events table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column("id",                          sa.String(),          primary_key=True),
        sa.Column("created_at",                  sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("feature",                     sa.String(),          nullable=False),
        sa.Column("route",                       sa.String(),          nullable=False),
        sa.Column("provider",                    sa.String(),          nullable=False),
        sa.Column("model",                       sa.String(),          nullable=True),
        sa.Column("document_id",                 sa.String(),          nullable=True),
        sa.Column("user_id",                     sa.String(),          nullable=True),
        sa.Column("input_tokens",                sa.Integer(),         nullable=True),
        sa.Column("output_tokens",               sa.Integer(),         nullable=True),
        sa.Column("total_tokens",                sa.Integer(),         nullable=True),
        sa.Column("cache_creation_input_tokens", sa.Integer(),         nullable=True),
        sa.Column("cache_read_input_tokens",     sa.Integer(),         nullable=True),
        sa.Column("estimated_cost_usd",          sa.Numeric(18, 8),    nullable=True),
        sa.Column("latency_ms",                  sa.Numeric(10, 2),    nullable=True),
        sa.Column("success",                     sa.Boolean(),         nullable=False, server_default=sa.text("true")),
        sa.Column("error_type",                  sa.String(),          nullable=True),
    )
    op.create_index("ix_ai_usage_events_created_at",    "ai_usage_events", ["created_at"])
    op.create_index("ix_ai_usage_events_feature_route", "ai_usage_events", ["feature", "route"])
    op.create_index("ix_ai_usage_events_document_id",   "ai_usage_events", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_usage_events_document_id",   "ai_usage_events")
    op.drop_index("ix_ai_usage_events_feature_route", "ai_usage_events")
    op.drop_index("ix_ai_usage_events_created_at",    "ai_usage_events")
    op.drop_table("ai_usage_events")
