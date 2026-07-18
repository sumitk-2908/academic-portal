import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required environment variables")

# Single global instance of the Supabase client to share the underlying HTTP connection pool
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
