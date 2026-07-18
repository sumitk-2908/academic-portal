-- Tighten RLS and DB Permissions

-- Revoke potentially dangerous default privileges from anon
REVOKE ALL PRIVILEGES ON TABLE public.admin_audit_log FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.document_revisions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admins FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon;

-- Ensure authenticated users cannot abuse permissions
REVOKE ALL PRIVILEGES ON TABLE public.admins FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM authenticated;
-- Re-grant select so they can check their own roles (RLS will restrict it to their own row)
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- Explicitly allow anon to only SELECT approved data
GRANT SELECT ON TABLE public.documents TO anon;
GRANT SELECT ON TABLE public.subjects TO anon;
GRANT SELECT ON TABLE public.modules TO anon;

-- Update the uploader policy to check UUID as well, ensuring users only see their own unapproved docs
DROP POLICY IF EXISTS "Allow uploaders to view their own documents" ON public.documents;
CREATE POLICY "Allow uploaders to view their own documents" 
ON public.documents 
FOR SELECT 
USING (
  uploaded_by = auth.uid()
);
