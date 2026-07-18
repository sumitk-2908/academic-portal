import { supabase } from './core';
import type { DocumentRecord } from '../document-types';

const trackedStats = new Set<string>();

export const trackDocumentStat = async (docId: number, type: 'view' | 'download') => {
  const key = `${docId}-${type}`;
  if (trackedStats.has(key)) return;
  trackedStats.add(key);

  try {
    await supabase.rpc('increment_doc_stat', { doc_id: docId, stat_type: type });
  } catch (error) {
    console.error("Analytics Error:", error);
    trackedStats.delete(key); // Allow retry on failure
  }
};

export const getUserUpvotes = async (userId: string) => {
  const { data, error } = await supabase
    .from('document_ratings')
    .select('document_id')
    .eq('user_id', userId)
    .eq('is_useful', true);
    
  if (error) {
    console.error("Error fetching upvotes:", error);
    return [];
  }
  return data.map(r => r.document_id).filter((id): id is number => id !== null);
};

export const toggleUpvote = async (docId: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  const user_id = user?.id;
  if (!user_id) return false;

  const { data, error } = await supabase.rpc('toggle_upvote', { 
    p_document_id: docId, 
    p_user_id: user_id 
  });
  
  if (error) {
    console.error("Toggle upvote error:", error);
    throw new Error(`Supabase Error: ${error.message} (Code: ${error.code})`);
  }
  return data;
};

export const getTrendingDocuments = async () => {
 try {
    // 1. Try to get time-scoped weekly trending documents
    const { data: weeklyTrending, error: weeklyError } = await supabase
      .from('weekly_trending_documents')
      .select('*')
      .order('weekly_views', { ascending: false })
      .limit(10); 

    if (!weeklyError && weeklyTrending && weeklyTrending.length > 0) {
      return weeklyTrending.map(doc => ({
        ...doc,
        // Map all_time_view_count back to view_count for standard frontend rendering
        view_count: doc.all_time_view_count || doc.weekly_views || 0 
      })).slice(0, 5);
    }

    // 2. Fallback to all-time trending if no weekly data exists (e.g. new instance)
    const { data: analytics, error } = await supabase
      .from('document_analytics')
      .select('view_count, documents!inner(*)')
      .not('view_count', 'is', null)
      .eq('documents.status', 'approved')
      .order('view_count', { ascending: false })
      .limit(10); 

    if (error || !analytics || analytics.length === 0) return [];

    return analytics
      .map((stat: { documents: any, view_count: number }) => ({ 
        ...(Array.isArray(stat.documents) ? stat.documents[0] : stat.documents), 
        view_count: stat.view_count || 0 
      }))
      .slice(0, 5); 
  } catch (error) {
    console.error("Failed to fetch global trending:", error);
    return [];
  }
};
