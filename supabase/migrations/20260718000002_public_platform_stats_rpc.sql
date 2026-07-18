CREATE OR REPLACE FUNCTION get_public_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subject_count integer;
    module_count integer;
    approved_doc_count integer;
    total_views bigint;
    total_downloads bigint;
BEGIN
    SELECT count(*) INTO subject_count FROM subjects;
    
    SELECT count(*) INTO module_count FROM modules;
    
    SELECT count(*) INTO approved_doc_count 
    FROM documents 
    WHERE status = 'approved';
    
    SELECT COALESCE(sum(view_count), 0), COALESCE(sum(download_count), 0)
    INTO total_views, total_downloads
    FROM document_analytics;
    
    RETURN json_build_object(
        'subjects', subject_count,
        'modules', module_count,
        'approvedDocs', approved_doc_count,
        'views', total_views,
        'downloads', total_downloads
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_platform_stats() TO anon, authenticated;
