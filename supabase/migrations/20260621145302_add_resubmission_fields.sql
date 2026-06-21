-- 1. Add fields to track rejection and resubmission lifecycles
ALTER TABLE public.documents 
ADD COLUMN rejection_reason text,
ADD COLUMN updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN resubmission_count integer DEFAULT 0;

-- 2. Update the document_analytics table to ensure we don't lose stats if we want to track versions later 
-- (Optional but recommended for preserving history)