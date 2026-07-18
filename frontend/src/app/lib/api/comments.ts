import { supabase } from './core';

export const getComments = async (documentId: number) => {
  const { data, error } = await supabase
    .from('document_comments')
    .select(`
      *,
      profiles:user_id(full_name, avatar_url)
    `)
    .eq('document_id', documentId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Fetch Comments Error:", error);
    return [];
  }
  return data || [];
};

export const postComment = async (documentId: number, content: string, parentId?: string) => {
  if (content.length > 1000) {
    throw new Error("Comment exceeds 1000 character limit.");
  }

  const { data: sess } = await supabase.auth.getSession();
  if (!sess?.session?.user?.id) throw new Error("Must be logged in to comment.");

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', sess.session.user.id)
    .single();

  if (!profile || !profile.full_name) {
    throw new Error("PROFILE_NAME_REQUIRED");
  }

  const payload: any = {
    document_id: documentId,
    user_id: sess.session.user.id,
    content
  };

  if (parentId) {
    payload.parent_id = parentId;
  }

  const { data, error } = await supabase
    .from('document_comments')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateComment = async (commentId: string, content: string) => {
  if (content.length > 1000) {
    throw new Error("Comment exceeds 1000 character limit.");
  }
  
  const { error } = await supabase
    .from('document_comments')
    .update({ content })
    .eq('id', commentId);

  if (error) throw error;
};

export const deleteComment = async (commentId: string) => {
  const { error } = await supabase
    .from('document_comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) throw error;
};

export const adminDeleteComment = async (commentId: string, reason: string) => {
  const { error } = await supabase
    .from('document_comments')
    .update({ deleted_by_admin: true, deleted_reason: reason })
    .eq('id', commentId);

  if (error) throw error;
};

export const adminPinComment = async (commentId: string, pin: boolean) => {
  const { error } = await supabase
    .from('document_comments')
    .update({ is_pinned: pin })
    .eq('id', commentId);

  if (error) throw error;
};

export const flagComment = async (commentId: string, reason: "incorrect" | "duplicate" | "low_quality" | "other", description?: string) => {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess?.session?.user?.id) throw new Error("Must be logged in to flag a comment.");

  const { error } = await supabase
    .from('comment_flags')
    .insert({
      comment_id: commentId,
      user_id: sess.session.user.id,
      reason,
      description
    });

  if (error) {
    if (error.code === '23505') throw new Error("You have already flagged this comment.");
    throw error;
  }
};

export const searchUsersForMention = async (query: string): Promise<{id: string, full_name: string}[]> => {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `${query}%`)
    .limit(5);

  if (error) {
    console.error("Mention search error:", error);
    return [];
  }
  
  return (data || []).filter(u => u.full_name !== null) as {id: string, full_name: string}[];
};
