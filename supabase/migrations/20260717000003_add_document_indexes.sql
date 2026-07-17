-- Migration to add indexes for frequently queried columns on documents
CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject);
CREATE INDEX IF NOT EXISTS idx_documents_module_id ON documents(module_id);
