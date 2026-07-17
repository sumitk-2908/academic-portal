import axios from 'axios';
import { createClient } from '../../../utils/supabase/client';

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

api.interceptors.request.use(async (config) => {
  let { data: { session } } = await supabase.auth.getSession();
  
  if (session?.expires_at && (session.expires_at * 1000) - Date.now() < 60000) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
