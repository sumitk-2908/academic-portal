import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { Database } from "./database.types";

// 1. Initialize Supabase Auth
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. The Interceptor: Automatically attach the token to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// --- FETCH DOCUMENTS ---

export const getDocumentsByModule = async (moduleId: number) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch by Module Error:", error);
    return [];
  }
  return data || [];
};

export const searchDocuments = async (query: string) => {
  let dbQuery = supabase.from('documents').select('*').order('created_at', { ascending: false });

  if (query && query.trim() !== "") {
    dbQuery = dbQuery.ilike('title', `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Search Error:", error);
    return [];
  }
  return data || [];
};

// --- UPLOAD & DELETE (Routed through FastAPI) ---

export const uploadDocument = async (formData: FormData) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SERVER REJECTED UPLOAD:", errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("UPLOAD CRASH:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId: number) => {
  try {
    const response = await api.delete(`/api/v1/documents/${documentId}`);
    return response.data;
  } catch (error: any) {
    console.error("FastAPI Delete Error:", error.response?.data || error);
    throw new Error(error.response?.data?.detail || "Failed to delete document via FastAPI.");
  }
};

// --- SUBJECTS & MODULES ---

// RESTORED: These interfaces were accidentally stripped in the previous response
export interface Subject {
  id: number;
  name: string;
  slug: string;
  is_non_module: boolean;
}

export interface Module {
  id: number;
  subject_id: number;
  module_number: number;
  name: string;
}

export const getSubjects = async () => {
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data as Subject[];
};

export const getModulesBySubject = async (subjectId: number) => {
  const { data, error } = await supabase.from('modules').select('*').eq('subject_id', subjectId).order('module_number');
  if (error) throw error;
  return data as Module[];
};

// ==========================================
// --- CLOUD SYNC: HYBRID BOOKMARKS ---
// ==========================================

export const getStudentBookmarks = async (userId?: string) => {
  let cloudBookmarks: any[] = [];

  if (userId) {
    const { data, error } = await supabase
      .from('student_bookmarks')
      // 1. Fetch the bookmark creation timestamp along with the document
      .select('created_at, documents(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      cloudBookmarks = data.map((b: any) => {
        if (!b.documents) return null;
        return {
          ...b.documents,
          // 2. Inject the join table timestamp into the document object
          bookmarked_at: b.created_at 
        };
      }).filter((d: any) => d !== null);
    }
  }
  
  try {
    const stored = localStorage.getItem("portal_bookmarks");
    const localIds = stored ? JSON.parse(stored) : [];
    
    if (!Array.isArray(localIds) || localIds.length === 0) return cloudBookmarks;
    
    const { data, error } = await supabase.from('documents').select('*').in('id', localIds).eq('status', 'approved');
    const localBookmarks = (!error && Array.isArray(data)) ? data : [];

    const allBookmarks = [...cloudBookmarks];
    for (const lb of localBookmarks) {
      if (!allBookmarks.find(b => b.id === lb.id)) {
        // 3. For guest users using local storage, assign today's date 
        // so new bookmarks float to the top of the timeline
        allBookmarks.push({
          ...lb, 
          bookmarked_at: new Date().toISOString()
        });
      }
    }
    
    return allBookmarks;

  } catch (error) {
    console.warn("Resetting corrupted bookmarks local storage");
    return cloudBookmarks;
  }
};
// ==========================================
// --- CLOUD SYNC: HYBRID STUDY HISTORY ---
// ==========================================

export const getRecentStudyActivity = async (userId?: string) => {
  let cloudHistory: any[] = [];

  if (userId) {
    const { data, error } = await supabase
      .from('study_history')
      .select('documents(*)')
      .eq('user_id', userId)
      .order('accessed_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      cloudHistory = data.map((h: any) => h.documents).filter(d => d !== null);
    }
  }
  
  try {
    const stored = localStorage.getItem("portal_study_history");
    const parsed = stored ? JSON.parse(stored) : [];
    const localHistory = Array.isArray(parsed) ? parsed : [];
    
    if (cloudHistory.length === 0) return localHistory;

    const combined = [...cloudHistory];
    for (const lh of localHistory) {
       if (!combined.find(h => h.id === lh.id)) {
         combined.push(lh);
       }
    }
    
    return combined.slice(0, 5); 

  } catch (error) {
    console.warn("Resetting corrupted history local storage");
    return cloudHistory;
  }
};

export const getFullStudyHistory = async (userId?: string) => {
  let cloudHistory: any[] = [];

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (userId) {
    const { data, error } = await supabase
      .from('study_history')
      .select('accessed_at, documents(*)')
      .eq('user_id', userId)
      .gte('accessed_at', ninetyDaysAgo.toISOString()) 
      .order('accessed_at', { ascending: false });

    if (!error && data) {
      cloudHistory = data.map((h: any) => {
        if (!h.documents) return null;
        return {
          ...h.documents,
          accessed_at: h.accessed_at 
        };
      }).filter((d: any) => d !== null);
    }
  }
  
  try {
    const stored = localStorage.getItem("portal_study_history");
    const parsed = stored ? JSON.parse(stored) : [];
    const localHistory = Array.isArray(parsed) ? parsed : [];
    
    if (cloudHistory.length === 0) return localHistory;

    const combined = [...cloudHistory];
    for (const lh of localHistory) {
       if (!combined.find(h => h.id === lh.id)) {
         combined.push(lh);
       }
    }
    return combined;
  } catch (error) {
    console.warn("Resetting corrupted history local storage");
    return cloudHistory;
  }
};

// --- ANALYTICS TRACKING ---

export const trackDocumentStat = async (docId: number, type: 'view' | 'download') => {
  try {
    await supabase.rpc('increment_doc_stat', { doc_id: docId, stat_type: type });
  } catch (error) {
    console.error("Failed to track analytics:", error);
  }
};

export const getTrendingDocuments = async () => {
  try {
    // BUG 3 FIX: Two-Step fetch. Bypasses Supabase foreign-key relation ambiguity bugs.
    const { data: analytics, error } = await supabase
      .from('document_analytics')
      .select('*')
      .not('view_count', 'is', null)
      .order('view_count', { ascending: false })
      .limit(10); 

    if (error || !analytics || analytics.length === 0) return [];

    const docIds = analytics.map(a => a.document_id);
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .in('id', docIds)
      .eq('status', 'approved');

    if (!docs) return [];

    // Manually zip the arrays together
    return analytics
      .map(stat => {
        const doc = docs.find(d => d.id === stat.document_id);
        if (!doc) return null;
        return { ...doc, view_count: stat.view_count || 0 };
      })
      .filter(d => d !== null)
      .slice(0, 5); 
  } catch (error) {
    console.error("Failed to fetch global trending:", error);
    return [];
  }
};

// --- CROWDSOURCING / APPROVALS ---

export const updateDocumentStatus = async (id: number, status: 'approved' | 'rejected') => {
  try {
    const response = await api.patch(`/api/v1/documents/${id}/status`, { status });
    return response.data;
  } catch (error: any) {
    console.error("FastAPI Status Update Error:", error.response?.data || error);
    throw new Error(error.response?.data?.detail || "Failed to update document status.");
  }
};

// ==========================================
// --- PHASE 3: STUDENT IDENTITY & STREAKS ---
// ==========================================

export const getStudyStreak = async (userId: string) => {
  const { data, error } = await supabase
    .from('study_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); 

  if (error) {
    console.error("Fetch Streak Error:", error);
    return null;
  }
  return data;
};

export const getAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error("Fetch Achievements Error:", error);
    return [];
  }
  return data || [];
};

export const getEnhancedContributions = async (userId: string) => {
  // BUG 2 FIX: Two-step fetch bypassing Supabase Join failures
  try {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!docs || docs.length === 0) return [];

    const docIds = docs.map(d => d.id);
    const { data: analytics } = await supabase
      .from('document_analytics')
      .select('*')
      .in('document_id', docIds);

    return docs.map(doc => {
      const stat = analytics?.find(a => a.document_id === doc.id);
      return {
        ...doc,
        document_analytics: stat || { view_count: 0, download_count: 0 }
      };
    });
  } catch (error) {
    console.error("Fetch Contributions Error:", error);
    return [];
  }
};

export const triggerStreakUpdate = async (userId: string) => {
  try {
    const { error } = await supabase.rpc('update_study_streak', { p_user_id: userId });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to update streak:", error);
  }
};

// ==========================================
// --- PHASE 3.5: PERSONALIZATION ---
// ==========================================

export const getProfilePreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error("Fetch Profile Error:", error);
    return null;
  }
  return data;
};

export const updateProfilePreferences = async (
  userId: string, 
  preferences: { favorite_subjects: string[], preferred_branch: string }
) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...preferences
    });

  if (error) {
    console.error("Update Profile Error:", error);
    throw error;
  }
};

export const logStudySession = async (userId: string, documentId: number) => {
  try {
    const { error } = await supabase.from('study_history').upsert({
      user_id: userId,
      document_id: documentId,
      accessed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, document_id' // CRITICAL: Tells Supabase how to handle the duplicate
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to log study session:", error);
  }
};