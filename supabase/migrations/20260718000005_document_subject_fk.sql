-- Add subject_id FK column alongside existing subject text field
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS subject_id bigint REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Backfill: join on name
UPDATE public.documents d 
SET subject_id = s.id 
FROM public.subjects s 
WHERE LOWER(d.subject) = LOWER(s.name);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_documents_subject_id ON public.documents(subject_id);
