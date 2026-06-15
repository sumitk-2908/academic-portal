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

export const getDocumentsByModule = async (moduleId: number) => {
  const response = await api.get(`/api/v1/documents/module/${moduleId}`);
  return response.data;
};

export const uploadDocument = async (formData: FormData) => {
  const response = await api.post('/api/v1/documents/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteDocument = async (documentId: number) => {
  const response = await api.delete(`/api/v1/documents/${documentId}`);
  return response.data;
};

export const searchDocuments = async (query: string) => {
  const response = await api.get(`/api/v1/documents/search`, {
    params: { query }
  });
  return response.data;
};

// Add these to your existing api.ts file

export interface Subject {
  id: number;
  name: string;
  slug: string; // e.g., "maths-1"
  is_non_module: boolean;
}

export interface Module {
  id: number;
  subject_id: number;
  module_number: number;
  name: string;
}

export const getSubjects = async () => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Subject[];
};

export const getModulesBySubject = async (subjectId: number) => {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('subject_id', subjectId)
    .order('module_number');
  if (error) throw error;
  return data as Module[];
};

// Fetch documents for the initial server render
export const getDocumentsBySubjectSlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('subject_slug', slug) // Assuming you have a slug or join via subject id
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// --- CLOUD SYNC: BOOKMARKS ---

export const getStudentBookmarks = async (userId: string) => {
  const { data, error } = await supabase
    .from('student_bookmarks')
    .select('document_id')
    .eq('user_id', userId);
    
  if (error) throw error;
  // Return a simple array of document IDs: [1, 5, 12]
  return data.map(b => b.document_id);
};

export const addBookmark = async (userId: string, documentId: number) => {
  const { error } = await supabase
    .from('student_bookmarks')
    .insert({ user_id: userId, document_id: documentId });
  if (error) throw error;
};

export const removeBookmark = async (userId: string, documentId: number) => {
  const { error } = await supabase
    .from('student_bookmarks')
    .delete()
    .match({ user_id: userId, document_id: documentId });
  if (error) throw error;
};

// --- CLOUD SYNC: STUDY HISTORY ---

export const getStudentHistory = async (userId: string) => {
  const { data, error } = await supabase
    .from('student_history')
    .select('document_id, updated_at')
    .eq('user_id', userId)
    .single(); // We only keep one "Continue Studying" item per user
    
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found, which is fine
  return data;
};

export const updateStudentHistory = async (userId: string, documentId: number) => {
  // Upsert (Update if exists, Insert if new)
  const { error } = await supabase
    .from('student_history')
    .upsert({ 
      user_id: userId, 
      document_id: documentId,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id' 
    });
  if (error) throw error;
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
    // We intentionally fail silently so tracking errors never interrupt the user
    console.error("Failed to track analytics:", error);
  }
};

export const getTrendingDocumentIds = async () => {
  try {
    const { data, error } = await supabase
      .from('document_analytics')
      .select('document_id')
      .order('view_count', { ascending: false })
      .limit(5);

    if (error) throw error;
    // Returns an array of the top 5 document IDs: [12, 5, 89, 2]
    return data.map(d => d.document_id);
  } catch (error) {
    console.error("Failed to fetch trending:", error);
    return [];
  }
};