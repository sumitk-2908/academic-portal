import { supabase } from './core';
import type { DocumentRecord, StoredBookmark } from '../document-types';

export const getStudentBookmarks = async (userId?: string) => {
  let cloudBookmarks: (DocumentRecord & { bookmarked_at: string })[] = [];

  if (userId) {
    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from('student_bookmarks')
      .select('created_at, documents!inner(*)') 
      .eq('user_id', userId)
      .eq('documents.status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!bookmarkError && bookmarkData && bookmarkData.length > 0) {
      cloudBookmarks = bookmarkData.map((b: { documents: DocumentRecord | DocumentRecord[], created_at: string | null }) => ({
        ...(Array.isArray(b.documents) ? b.documents[0] : b.documents),
        bookmarked_at: b.created_at || new Date().toISOString()
      }));
    }
  }
  
  try {
    const stored = localStorage.getItem("portal_bookmarks");
    const parsed = stored ? JSON.parse(stored) : [];
    
    const localIds = parsed.map((b: StoredBookmark) => typeof b === 'object' ? b.id : b);
    
    if (!Array.isArray(localIds) || localIds.length === 0) return cloudBookmarks;
    
    const { data, error } = await supabase.from('documents').select('*').in('id', localIds).eq('status', 'approved');
    const localBookmarks = (!error && Array.isArray(data)) ? data : [];

    const allBookmarks = [...cloudBookmarks];
    for (const lb of localBookmarks) {
      if (!allBookmarks.find(b => b.id === lb.id)) {
        
        const localItem = parsed.find((p: StoredBookmark) => (typeof p === 'object' ? p.id : p) === lb.id);
        const actualDate = (localItem && typeof localItem === 'object' && localItem.bookmarked_at) 
                            ? localItem.bookmarked_at 
                            : lb.created_at; 
                            
        allBookmarks.push({
          ...lb, 
          bookmarked_at: actualDate
        });
      }
    }
    
    return allBookmarks;

  } catch (error) {
    console.warn("Resetting corrupted bookmarks local storage");
    return cloudBookmarks;
  }
};

export const toggleBookmarkAPI = async (userId: string, documentId: number, isAdding: boolean) => {
  if (isAdding) {
    const { error } = await supabase.from('student_bookmarks').insert({ user_id: userId, document_id: documentId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('student_bookmarks').delete().match({ user_id: userId, document_id: documentId });
    if (error) throw error;
  }
};
