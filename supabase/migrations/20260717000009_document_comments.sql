-- 20260717000009_document_comments.sql
-- Create document_comments table
CREATE TABLE public.document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id INTEGER NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    parent_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_by_admin BOOLEAN DEFAULT false,
    deleted_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by document (used heavily)
CREATE INDEX idx_document_comments_document_id ON public.document_comments(document_id);
CREATE INDEX idx_document_comments_parent_id ON public.document_comments(parent_id);
CREATE INDEX idx_document_comments_user_id ON public.document_comments(user_id);

-- Enable RLS
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_comments
-- Anyone can read comments
CREATE POLICY "Anyone can read comments" 
ON public.document_comments FOR SELECT 
USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert comments" 
ON public.document_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own non-deleted comments
CREATE POLICY "Users can update own comments" 
ON public.document_comments FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND is_deleted = false AND deleted_by_admin = false);

-- Admins can update any comment (e.g., to pin or delete with reason)
CREATE POLICY "Admins can update any comment" 
ON public.document_comments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Users can delete their own comments (hard delete is allowed, or they can soft delete via UPDATE. We will rely on soft delete via UPDATE mostly, but if they hit actual DELETE, we let them).
CREATE POLICY "Users can delete own comments" 
ON public.document_comments FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" 
ON public.document_comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Trigger to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_comments_modtime
BEFORE UPDATE ON public.document_comments
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create comment_flags table
CREATE TABLE public.comment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.document_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason public.flag_reason NOT NULL,
    description TEXT,
    status public.flag_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Prevent a user from flagging the same comment multiple times
    UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_flags_comment_id ON public.comment_flags(comment_id);
CREATE INDEX idx_comment_flags_status ON public.comment_flags(status);

-- Enable RLS
ALTER TABLE public.comment_flags ENABLE ROW LEVEL SECURITY;

-- Users can insert flags
CREATE POLICY "Authenticated users can insert comment flags"
ON public.comment_flags FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can read/update flags
CREATE POLICY "Admins can read comment flags"
ON public.comment_flags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update comment flags"
ON public.comment_flags FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);
