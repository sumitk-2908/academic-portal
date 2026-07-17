CREATE OR REPLACE FUNCTION get_admin_analytics_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_docs integer;
    approved_docs integer;
    pending_docs integer;
    rejected_docs integer;
    total_downloads integer;
    total_views integer;
    total_flags integer;
BEGIN
    SELECT count(*), 
           count(*) FILTER (WHERE status = 'approved'),
           count(*) FILTER (WHERE status = 'pending'),
           count(*) FILTER (WHERE status = 'rejected')
    INTO total_docs, approved_docs, pending_docs, rejected_docs
    FROM documents;

    SELECT COALESCE(sum(download_count), 0), COALESCE(sum(view_count), 0)
    INTO total_downloads, total_views
    FROM document_analytics;

    SELECT count(*)
    INTO total_flags
    FROM document_flags;

    RETURN json_build_object(
        'totalDocs', total_docs,
        'approvedDocs', approved_docs,
        'pendingDocs', pending_docs,
        'rejectedDocs', rejected_docs,
        'totalDownloads', total_downloads,
        'totalViews', total_views,
        'totalFlags', total_flags
    );
END;
$$;
