"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-29 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── pgvector extension ────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",         sa.String(), primary_key=True),
        sa.Column("email",      sa.String(), nullable=False),
        sa.Column("hashed_pw",  sa.String(), nullable=False),
        sa.Column("is_active",  sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── documents ─────────────────────────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("id",          sa.String(), primary_key=True),
        sa.Column("user_id",     sa.String(), nullable=False),
        sa.Column("filename",    sa.String(), nullable=False),
        sa.Column("mime_type",   sa.String(), nullable=False, server_default="image/jpeg"),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("checksum",    sa.String(), nullable=True),
        sa.Column("version",     sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status",      sa.Enum("pending", "processing", "completed", "failed",
                                         name="documentstatus"), nullable=False, server_default="pending"),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",  sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_documents_user_id",   "documents", ["user_id"])
    op.create_index("ix_documents_updated_at", "documents", ["updated_at"])

    # ── document_texts ────────────────────────────────────────────────────────
    op.create_table(
        "document_texts",
        sa.Column("doc_id",     sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("roh_text",   sa.Text(),   nullable=False, server_default=""),
        sa.Column("confidence", sa.Float(),  nullable=True),
        sa.Column("lang",       sa.String(), nullable=False, server_default="de"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # Full-text search index on roh_text (German dictionary)
    op.execute("""
        CREATE INDEX ix_document_texts_fts
        ON document_texts
        USING gin(to_tsvector('german', roh_text))
    """)

    # ── document_meta ─────────────────────────────────────────────────────────
    op.create_table(
        "document_meta",
        sa.Column("doc_id",          sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("titel",           sa.String(), nullable=True),
        sa.Column("zusammenfassung", sa.Text(),   nullable=True),
        sa.Column("kurzfassung",     sa.Text(),   nullable=True),
        sa.Column("typ",             sa.String(), nullable=True),
        sa.Column("risiko",          sa.Enum("hoch", "mittel", "niedrig", name="risikolevel"), nullable=True),
        sa.Column("betrag",          sa.Float(),  nullable=True),
        sa.Column("frist",           sa.String(), nullable=True),
        sa.Column("iban",            sa.String(), nullable=True),
        sa.Column("warnung",         sa.Text(),   nullable=True),
        sa.Column("aktionen",        sa.JSON(),   nullable=True),
        sa.Column("updated_at",      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── document_vectors ──────────────────────────────────────────────────────
    op.create_table(
        "document_vectors",
        sa.Column("doc_id",     sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("embedding",  sa.Text(),   nullable=False),   # stored as text; cast to vector on query
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # HNSW index for fast approximate nearest-neighbour search
    op.execute("""
        ALTER TABLE document_vectors
        ALTER COLUMN embedding TYPE vector(1536)
        USING embedding::vector(1536)
    """)
    op.execute("""
        CREATE INDEX ix_document_vectors_hnsw
        ON document_vectors
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # ── jobs ──────────────────────────────────────────────────────────────────
    op.create_table(
        "jobs",
        sa.Column("id",         sa.String(), primary_key=True),
        sa.Column("doc_id",     sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type",       sa.Enum("ocr", "decision", "summary", "pii", "embed", name="jobtype"), nullable=False),
        sa.Column("status",     sa.Enum("queued", "running", "done", "failed", name="jobstatus"), nullable=False, server_default="queued"),
        sa.Column("error",      sa.Text(),   nullable=True),
        sa.Column("result",     sa.JSON(),   nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_doc_id", "jobs", ["doc_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_index("ix_document_vectors_hnsw", "document_vectors")
    op.drop_table("document_vectors")
    op.drop_table("document_meta")
    op.drop_index("ix_document_texts_fts", "document_texts")
    op.drop_table("document_texts")
    op.drop_index("ix_documents_updated_at", "documents")
    op.drop_index("ix_documents_user_id", "documents")
    op.drop_table("documents")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS risikolevel")
    op.execute("DROP TYPE IF EXISTS jobtype")
    op.execute("DROP TYPE IF EXISTS jobstatus")
