"""
SQLAlchemy 2.0 ORM Models — Academic Portal
Requires: sqlalchemy >= 2.0, psycopg2-binary, Python >= 3.11
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index,
    Integer, SmallInteger, String, Text, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship
)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Mixins
# ---------------------------------------------------------------------------

class TimestampMixin:
    """Adds created_at / updated_at columns. The updated_at trigger is
    handled at the DB level (see schema.sql), so onupdate here is a
    Python-side fallback for non-trigger environments."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Core Models
# ---------------------------------------------------------------------------

class Degree(TimestampMixin, Base):
    """Represents a full degree programme (e.g., B.Tech CSE)."""
    __tablename__ = "degrees"

    id:        Mapped[int]  = mapped_column(Integer, primary_key=True)
    name:      Mapped[str]  = mapped_column(String(150), nullable=False)
    code:      Mapped[str]  = mapped_column(String(20), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    semesters: Mapped[List["Semester"]] = relationship(
        "Semester", back_populates="degree",
        cascade="all, delete-orphan", order_by="Semester.number"
    )

    def __repr__(self) -> str:
        return f"<Degree code={self.code!r}>"


class Semester(Base):
    """One semester within a degree (1–8)."""
    __tablename__ = "semesters"
    __table_args__ = (
        UniqueConstraint("degree_id", "number", name="uq_semester_degree_number"),
        CheckConstraint("number BETWEEN 1 AND 8", name="chk_semester_number"),
        Index("idx_semesters_degree_id", "degree_id"),
    )

    id:            Mapped[int]           = mapped_column(Integer, primary_key=True)
    degree_id:     Mapped[int]           = mapped_column(
        Integer, ForeignKey("degrees.id", ondelete="CASCADE"), nullable=False
    )
    number:        Mapped[int]           = mapped_column(SmallInteger, nullable=False)
    academic_year: Mapped[Optional[str]] = mapped_column(String(9))   # "2024-2025"
    is_active:     Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)
    created_at:    Mapped[datetime]      = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    degree:   Mapped["Degree"]         = relationship("Degree", back_populates="semesters")
    subjects: Mapped[List["Subject"]]  = relationship(
        "Subject", back_populates="semester",
        cascade="all, delete-orphan", order_by="Subject.code"
    )

    def __repr__(self) -> str:
        return f"<Semester degree_id={self.degree_id} number={self.number}>"


class Subject(TimestampMixin, Base):
    """A course within a semester (e.g., Programming for Problem Solving)."""
    __tablename__ = "subjects"
    __table_args__ = (
        Index("idx_subjects_semester_id", "semester_id"),
    )

    id:          Mapped[int]           = mapped_column(Integer, primary_key=True)
    semester_id: Mapped[int]           = mapped_column(
        Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False
    )
    name:        Mapped[str]           = mapped_column(String(200), nullable=False)
    code:        Mapped[str]           = mapped_column(String(20), nullable=False, unique=True)
    short_name:  Mapped[Optional[str]] = mapped_column(String(50))    # e.g., "PPS"
    credits:     Mapped[Optional[int]] = mapped_column(SmallInteger)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active:   Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    semester:       Mapped["Semester"]              = relationship("Semester", back_populates="subjects")
    modules:        Mapped[List["Module"]]          = relationship(
        "Module", back_populates="subject",
        cascade="all, delete-orphan", order_by="Module.number"
    )
    documents:      Mapped[List["Document"]]        = relationship(
        "Document", back_populates="subject", cascade="all, delete-orphan"
    )
    upload_requests: Mapped[List["UploadRequest"]] = relationship(
        "UploadRequest", back_populates="subject"
    )

    def __repr__(self) -> str:
        return f"<Subject code={self.code!r} name={self.name!r}>"


class Module(Base):
    """A unit/module within a subject (e.g., Module 3: Arrays & Strings)."""
    __tablename__ = "modules"
    __table_args__ = (
        UniqueConstraint("subject_id", "number", name="uq_module_subject_number"),
        Index("idx_modules_subject_id", "subject_id"),
    )

    id:          Mapped[int]           = mapped_column(Integer, primary_key=True)
    subject_id:  Mapped[int]           = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    number:      Mapped[int]           = mapped_column(SmallInteger, nullable=False)
    title:       Mapped[str]           = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at:  Mapped[datetime]      = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    subject:   Mapped["Subject"]       = relationship("Subject", back_populates="modules")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="module")

    def __repr__(self) -> str:
        return f"<Module subject_id={self.subject_id} number={self.number} title={self.title!r}>"


class MaterialType(Base):
    """Lookup table for document categories (PYQ, Tutorial, Syllabus…)."""
    __tablename__ = "material_types"

    id:            Mapped[int]           = mapped_column(Integer, primary_key=True)
    name:          Mapped[str]           = mapped_column(String(100), nullable=False, unique=True)
    slug:          Mapped[str]           = mapped_column(String(50), nullable=False, unique=True)
    icon:          Mapped[Optional[str]] = mapped_column(String(50))   # Lucide icon name
    display_order: Mapped[int]           = mapped_column(SmallInteger, default=0, nullable=False)

    # Relationships
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="material_type")

    def __repr__(self) -> str:
        return f"<MaterialType slug={self.slug!r}>"


