from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import RedirectResponse
import os
import httpx
import fitz  # PyMuPDF for PDF processing
import traceback

from dotenv import load_dotenv

# We have REMOVED all SQLAlchemy and Neon database dependencies!
from app.models.academic import DocCategory
from app.auth import verify_token, verify_admin
from supabase import create_client, Client

load_dotenv()

router = APIRouter()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials missing from Environment Variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@router.post("/upload/")
async def upload_document(
    title: str = Form(...),
    category: DocCategory = Form(...),
    module_id: int = Form(1),
    subject: str = Form("General"),
    uploaded_by: str = Form("Admin"),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token),       
    admin_user: dict = Depends(verify_admin), 
):
    """Uploads a PDF to Supabase Storage AND inserts the row directly into the Supabase Database."""
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        safe_module_id = int(module_id)
        safe_filename = file.filename.replace(" ", "_")
        file_bytes = await file.read()
        
        # --- DYNAMIC METADATA EXTRACTION ---
        file_size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        page_count = None
        thumbnail_url = None
        thumbnail_bytes = None
        safe_thumb_filename = f"thumb_{safe_filename.replace('.pdf', '.jpg')}"

        try:
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(pdf_document)
            
            first_page = pdf_document.load_page(0)
            pix = first_page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            thumbnail_bytes = pix.tobytes("jpeg")
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
        
        # Fire files to Supabase Storage
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

        # =========================================================
        # CRITICAL FIX: Save directly to Supabase Database
        # completely bypassing Neon and SQLAlchemy!
        # =========================================================
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
            "status": "pending" # Keep as pending for Admin Inbox verification
        }
        
        db_response = supabase.table("documents").insert(new_doc_payload).execute()
        
        if not db_response.data:
            raise Exception("Supabase DB Insert returned empty data.")
            
        return db_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Crash: {str(e)}")


@router.get("/module/{module_id}")
def get_documents_by_module(module_id: int):
    """Fetches all approved PDFs directly from Supabase DB."""
    response = supabase.table("documents").select("*").eq("module_id", module_id).eq("status", "approved").execute()
    return response.data


@router.get("/search")
def search_documents(query: str):
    """Global search directly in Supabase DB."""
    response = supabase.table("documents").select("*").ilike("title", f"%{query}%").eq("status", "approved").limit(20).execute()
    return response.data


@router.get("/download/{filename}")
async def download_document(filename: str):
    public_url = supabase.storage.from_("documents").get_public_url(filename)
    return RedirectResponse(url=public_url)


@router.delete("/{document_id}")
async def delete_document(
    document_id: int, 
    admin_user: dict = Depends(verify_admin)
):
    try:
        # 1. Find the document in Supabase Database
        doc_response = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found in Supabase")
            
        document = doc_response.data[0]
        filename = document.get("file_url", "").split("/")[-1]
        
        # 2. CLEAR FOREIGN KEYS FIRST (Fixes the Database Crash)
        # We must delete the tracking records before the main document, or PostgreSQL will block the deletion.
        supabase.table("student_bookmarks").delete().eq("document_id", document_id).execute()
        supabase.table("study_history").delete().eq("document_id", document_id).execute()
        supabase.table("document_analytics").delete().eq("doc_id", document_id).execute()
        
        # 3. Delete from Supabase Storage Bucket
        try:
            files_to_delete = [filename]
            if document.get("thumbnail_url"):
                thumb_filename = document.get("thumbnail_url").split("/")[-1]
                files_to_delete.append(thumb_filename)
                
            supabase.storage.from_("documents").remove(files_to_delete)
        except Exception as e:
            print(f"Warning: Failed to delete cloud files: {e}")
            
        # 4. Delete the actual document from the database
        supabase.table("documents").delete().eq("id", document_id).execute()
        
        return {"message": f"Document {document_id} and all associated cloud files deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Delete Crash: {str(e)}")