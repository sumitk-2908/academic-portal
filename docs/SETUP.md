# Setup Guide

## Prerequisites
- Node.js v18+
- Python 3.10+
- Supabase CLI

## Environment Variables
Create a `.env.local` for the frontend and a `.env` for the backend.
Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT_URL`
- `R2_PUBLIC_URL`

## Running Locally
1. Start Supabase: `supabase start`
2. Frontend: `cd frontend && npm install && npm run dev`
3. Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
