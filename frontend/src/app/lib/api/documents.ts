import { supabase, api } from './core';
import type { DocumentRecord, DocumentWithAnalytics, DocumentsPage } from '../document-types';

export const getDocumentsByModule = async (moduleId: number): Promise<DocumentWithAnalytics[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*, document_analytics(upvotes)')
    .eq('module_id', moduleId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch by Module Error:", error);
    return [];
  }
  return (data as unknown as DocumentWithAnalytics[]) || [];
};

export const getPaginatedDocumentsByModule = async (
  moduleId: number, 
  page = 1, 
  limit = 20,
  category?: string,
  sortBy: string = "created_at"
): Promise<DocumentsPage> => {
  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

  let query = supabase
    .from('documents')
    .select('*, document_analytics(upvotes, download_count)', { count: 'exact' })
    .eq('module_id', moduleId)
    .eq('status', 'approved');

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (sortBy === 'upvotes' || sortBy === 'download_count') {
    query = query.order(sortBy, { foreignTable: 'document_analytics', ascending: false });
  } else {
    query = query.order(sortBy || 'created_at', { ascending: false });
  }

  const { data, count, error } = await query.range(fromIndex, toIndex);

  if (error) {
    console.error("Fetch Paginated Error:", error);
    return { data: [], nextCursor: null, total: 0 };
  }

  const hasMore = count ? fromIndex + (data?.length || 0) < count : false;
  return { 
    data: (data as unknown as DocumentWithAnalytics[]) || [], 
    nextCursor: hasMore ? page + 1 : null,
    total: count || 0
  };
};

export interface SearchOptions {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  subject?: string;
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

  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

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
    uploader_name,
    document_analytics(upvotes, view_count, download_count)
  `;

  let dbQuery = supabase
    .from('documents')
    .select(selectedFields, { count: 'exact' })
    .eq('status', 'approved');

  if (query && query.trim() !== "") {
    dbQuery = dbQuery.textSearch('fts', query.trim(), {
      type: 'websearch',
      config: 'english'
    });
  }

  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }
  if (subject) {
    dbQuery = dbQuery.eq('subject', subject);
  }

  if (sortBy === 'upvotes' || sortBy === 'download_count') {
    dbQuery = dbQuery.order(sortBy, { foreignTable: 'document_analytics', ascending: sortOrder === 'asc' });
  } else {
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });
  }
  dbQuery = dbQuery.range(fromIndex, toIndex);

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error("Search Error:", error);
    return { data: [], totalPages: 0, totalItems: 0 };
  }

  return { 
    data: (data as unknown as DocumentWithAnalytics[]) || [], 
    totalPages: count ? Math.ceil(count / limit) : 0,
    totalItems: count || 0
  };
};

export type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

export const uploadWithProgress = (
  endpointUrl: string,
  formData: FormData,
  token: string,
  onProgress: (progress: number) => void,
  onStateChange: (state: UploadState) => void
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpointUrl, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    
    xhr.timeout = 120000;
    xhr.ontimeout = () => {
      onStateChange("error");
      reject(new Error("Upload timed out. Please try again."));
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        
        if (percentComplete >= 100) {
          onProgress(99);
          onStateChange("processing");
        } else {
          onProgress(percentComplete);
        }
      }
    };

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

export const uploadDocument = async (
  formData: FormData,
  onProgress: (percent: number) => void,
  onStateChange: (state: UploadState) => void
) => {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    
    if (session?.expires_at && (session.expires_at * 1000) - Date.now() < 60000) {
      const { data } = await supabase.auth.refreshSession();
      session = data.session;
    }
    
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/upload/`;

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
  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } } };
    console.error("FastAPI Delete Error:", err.response?.data || error);
    throw new Error(err.response?.data?.detail || "Failed to delete document via FastAPI.");
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
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to resubmit document");
  }

  return response.json();
}
