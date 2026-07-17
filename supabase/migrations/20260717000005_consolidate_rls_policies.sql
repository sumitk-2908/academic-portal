-- Consolidate duplicate RLS policies for documents
DROP POLICY IF EXISTS "Anyone can view approved documents" ON public.documents;
DROP POLICY IF EXISTS "Public Read Approved" ON public.documents;
-- Keep "Allow public read access for approved documents"

-- Consolidate duplicate RLS policies for document_analytics
DROP POLICY IF EXISTS "Anyone can read analytics" ON public.document_analytics;
-- Keep "Allow public read access to analytics"

-- Consolidate duplicate RLS policies for user_roles
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
-- Keep "Users can read own role"
