-- Drop view that depends on uploaded_by so we can alter its type
DROP VIEW IF EXISTS public.weekly_trending_documents;

-- Drop the RLS policy that references uploaded_by as text
DROP POLICY IF EXISTS "Allow uploaders to view their own documents" ON public.documents;

-- First, drop the NOT NULL constraint and DEFAULT value so we can set invalid entries to NULL
ALTER TABLE public.documents
ALTER COLUMN uploaded_by DROP DEFAULT,
ALTER COLUMN uploaded_by DROP NOT NULL;

-- Set any non-uuid strings to NULL safely.
UPDATE public.documents
SET uploaded_by = NULL
WHERE uploaded_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Now alter the column
ALTER TABLE public.documents
ALTER COLUMN uploaded_by TYPE uuid USING uploaded_by::uuid;

-- Add the foreign key with ON DELETE SET NULL to prevent orphaned records or crashes
ALTER TABLE public.documents
ADD CONSTRAINT fk_documents_uploaded_by
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Recreate the RLS policy using proper uuid comparison (no more text cast)
CREATE POLICY "Allow uploaders to view their own documents" ON public.documents
FOR SELECT USING (uploaded_by = auth.uid());

-- Recreate the view exactly as it was
CREATE OR REPLACE VIEW public.weekly_trending_documents AS
SELECT 
  d.id,
  d.title,
  d.category,
  d.file_url,
  d.uploaded_by,
  d.created_at,
  d.module_id,
  d.subject,
  d.status,
  d.file_size,
  d.page_count,
  d.thumbnail_url,
  d.uploader_name,
  d.fts,
  d.moderated_by,
  d.rejection_reason,
  d.updated_at,
  d.resubmission_count,
  COALESCE(SUM(dds.view_count), 0)::bigint AS weekly_views,
  da.view_count AS all_time_view_count,
  da.upvotes,
  da.downvotes
FROM documents d
JOIN document_daily_stats dds ON dds.document_id = d.id
LEFT JOIN document_analytics da ON da.document_id = d.id
WHERE d.status = 'approved' 
  AND dds.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
  d.id, d.title, d.category, d.file_url, d.uploaded_by, d.created_at, 
  d.module_id, d.subject, d.status, d.file_size, d.page_count, 
  d.thumbnail_url, d.uploader_name, d.fts, d.moderated_by, 
  d.rejection_reason, d.updated_at, d.resubmission_count,
  da.view_count, da.upvotes, da.downvotes;

GRANT SELECT ON public.weekly_trending_documents TO anon, authenticated, service_role;
