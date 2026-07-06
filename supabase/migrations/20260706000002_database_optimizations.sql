-- 20260706000002_database_optimizations.sql
-- Drop unused tables identified in maturity audit
DROP TABLE IF EXISTS student_history;
DROP TABLE IF EXISTS documents_title_backup;

-- Create indexes for performance on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_documents_status_subject_created_at 
    ON documents(status, subject, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_flags_status_document_id 
    ON document_flags(status, document_id);

CREATE INDEX IF NOT EXISTS idx_study_history_user_id_accessed_at 
    ON study_history(user_id, accessed_at DESC);
