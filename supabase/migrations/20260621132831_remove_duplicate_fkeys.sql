BEGIN;

-- Remove redundant constraint on document_analytics
ALTER TABLE public.document_analytics 
DROP CONSTRAINT IF EXISTS fk_analytics_doc;

-- Remove redundant constraint on student_bookmarks
ALTER TABLE public.student_bookmarks 
DROP CONSTRAINT IF EXISTS fk_bookmark_doc;

COMMIT;