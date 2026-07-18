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
  sortBy: string = "created_at",
  subjectName?: string
): Promise<DocumentsPage> => {
  const options: SearchOptions = {
    page,
    limit,
    sortBy: sortBy as any,
    moduleId,
  };
  
  if (category && category !== 'all') {
    options.category = category;
  }
  if (subjectName) {
    options.subject = subjectName;
  }

  const { data, totalPages, totalItems } = await searchDocuments(options);
  
  const hasMore = page < totalPages;
  return { 
    data, 
    nextCursor: hasMore ? page + 1 : null,
    total: totalItems 
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
  moduleId?: number;
}

export const searchDocuments = async (options: SearchOptions = {}) => {
  const {
    query = "",
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "desc",
    category,
    subject,
    moduleId
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  if (query) params.append("query", query);
  if (category) params.append("category", category);
  if (subject) params.append("subject", subject);
  if (moduleId !== undefined) params.append("module_id", moduleId.toString());

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      data: (result.data as unknown as DocumentWithAnalytics[]) || [],
      totalPages: result.totalPages || 0,
      totalItems: result.totalItems || 0,
    };
  } catch (error) {
    console.error("FastAPI Search Error:", error);
    return { data: [], totalPages: 0, totalItems: 0 };
  }
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
