-- Phase 3.2: Document Version and Resubmission History
CREATE TABLE IF NOT EXISTS document_revisions (
    id bigint primary key generated always as identity,
    document_id bigint references documents(id) on delete cascade not null,
    status text not null,
    rejection_reason_code text,
    rejection_reason text,
    moderated_by uuid references auth.users(id),
    created_at timestamptz default now() not null
);

ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own document revisions"
    ON document_revisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_revisions.document_id
            AND documents.uploaded_by = auth.uid()
        )
    );

CREATE POLICY "Admins can read all revisions"
    ON document_revisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE admins.user_id = auth.uid()
        )
    );
