from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

# ── Enums mapping to our SQL schema ──
class DocCategory(str, enum.Enum):
    pyq = "pyq"
    tutorial_sheet = "tutorial_sheet"
    notes = "notes"
    syllabus = "syllabus"

class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# ── Database Models ──
class Degree(Base):
    __tablename__ = "degrees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    semesters = relationship("Semester", back_populates="degree")

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    degree_id = Column(Integer, ForeignKey("degrees.id", ondelete="CASCADE"))
    semester_number = Column(Integer, nullable=False)

    degree = relationship("Degree", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"))
    subject_code = Column(String(20), unique=True)
    name = Column(String(150), nullable=False)
    credits = Column(Integer)

    semester = relationship("Semester", back_populates="subjects")
    modules = relationship("Module", back_populates="subject")

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"))
    module_number = Column(Integer, nullable=False)
    title = Column(String(200))

    subject = relationship("Subject", back_populates="modules")
    documents = relationship("Document", back_populates="module")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    category = Column(Enum(DocCategory), nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(String(100), nullable=True)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.approved)
    created_at = Column(DateTime, server_default=func.now())

    module = relationship("Module", back_populates="documents")