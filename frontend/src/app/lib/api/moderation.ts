import { supabase, api } from './core';

export const getFlaggedDocuments = async () => {
  try {
    const { data: flags, error: flagError } = await supabase
      .from('document_flags')
      .select('*')
      .eq('status', 'pending');

    if (flagError || !flags || flags.length === 0) return [];

    const flagMap = new Map();
    flags.forEach(flag => {
      if (!flagMap.has(flag.document_id)) {
        flagMap.set(flag.document_id, []);
      }
      flagMap.get(flag.document_id).push(flag);
    });

    const docIds = Array.from(flagMap.keys());
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('*')
      .in('id', docIds)
      .eq('status', 'approved'); 

    if (docError || !docs) return [];

    return docs.map(doc => ({
      ...doc,
      flags: flagMap.get(doc.id)
    })).sort((a, b) => b.flags.length - a.flags.length); 
  } catch (error) {
    console.error("Failed to fetch flagged documents:", error);
    return [];
  }
};

export const dismissDocumentFlags = async (documentId: number) => {
  try {
    const response = await api.post(`/api/v1/documents/${documentId}/dismiss-flags`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } } };
    console.error("FastAPI Flag Dismissal Error:", err.response?.data || error);
    throw new Error(err.response?.data?.detail || "Failed to dismiss flags.");
  }
};

export const updateDocumentStatus = async (
  id: number, 
  status: 'approved' | 'rejected', 
  reason?: string,
  rejection_reason_code?: string
) => {
  try {
    const payload: any = { status };
    if (reason) {
      payload.reason = reason;
    }
    if (rejection_reason_code) {
      payload.rejection_reason_code = rejection_reason_code;
    }
    
    const response = await api.patch(`/api/v1/documents/${id}/status`, payload);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } } };
    console.error("FastAPI Status Update Error:", err.response?.data || error);
    throw new Error(err.response?.data?.detail || "Failed to update document status.");
  }
};

export const bulkUpdateDocumentStatus = async (
  ids: number[], 
  status: 'approved' | 'rejected', 
  reason?: string,
  rejection_reason_code?: string
) => {
  try {
    const payload: any = { document_ids: ids, status };
    if (reason) {
      payload.reason = reason;
    }
    if (rejection_reason_code) {
      payload.rejection_reason_code = rejection_reason_code;
    }
    
    const response = await api.patch(`/api/v1/documents/bulk-status`, payload);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } } };
    console.error("FastAPI Bulk Status Update Error:", err.response?.data || error);
    throw new Error(err.response?.data?.detail || "Failed to bulk update document status.");
  }
};
