import axios from 'axios';
import { createClient } from '../../utils/supabase/client';
import { Database } from "./database.types";

// 1. Initialize Supabase Auth
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const supabase = createClient();

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
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch by Module Error:", error);
    return [];
  }
  return data || [];
};

export const getPaginatedDocumentsByModule = async (moduleId: number, page = 1, limit = 20) => {
  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

  const { data, count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('module_id', moduleId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(fromIndex, toIndex);

  if (error) {
    console.error("Fetch Paginated Error:", error);
    return { data: [], nextCursor: null, total: 0 };
  }

  const hasMore = count ? fromIndex + (data?.length || 0) < count : false;
  return { 
    data: data || [], 
    nextCursor: hasMore ? page + 1 : null,
    total: count || 0
  };
};
// --- ENHANCED SEARCH (Server-Side Pagination & FTS) ---

export interface SearchOptions {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string; // Keeps existing category filters intact
  subject?: string;  // Keeps existing subject filters intact
}

export const searchDocuments = async (options: SearchOptions = {}) => {
  const {
    query = "",
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "desc",
    category,
    subject
  } = options;

  // 1. Server-side Pagination math
  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

  // 2. Return only required fields (Prevents massive payload downloads)
  const selectedFields = `
    id, 
    title, 
    category, 
    subject, 
    module_id,
    thumbnail_url, 
    file_url,
    file_size, 
    page_count, 
    created_at, 
    uploaded_by, 
    uploader_name
  `;

  // Initialize query with exact count for pagination UI
  let dbQuery = supabase
    .from('documents')
    .select(selectedFields, { count: 'exact' })
    .eq('status', 'approved');

  // 3. Postgres Full Text Search (Option A)
  if (query && query.trim() !== "") {
    // Uses the 'fts' column created in SQL. 
    // 'websearch' enables natural language, quotes for exact phrases, and +/- operators.
    dbQuery = dbQuery.textSearch('fts', query.trim(), {
      type: 'websearch',
      config: 'english'
    });
  }

  // 4. Preserve Existing Filters (Does not break subject/category pages)
  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }
  if (subject) {
    dbQuery = dbQuery.eq('subject', subject);
  }

  // 5. Sorting Support
  dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

  // 6. Apply Pagination range
  dbQuery = dbQuery.range(fromIndex, toIndex);

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error("Search Error:", error);
    return { data: [], totalPages: 0, totalItems: 0 };
  }

  return { 
    data: data || [], 
    totalPages: count ? Math.ceil(count / limit) : 0,
    totalItems: count || 0
  };
};

// --- UPLOAD & DELETE (Routed through FastAPI) ---

