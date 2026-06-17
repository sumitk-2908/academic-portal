import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

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
    const response = await api.post('/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error("FastAPI Upload Error:", error.response?.data || error);
    throw new Error(error.response?.data?.detail || "Failed to upload document via FastAPI.");
  }
};

export const deleteDocument = async (documentId: number) => {
  try {
    // Calling the FastAPI delete route ensures both the cloud file AND the DB record are safely deleted
    const response = await api.delete(`/documents/${documentId}`);
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
  
  // FIX: Safely parse LocalStorage and MERGE with Cloud Data instead of skipping it
  try {
    const stored = localStorage.getItem("portal_bookmarks");
    const localIds = stored ? JSON.parse(stored) : [];
    
    if (!Array.isArray(localIds) || localIds.length === 0) return cloudBookmarks;
    
    const { data, error } = await supabase.from('documents').select('*').in('id', localIds).eq('status', 'approved');
    const localBookmarks = (!error && Array.isArray(data)) ? data : [];

    // Merge cloud and local arrays, preventing duplicate documents
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
  
  // FIX: Safely parse LocalStorage and MERGE with Cloud Data
  try {
    const stored = localStorage.getItem("portal_study_history");
    const parsed = stored ? JSON.parse(stored) : [];
    const localHistory = Array.isArray(parsed) ? parsed : [];
    
    if (cloudHistory.length === 0) return localHistory;

    // Merge keeping unique documents (max 5)
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

export const logRecentStudyActivity = async (doc: any) => {
  // Step 1: Safely parse and validate local storage history
  let history: any[] = [];
  try {
    const stored = localStorage.getItem("portal_study_history");
    const parsed = stored ? JSON.parse(stored) : [];
    // If it's a valid array, use it. Otherwise, fallback to empty array.
    if (Array.isArray(parsed)) {
      history = parsed;
    }
  } catch (e) {
    console.warn("Reset corrupted local storage history");
  }

  history = history.filter((d: any) => d.id !== doc.id); // Remove duplicates
  history.unshift(doc); // Add to front
  history = history.slice(0, 5); // Keep top 5
  localStorage.setItem("portal_study_history", JSON.stringify(history));

  // Fire event to update Sidebar instantly
  window.dispatchEvent(new Event("sidebar_update"));

  // Step 2: Silent Cloud Sync (If logged in)
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.user) {
    const userId = sessionData.session.user.id;
    await supabase.from('study_history').upsert({
      user_id: userId,
      document_id: doc.id,
      accessed_at: new Date().toISOString()
    }, { onConflict: 'user_id, document_id' }); // Overwrites timestamp if it already exists
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
        documents (
          id, title, category, file_url, uploaded_by, created_at, module_id, subject, status
        )
      `)
      .order('view_count', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data
      .map((d: any) => d.documents)
      .filter((doc: any) => doc !== null && doc.status === 'approved');
      
  } catch (error) {
    console.error("Failed to fetch global trending:", error);
    return [];
  }
};

// --- CROWDSOURCING / APPROVALS ---

export const updateDocumentStatus = async (id: number, status: 'approved' | 'rejected') => {
  const { error } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id);
    
  if (error) throw error;
};