class User(TimestampMixin, Base):
    """Portal users: students, moderators, and admins."""
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('student', 'moderator', 'admin')", name="chk_user_role"
        ),
    )

    id:               Mapped[int]               = mapped_column(Integer, primary_key=True)
    email:            Mapped[str]               = mapped_column(String(255), nullable=False, unique=True)
    name:             Mapped[str]               = mapped_column(String(200), nullable=False)
    password_hash:    Mapped[Optional[str]]     = mapped_column(String(255))  # None → OAuth
    role:             Mapped[str]               = mapped_column(String(20), default="student", nullable=False)
    degree_id:        Mapped[Optional[int]]     = mapped_column(
        Integer, ForeignKey("degrees.id", ondelete="SET NULL")
    )
    current_semester: Mapped[Optional[int]]     = mapped_column(SmallInteger)
    is_active:        Mapped[bool]              = mapped_column(Boolean, default=True, nullable=False)
    last_login_at:    Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships (disambiguated via foreign_keys)
    uploaded_documents: Mapped[List["Document"]] = relationship(
        "Document", foreign_keys="[Document.uploaded_by]", back_populates="uploader"
    )
    approved_documents: Mapped[List["Document"]] = relationship(
        "Document", foreign_keys="[Document.approved_by]", back_populates="approver"
    )
    reviewed_requests: Mapped[List["UploadRequest"]] = relationship(
        "UploadRequest", back_populates="reviewer"
    )

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_moderator(self) -> bool:
        return self.role in ("admin", "moderator")

    def __repr__(self) -> str:
        return f"<User email={self.email!r} role={self.role!r}>"


class Document(TimestampMixin, Base):
    """
    Core entity. Represents a PDF resource (PYQ, notes, tutorial sheet, etc.).
    The search_vector column is auto-populated by a DB trigger.
    """
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "upload_status IN ('pending', 'approved', 'rejected')",
            name="chk_document_status"
        ),
        Index("idx_docs_subject_type",  "subject_id", "material_type_id"),
        Index("idx_docs_module_id",     "module_id"),
        Index("idx_docs_status",        "upload_status"),
    )

    id:               Mapped[int]           = mapped_column(Integer, primary_key=True)
    subject_id:       Mapped[int]           = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    module_id:        Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("modules.id", ondelete="SET NULL")
    )
    material_type_id: Mapped[int]           = mapped_column(
        Integer, ForeignKey("material_types.id"), nullable=False
    )

    # File metadata
    title:           Mapped[str]           = mapped_column(String(300), nullable=False)
    description:     Mapped[Optional[str]] = mapped_column(Text)
    file_url:        Mapped[str]           = mapped_column(String(1000), nullable=False)
    file_key:        Mapped[Optional[str]] = mapped_column(String(500))   # S3/Supabase key
    file_name:       Mapped[str]           = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type:       Mapped[str]           = mapped_column(String(100), default="application/pdf", nullable=False)

    # PYQ-specific
    exam_year: Mapped[Optional[int]] = mapped_column(SmallInteger)          # e.g., 2024
    exam_type: Mapped[Optional[str]] = mapped_column(String(50))            # "Mid-Term" | "End-Term"

    # Workflow
    upload_status:    Mapped[str]           = mapped_column(String(20), default="approved", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    is_verified:      Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)

    # Analytics
    view_count:     Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Audit
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )

    # Full-text search (maintained by DB trigger fn_update_document_search_vector)
    search_vector = mapped_column(TSVECTOR)

    # Relationships
    subject:       Mapped["Subject"]         = relationship("Subject", back_populates="documents")
    module:        Mapped[Optional["Module"]] = relationship("Module", back_populates="documents")
    material_type: Mapped["MaterialType"]    = relationship("MaterialType", back_populates="documents")
    uploader:      Mapped[Optional["User"]]  = relationship(
        "User", foreign_keys=[uploaded_by], back_populates="uploaded_documents"
    )
    approver:      Mapped[Optional["User"]]  = relationship(
        "User", foreign_keys=[approved_by], back_populates="approved_documents"
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} title={self.title!r} status={self.upload_status!r}>"


class UploadRequest(Base):
    """
    Crowdsource submission. Students submit PDFs here; admins approve/reject.
    On approval, a Document row is created and document_id is set.
    """
    __tablename__ = "upload_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="chk_request_status"
        ),
        Index("idx_upload_requests_status", "status"),
        Index("idx_upload_requests_email",  "submitter_email"),
    )

    id:               Mapped[int]           = mapped_column(Integer, primary_key=True)
    subject_id:       Mapped[int]           = mapped_column(
        Integer, ForeignKey("subjects.id"), nullable=False
    )
    module_id:        Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("modules.id"))
    material_type_id: Mapped[int]           = mapped_column(
        Integer, ForeignKey("material_types.id"), nullable=False
    )

    title:       Mapped[str]           = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Temporary storage (file moved to permanent bucket on approval)
    temp_file_url: Mapped[Optional[str]] = mapped_column(String(1000))
    temp_file_key: Mapped[Optional[str]] = mapped_column(String(500))
    file_name:     Mapped[str]           = mapped_column(String(255), nullable=False)

    submitter_name:  Mapped[Optional[str]] = mapped_column(String(200))
    submitter_email: Mapped[str]           = mapped_column(String(255), nullable=False)

    # Workflow
    status:           Mapped[str]           = mapped_column(String(20), default="pending", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_by:      Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL")
    )
    document_id:  Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL")
    )

    created_at:  Mapped[datetime]           = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    subject:  Mapped["Subject"]       = relationship("Subject", back_populates="upload_requests")
    reviewer: Mapped[Optional["User"]] = relationship("User", back_populates="reviewed_requests")

    def __repr__(self) -> str:
        return f"<UploadRequest id={self.id} status={self.status!r}>"
