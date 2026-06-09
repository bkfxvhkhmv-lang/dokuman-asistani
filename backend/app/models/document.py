from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Float, Integer, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database import Base
import enum


class DocumentStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


class RisikoLevel(str, enum.Enum):
    hoch    = "hoch"
    mittel  = "mittel"
    niedrig = "niedrig"


class JobType(str, enum.Enum):
    ocr      = "ocr"
    decision = "decision"
    summary  = "summary"
    pii      = "pii"
    embed    = "embed"


class JobStatus(str, enum.Enum):
    queued     = "queued"
    running    = "running"
    done       = "done"
    failed     = "failed"


class Document(Base):
    __tablename__ = "documents"

    id:         Mapped[str]                     = mapped_column(String, primary_key=True)
    user_id:    Mapped[str]                     = mapped_column(String, index=True)
    filename:   Mapped[str]                     = mapped_column(String)
    mime_type:  Mapped[str]                     = mapped_column(String, default="image/jpeg")
    storage_key: Mapped[str]                    = mapped_column(String)   # MinIO object key
    checksum:   Mapped[Optional[str]]           = mapped_column(String, nullable=True)
    version:    Mapped[int]                     = mapped_column(Integer, default=1)
    status:     Mapped[DocumentStatus]          = mapped_column(SAEnum(DocumentStatus), default=DocumentStatus.pending)
    created_at: Mapped[datetime]                = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime]                = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    text:   Mapped[Optional["DocumentText"]]   = relationship(back_populates="document", uselist=False)
    meta:   Mapped[Optional["DocumentMeta"]]   = relationship(back_populates="document", uselist=False)
    vector: Mapped[Optional["DocumentVector"]] = relationship(back_populates="document", uselist=False)
    jobs:   Mapped[list["Job"]]                = relationship(back_populates="document")


class DocumentText(Base):
    __tablename__ = "document_texts"

    doc_id:     Mapped[str]           = mapped_column(String, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    roh_text:   Mapped[str]           = mapped_column(Text, default="")
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lang:       Mapped[str]           = mapped_column(String, default="de")
    updated_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    document: Mapped["Document"] = relationship(back_populates="text")


class DocumentMeta(Base):
    __tablename__ = "document_meta"

    doc_id:          Mapped[str]                   = mapped_column(String, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    titel:           Mapped[Optional[str]]         = mapped_column(String, nullable=True)
    zusammenfassung: Mapped[Optional[str]]         = mapped_column(Text, nullable=True)
    kurzfassung:     Mapped[Optional[str]]         = mapped_column(Text, nullable=True)
    typ:             Mapped[Optional[str]]         = mapped_column(String, nullable=True)
    risiko:          Mapped[Optional[RisikoLevel]] = mapped_column(SAEnum(RisikoLevel), nullable=True)
    betrag:          Mapped[Optional[float]]       = mapped_column(Float, nullable=True)
    frist:           Mapped[Optional[str]]         = mapped_column(String, nullable=True)   # ISO date string
    iban:            Mapped[Optional[str]]         = mapped_column(String, nullable=True)
    warnung:         Mapped[Optional[str]]         = mapped_column(Text, nullable=True)
    aktionen:        Mapped[Optional[list]]        = mapped_column(JSON, nullable=True)     # ["zahlen", "einspruch", ...]
    updated_at:      Mapped[datetime]              = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    document: Mapped["Document"] = relationship(back_populates="meta")


class DocumentVector(Base):
    __tablename__ = "document_vectors"

    doc_id:    Mapped[str] = mapped_column(String, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
    embedding: Mapped[list] = mapped_column(Vector(1536))   # OpenAI text-embedding-3-small dim
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document: Mapped["Document"] = relationship(back_populates="vector")


class Job(Base):
    __tablename__ = "jobs"

    id:         Mapped[str]        = mapped_column(String, primary_key=True)
    doc_id:     Mapped[str]        = mapped_column(String, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    type:       Mapped[JobType]    = mapped_column(SAEnum(JobType))
    status:     Mapped[JobStatus]  = mapped_column(SAEnum(JobStatus), default=JobStatus.queued)
    error:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result:     Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    document: Mapped["Document"] = relationship(back_populates="jobs")
