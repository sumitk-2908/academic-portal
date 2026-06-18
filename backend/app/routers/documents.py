import os
import uuid
import asyncio
import fitz  # PyMuPDF
import httpx
from enum import Enum
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from supabase import create_client, Client

router = APIRouter()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
# CRITICAL: Use the SERVICE_ROLE key here so the backend can bypass RLS 
# and manage file uploads/deletions with admin privileges.
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Missing SUPABASE_URL or SUPABASE_KEY environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


class DocCategory(str, Enum):
    notes = "notes"
    pyq = "pyq"
    syllabus = "syllabus"

# --- BACKGROUND PDF PROCESSOR ---
def extract_pdf_metadata(file_bytes: bytes):
    """
    Synchronous, CPU-bound task isolated here so it can be 
    run in a background thread without blocking FastAPI.
    """
    pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = len(pdf_document)
    
    first_page = pdf_document.load_page(0)
    pix = first_page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
    thumbnail_bytes = pix.tobytes("jpeg")
    
    return page_count, thumbnail_bytes

# --- UPLOAD ENDPOINT ---
@router.post("/upload/")
async def upload_document(
    title: str = Form(...),
    category: DocCategory = Form(...),
    module_id: str = Form("null"), # Accepts "null" string from frontend for non-module subjects
    subject: str = Form("General"),
    uploaded_by: str = Form("Admin"),
    status: str = Form("pending"), # Dynamic status (approved for admin, pending for student)
    file: UploadFile = File(...)
):
    """Uploads a PDF to Supabase Storage AND inserts the row directly into the Supabase Database."""
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        # Convert string "null" back to Python None to satisfy integer database constraints
        safe_module_id = None if module_id == "null" else int(module_id)
        
        # Prepend a unique 8-character UUID to the filename to prevent cloud overwrites
        unique_prefix = uuid.uuid4().hex[:8]
        original_clean_name = file.filename.replace(" ", "_")
        safe_filename = f"{unique_prefix}_{original_clean_name}"
        
        file_bytes = await file.read()
        
        # --- DYNAMIC METADATA EXTRACTION ---
        file_size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        page_count = None
        thumbnail_url = None
        thumbnail_bytes = None
        safe_thumb_filename = f"thumb_{safe_filename.replace('.pdf', '.jpg')}"

        try:
            # Offload PyMuPDF to a background thread to prevent blocking the event loop
            page_count, thumbnail_bytes = await asyncio.to_thread(
                extract_pdf_metadata, file_bytes
            )
        except Exception as e:
            print(f"Warning: Failed to process PDF metadata/thumbnail: {e}")

        base_url = SUPABASE_URL.rstrip("/")
        upload_url = f"{base_url}/storage/v1/object/documents/{safe_filename}"
        thumb_upload_url = f"{base_url}/storage/v1/object/documents/{safe_thumb_filename}" if thumbnail_bytes else None
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": file.content_type or "application/pdf",
            "x-upsert": "true" 
        }
        
        # Fire files directly to Supabase Storage Bucket
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(upload_url, content=file_bytes, headers=headers)
            if response.status_code >= 400:
                raise HTTPException(status_code=500, detail=f"Direct Upload Failed: {response.text}")
                
            if thumbnail_bytes and thumb_upload_url:
                thumb_headers = {**headers, "Content-Type": "image/jpeg"}
                thumb_response = await client.post(thumb_upload_url, content=thumbnail_bytes, headers=thumb_headers)
                if thumb_response.status_code < 400:
                    thumbnail_url = f"{base_url}/storage/v1/object/public/documents/{safe_thumb_filename}"
            
        public_url = f"{base_url}/storage/v1/object/public/documents/{safe_filename}"
        category_val = category.value if hasattr(category, 'value') else category
        
        new_doc_payload = {
            "title": title,
            "category": category_val,
            "module_id": safe_module_id,
            "subject": subject,
            "uploaded_by": uploaded_by,
            "file_url": public_url,
            "file_size": file_size_mb,
            "page_count": page_count,
            "thumbnail_url": thumbnail_url,
            "status": status
        }
        
        # Insert document metadata into Database with ROLLBACK logic
        try:
            db_response = supabase.table("documents").insert(new_doc_payload).execute()
            
            if not db_response.data:
                raise Exception("Supabase DB Insert returned empty data.")
                
            return db_response.data[0]
            
        except Exception as db_err:
            # ROLLBACK: Delete the orphaned files from storage if DB insert fails
            print(f"DB Insert failed, rolling back storage uploads: {db_err}")
            files_to_remove = [safe_filename]
            if thumbnail_bytes:
                files_to_remove.append(safe_thumb_filename)
            
            try:
                supabase.storage.from_("documents").remove(files_to_remove)
            except Exception as cleanup_err:
                print(f"Warning: Failed to clean up orphaned files: {cleanup_err}")
                
            raise HTTPException(status_code=500, detail="Database insert failed. Upload rolled back.")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Crash: {str(e)}")


# --- DELETE ENDPOINT ---
@router.delete("/{document_id}")
async def delete_document(document_id: int):
    """Safely deletes document from Tracking Tables, Database, and Cloud Storage."""
    try:
        # 1. Fetch document to get file URLs so we can delete from Cloud Storage
        doc_response = supabase.table("documents").select("file_url, thumbnail_url").eq("id", document_id).execute()
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = doc_response.data[0]
        
        # Extract exact filenames from URLs
        base_url = SUPABASE_URL.rstrip("/")
        public_prefix = f"{base_url}/storage/v1/object/public/documents/"
        
        files_to_remove = []
        if doc.get("file_url") and doc["file_url"].startswith(public_prefix):
            files_to_remove.append(doc["file_url"].replace(public_prefix, ""))
        if doc.get("thumbnail_url") and doc["thumbnail_url"].startswith(public_prefix):
            files_to_remove.append(doc["thumbnail_url"].replace(public_prefix, ""))
            
        # 2. Delete the PDF and Thumbnail from Cloud Storage bucket
        if files_to_remove:
            supabase.storage.from_("documents").remove(files_to_remove)

        # 3. Delete the core document row
        # (Assuming ON DELETE CASCADE is set up on PostgreSQL foreign keys for tracking tables)
        supabase.table("documents").delete().eq("id", document_id).execute()
        
        return {"message": "Document and associated assets deleted successfully", "deleted_id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")