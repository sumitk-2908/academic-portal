import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase Auth
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dyxymzyijinfouqzjfls.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHltenlpamluZm91cXpqZmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTM1OTAsImV4cCI6MjA5NjM4OTU5MH0.xMHv4X8BppnSchvv58pTS6SnZfvRGN61KAXnpV3JQUs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const response = await api.post('/api/v1/documents/upload', formData, {
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