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
    // Grab the auth token directly to ensure the backend accepts it
    const { data: { session } } = await supabase.auth.getSession();
    
    // Use native fetch to bypass the Axios JSON header completely
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
        // CRITICAL: Do NOT set Content-Type here. Fetch automatically sets 
        // the multipart/form-data boundary when it sees FormData.
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
    // 🔥 ROUTED TO RENDER BACKEND: Ensures both the PDF AND the thumbnail are deleted from Cloud Storage
    const response = await api.delete(`/api/v1/documents/${documentId}`);
    return response.data;
  } catch (error: any) {
    console.error("FastAPI Delete Error:", error.response?.data || error);
    throw new Error(error.response?.data?.detail || "Failed to delete document via FastAPI.");
  }
};

// --- SUBJECTS & MODULES ---

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
      .select('documents(*)')
      .eq('user_id', userId);
      
    if (!error && data) {
      cloudBookmarks = data.map((b: any) => b.documents).filter(d => d !== null);
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
        allBookmarks.push(lb);
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

  // Calculate the date 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (userId) {
    const { data, error } = await supabase
      .from('study_history')
      .select('accessed_at, documents(*)')
      .eq('user_id', userId)
      .gte('accessed_at', ninetyDaysAgo.toISOString()) // Only last 90 days
      .order('accessed_at', { ascending: false });

    if (!error && data) {
      // Inject the actual interaction timestamp into the document object
      // so the ActivityHeatmap maps it to the correct day
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
    return combined; // Return all 90 days without slicing
  } catch (error) {
    console.warn("Resetting corrupted history local storage");
    return cloudHistory;
  }
};

// --- ANALYTICS TRACKING ---

export const trackDocumentStat = async (docId: number, type: 'view' | 'download') => {
  try {
    const { error } = await supabase.rpc('increment_doc_stat', {
      doc_id: docId,
      stat_type: type
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to track analytics:", error);
  }
};

export const getTrendingDocuments = async () => {
  try {
    const { data, error } = await supabase
      .from('document_analytics')
      .select(`
        view_count,
        documents!document_analytics_document_id_fkey(id, title, category, file_url, uploaded_by, created_at, module_id, subject, status)
      `)
      .order('view_count', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data
      .filter((d: any) => d.documents !== null && d.documents.status === 'approved')
      .map((d: any) => ({
        ...d.documents,
        view_count: d.view_count
      }));
      
  } catch (error: any) {
    console.error("Failed to fetch global trending:", JSON.stringify(error, null, 2));
    return [];
  }
};

// --- CROWDSOURCING / APPROVALS ---

export const updateDocumentStatus = async (id: number, status: 'approved' | 'rejected') => {
  try {
    // 🔥 ROUTED TO RENDER BACKEND: Bypasses RLS issues by using the secure backend endpoint
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
    .maybeSingle(); // <--- CHANGED FROM .single() TO .maybeSingle()

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
  // Fetch uploads AND join with analytics to get view/download counts
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_analytics!document_analytics_document_id_fkey ( view_count, download_count )
    `)
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch Contributions Error:", error);
    return [];
  }
  return (data || []).map(doc => ({
    ...doc,
    document_analytics: Array.isArray(doc.document_analytics) 
      ? doc.document_analytics[0] 
      : doc.document_analytics
  }));
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
    // Inserts a new timestamped row for the Heatmap & Timeline
    const { error } = await supabase.from('study_history').insert({
      user_id: userId,
      document_id: documentId,
      accessed_at: new Date().toISOString()
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to log study session:", error);
  }
};