export const uploadDocument = async (
  formData: FormData,
  onProgress: (percent: number) => void,
  onStateChange: (state: UploadState) => void
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/upload/`;

    // Call the new progressive uploader
    const response = await uploadWithProgress(
      endpoint,
      formData,
      session?.access_token || '',
      onProgress,
      onStateChange
    );

    return response;
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
    // Clean Relational Join replacing the two-step workaround
    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from('student_bookmarks')
      .select('created_at, documents!inner(*)') 
      .eq('user_id', userId)
      .eq('documents.status', 'approved')
      .order('created_at', { ascending: false });
      
    if (!bookmarkError && bookmarkData && bookmarkData.length > 0) {
      cloudBookmarks = bookmarkData.map((b: any) => ({
        ...b.documents,
        bookmarked_at: b.created_at 
      }));
    }
  }
  
  try {
    const stored = localStorage.getItem("portal_bookmarks");
    const parsed = stored ? JSON.parse(stored) : [];
    
    // Extract IDs for Supabase, handling both legacy numbers and new objects
    const localIds = parsed.map((b: any) => typeof b === 'object' ? b.id : b);
    
    if (!Array.isArray(localIds) || localIds.length === 0) return cloudBookmarks;
    
    const { data, error } = await supabase.from('documents').select('*').in('id', localIds).eq('status', 'approved');
    const localBookmarks = (!error && Array.isArray(data)) ? data : [];

    const allBookmarks = [...cloudBookmarks];
    for (const lb of localBookmarks) {
      if (!allBookmarks.find(b => b.id === lb.id)) {
        
        // Find the exact storage item to get its real timestamp
        const localItem = parsed.find((p: any) => (typeof p === 'object' ? p.id : p) === lb.id);
        const actualDate = (localItem && typeof localItem === 'object' && localItem.bookmarked_at) 
                            ? localItem.bookmarked_at 
                            : lb.created_at; // Fallback for old legacy items only
                            
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

// ==========================================
// --- CLOUD SYNC: HYBRID STUDY HISTORY ---
// ==========================================

export const getRecentStudyActivity = async (userId?: string) => {
  let cloudHistory: any[] = [];

  if (userId) {
    // Clean Relational Join replacing the two-step workaround
    const { data: historyData, error: historyError } = await supabase
      .from('study_history')
      .select('accessed_at, documents!inner(*)')
      .eq('user_id', userId)
      .eq('documents.status', 'approved') // Ensures we don't fetch deleted/rejected docs
      .order('accessed_at', { ascending: false })
      .limit(5);

    if (!historyError && historyData && historyData.length > 0) {
      cloudHistory = historyData.map((h: any) => ({
        ...h.documents,
        accessed_at: h.accessed_at 
      }));
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
         // 3. FIX: Ensure legacy local storage items don't break the chronological sort
         combined.push({
           ...lh,
           accessed_at: lh.accessed_at || lh.created_at
         });
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

  
  const currentYear = new Date().getFullYear();
  const fetchStartDate = new Date(currentYear, 0, 1);

  if (userId) {
    // Clean Relational Join replacing the two-step workaround
    const { data: historyData, error: historyError } = await supabase
      .from('study_history')
      .select('accessed_at, documents!inner(*)')
      .eq('user_id', userId)
      .gte('accessed_at', fetchStartDate.toISOString()) 
      .eq('documents.status', 'approved')
      .order('accessed_at', { ascending: false });

    if (!historyError && historyData && historyData.length > 0) {
      cloudHistory = historyData.map((h: any) => ({
        ...h.documents,
        accessed_at: h.accessed_at 
      }));
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
         combined.push({
           ...lh,
           accessed_at: lh.accessed_at || lh.created_at
         });
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
    // Clean Relational Join replacing the two-step workaround
    const { data: analytics, error } = await supabase
      .from('document_analytics')
      .select('view_count, documents!inner(*)')
      .not('view_count', 'is', null)
      .eq('documents.status', 'approved')
      .order('view_count', { ascending: false })
      .limit(10); 

    if (error || !analytics || analytics.length === 0) return [];

    return analytics
      .map((stat: any) => ({ 
        ...stat.documents, 
        view_count: stat.view_count || 0 
      }))
      .slice(0, 5); 
  } catch (error) {
    console.error("Failed to fetch global trending:", error);
    return [];
  }
};

// --- CROWDSOURCING / APPROVALS ---

export const updateDocumentStatus = async (
  id: number, 
  status: 'approved' | 'rejected', 
  reason?: string 
) => {
  try {
    const payload: { status: string; reason?: string } = { status };
    if (reason) {
      payload.reason = reason;
    }
    
    const response = await api.patch(`/api/v1/documents/${id}/status`, payload);
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
  try {
    // Clean Relational Join replacing the two-step workaround
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*, document_analytics(*)')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!docs || docs.length === 0) return [];

    return docs.map((doc: any) => {
      // Handle the embedded relationship (PostgREST returns an array or object depending on 1:1 setup)
      const analytics = Array.isArray(doc.document_analytics) 
        ? doc.document_analytics[0] 
        : doc.document_analytics;

      return {
        ...doc,
        document_analytics: analytics || { view_count: 0, download_count: 0 }
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
  preferences: { favorite_subjects?: string[], preferred_branch?: string, full_name?: string, academic_year?: string }
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

// --- PERSONALIZED FEEDS ---

export const getPersonalizedRecentUploads = async (userId?: string, limit = 5) => {
  let personalizedDocs: any[] = [];
  let userFavs: string[] = [];

  // Step 1: Attempt personalized fetch if logged in
  if (userId) {
    const profile = await getProfilePreferences(userId);
    userFavs = profile?.favorite_subjects || [];

    if (userFavs.length > 0) {
  
      const orQuery = userFavs.map((f: string) => `subject.ilike.%${f.trim()}%`).join(',');
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'approved')
        .or(orQuery)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (data) personalizedDocs = data;
    }
  }

  // Step 2: Graceful Fallback / Backfill
  if (personalizedDocs.length < limit) {
    const remainingLimit = limit - personalizedDocs.length;
    const excludeIds = personalizedDocs.map(d => d.id);
    
    let fallbackQuery = supabase
      .from('documents')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(remainingLimit);

    if (excludeIds.length > 0) {
      // Exclude already fetched docs to prevent duplicates
      fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: fallbackDocs } = await fallbackQuery;
    if (fallbackDocs) {
      personalizedDocs = [...personalizedDocs, ...fallbackDocs];
    }
  }

  return personalizedDocs;
};

export const getPersonalizedRecommendations = async (userId?: string, limit = 5) => {
  // Leverages trending analytics but heavily weights them towards preferred_branch and favorites
  const globalTrending = await getTrendingDocuments();
  
  if (!userId) return globalTrending;

  const profile = await getProfilePreferences(userId);
  if (!profile || (!profile.favorite_subjects?.length && !profile.preferred_branch)) {
    return globalTrending;
  }

  const orQuery = profile.favorite_subjects.map((f: string) => `subject.ilike.%${f.trim()}%`).join(',');
  const { data: personalizedTrending } = await supabase
    .from('documents')
    .select('*')
    .eq('status', 'approved')
    .or(orQuery)
    .order('created_at', { ascending: false }) 
    .limit(limit);

  // Merge and deduplicate, prioritizing personalized items
  const combined = [...(personalizedTrending || [])];
  const existingIds = new Set(combined.map(d => d.id));

  for (const doc of globalTrending) {
    if (combined.length >= limit) break;
    if (!existingIds.has(doc.id)) {
      combined.push(doc);
      existingIds.add(doc.id);
    }
  }

  return combined;
};

export const getSuggestedNextSteps = async (lastDoc: any, excludeIds: number[] = [], limit = 3) => {
  if (!lastDoc || !lastDoc.subject) return [];
  
  let query = supabase
    .from('documents')
    .select('*')
    .eq('status', 'approved')
    .eq('subject', lastDoc.subject); // Find docs in the exact same subject
    
  if (excludeIds.length > 0) {
    // Don't recommend what they've already seen recently
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  
  // Try to recommend PYQs or Notes primarily, fallback to newest
  const { data, error } = await query
    .order('category', { ascending: false }) 
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch suggestions:", error);
    return [];
  }
  return data || [];
};

// ==========================================
// --- CONTENT QUALITY / MODERATION ---
// ==========================================

export const getFlaggedDocuments = async () => {
  try {
    // 1. Fetch pending flags
    const { data: flags, error: flagError } = await supabase
      .from('document_flags')
      .select('*')
      .eq('status', 'pending');

    if (flagError || !flags || flags.length === 0) return [];

    // 2. Group flags by document_id
    const flagMap = new Map();
    flags.forEach(flag => {
      if (!flagMap.has(flag.document_id)) {
        flagMap.set(flag.document_id, []);
      }
      flagMap.get(flag.document_id).push(flag);
    });

    // 3. Fetch corresponding *approved* documents
    const docIds = Array.from(flagMap.keys());
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('*')
      .in('id', docIds)
      .eq('status', 'approved'); // Only show flags for live documents

    if (docError || !docs) return [];

    // 4. Combine document data with its flags
    return docs.map(doc => ({
      ...doc,
      flags: flagMap.get(doc.id)
    })).sort((a, b) => b.flags.length - a.flags.length); // Sort by highest number of flags
  } catch (error) {
    console.error("Failed to fetch flagged documents:", error);
    return [];
  }
};

export const dismissDocumentFlags = async (documentId: number) => {
  try {
    // Routes directly to the secure FastAPI backend, 
    // automatically attaching the JWT via the Axios interceptor
    const response = await api.post(`/api/v1/documents/${documentId}/dismiss-flags`);
    return response.data;
  } catch (error: any) {
    console.error("FastAPI Flag Dismissal Error:", error.response?.data || error);
    throw new Error(error.response?.data?.detail || "Failed to dismiss flags.");
  }
};

export async function resubmitDocument(
  documentId: number,
  formData: FormData,
  token: string
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${documentId}/resubmit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type here; let the browser set it automatically for FormData (multipart/form-data)
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to resubmit document");
  }

  return response.json();
}

export type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

export const uploadWithProgress = (
  endpointUrl: string,
  formData: FormData,
  token: string,
  onProgress: (progress: number) => void,
  onStateChange: (state: UploadState) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpointUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // 1. Track Network Transfer
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        
        // UX Trick: Cap at 99% while uploading. 
        // 100% means the network transfer is done, but the backend is still "processing" the PDF.
        if (percentComplete >= 100) {
          onProgress(99);
          onStateChange("processing");
        } else {
          onProgress(percentComplete);
        }
      }
    };

    // 2. Handle Server Response
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        onStateChange("success");
        resolve(JSON.parse(xhr.responseText));
      } else {
        onStateChange("error");
        let errorMsg = "Upload failed on the server.";
        try {
          errorMsg = JSON.parse(xhr.responseText).detail || errorMsg;
        } catch (e) {}
        reject(new Error(errorMsg));
      }
    };

    // 3. Handle Network Interruptions
    xhr.onerror = () => {
      onStateChange("error");
      reject(new Error("Network connection lost. Please check your internet."));
    };

    xhr.onabort = () => {
      onStateChange("error");
      reject(new Error("Upload was manually aborted."));
    };

    onStateChange("uploading");
    xhr.send(formData);
  });
};