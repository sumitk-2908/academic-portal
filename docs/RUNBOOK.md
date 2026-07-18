# Production Runbook

## Incident Response
- Database CPU spikes: Check Supabase dashboard for slow queries, add indexes if needed.
- API 5xx errors: Check Render logs.

## Maintenance Tasks
- **R2 Orphan Cleanup**: Periodically run the backend script to reconcile R2 objects against the `documents` table to clean up orphaned PDFs.
- **Cache Invalidation**: Next.js cache can be invalidated using Vercel UI if stale data persists on the homepage.
