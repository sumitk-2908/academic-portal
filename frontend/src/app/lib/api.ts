import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDocumentsByModule = async (moduleId: number) => {
  const response = await api.get(`/api/v1/documents/module/${moduleId}`);
  return response.data;
};

export const uploadDocument = async (formData: FormData) => {
  // Explicitly override the default JSON format so FastAPI knows a file is coming
  const response = await api.post('/api/v1/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};


// --- ADD THIS DELETE FUNCTION ---
export const deleteDocument = async (documentId: number) => {
  const response = await api.delete(`/api/v1/documents/${documentId}`);
  return response.data;
};