-- Phase 3.1: Upload Quality Controls (Duplicate Detection)
-- Add pdf_hash for duplicate detection
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_hash text;
CREATE INDEX IF NOT EXISTS idx_documents_pdf_hash ON documents(pdf_hash) WHERE pdf_hash IS NOT NULL;

-- Add rejection_reason_code for structured rejections
-- Allowed values: duplicate, wrong_subject_module, unreadable, incomplete, outdated, copyright_unsafe, other
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason_code text;
