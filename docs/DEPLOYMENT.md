# Deployment Guide

## Architecture
- Frontend: Vercel (Next.js)
- Backend: Render (FastAPI)
- DB/Auth: Supabase
- Object Storage: Cloudflare R2

## Deployment Steps
1. Push to `main`. Vercel and Render will auto-deploy.
2. Run database migrations: `supabase db push`

## Rollback Procedure
If a migration fails or causes issues:
- Revert the git commit and push.
- If schema rollback is needed, manually run `DROP` or `ALTER` statements via Supabase SQL editor.
