"""document_shares for public link tokens

Revision ID: 0002
Revises: 0001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_shares",
        sa.Column("token", sa.String(length=96), primary_key=True),
        sa.Column("doc_id", sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_document_shares_doc_id", "document_shares", ["doc_id"])
    op.create_index("ix_document_shares_user_id", "document_shares", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_document_shares_user_id", "document_shares")
    op.drop_index("ix_document_shares_doc_id", "document_shares")
    op.drop_table("document_shares")
