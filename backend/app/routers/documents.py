from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import os
import httpx
import fitz  # PyMuPDF for PDF processing
import traceback # ADDED for detailed error logging

from dotenv import load_dotenv

from app.database import get_db
from app.models.academic import Document, Module, DocCategory
from app.schemas.academic import DocumentResponse

# Import the official Supabase Client tools
from supabase import create_client, Client

from app.auth import verify_token, verify_admin

load_dotenv()

router = APIRouter()

# Initialize Supabase client using cloud environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials missing from Environment Variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@router.post("/upload/", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    category: DocCategory = Form(...),
    module_id: int = Form(1),
    subject: str = Form("General"),
    uploaded_by: str = Form("Admin"),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token),       # 🛡️ General Token Security intact
    admin_user: dict = Depends(verify_admin), # 🛡️ Admin Security intact
    db: Session = Depends(get_db)
):
    """Uploads a PDF directly via REST API, completely bypassing the buggy Supabase SDK."""
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    try:
        module = db.query(Module).filter(Module.id == module_id).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")

        safe_filename = file.filename.replace(" ", "_")
        file_bytes = await file.read()
        
        # --- DYNAMIC METADATA EXTRACTION ---
        file_size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        page_count = None
        thumbnail_url = None
        thumbnail_bytes = None
        safe_thumb_filename = f"thumb_{safe_filename.replace('.pdf', '.jpg')}"

        try:
            # Open PDF in memory using PyMuPDF
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(pdf_document)
            
            # Extract first page as a thumbnail image (scale down resolution to save space)
            first_page = pdf_document.load_page(0)
            pix = first_page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            thumbnail_bytes = pix.tobytes("jpeg")
        except Exception as e:
            print(f"Warning: Failed to process PDF metadata/thumbnail: {e}")

        # 1. Clean the URL (removes accidental trailing slashes that break uploads)
        base_url = SUPABASE_URL.rstrip("/")
        
        # 2. Build the exact Supabase REST API endpoints
        upload_url = f"{base_url}/storage/v1/object/documents/{safe_filename}"
        thumb_upload_url = f"{base_url}/storage/v1/object/documents/{safe_thumb_filename}" if thumbnail_bytes else None
        
        # 3. Set up the strict security headers (Ensure content_type has a fallback)
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": file.content_type or "application/pdf",
            "x-upsert": "true" 
        }
        
        # 4. Fire the files directly at their servers (FIX: Increased timeout to 60s)
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Upload main PDF
            response = await client.post(upload_url, content=file_bytes, headers=headers)
            if response.status_code >= 400:
                raise HTTPException(status_code=500, detail=f"Direct Upload Failed: {response.text}")
                
            # Upload Thumbnail if successfully generated
            if thumbnail_bytes and thumb_upload_url:
                thumb_headers = {**headers, "Content-Type": "image/jpeg"}
                thumb_response = await client.post(thumb_upload_url, content=thumbnail_bytes, headers=thumb_headers)
                if thumb_response.status_code < 400:
                    thumbnail_url = f"{base_url}/storage/v1/object/public/documents/{safe_thumb_filename}"
            
        # 6. Generate the standard public URL for the PDF
        public_url = f"{base_url}/storage/v1/object/public/documents/{safe_filename}"

        # 7. Save to the database with dynamic metadata
        new_doc = Document(
            title=title,
            category=category,
            module_id=module_id,
            subject=subject,
            uploaded_by=uploaded_by,
            file_url=public_url,
            file_size=file_size_mb,
            page_count=page_count,
            thumbnail_url=thumbnail_url
        )
        
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        return new_doc

    except HTTPException:
        # Standard HTTPExceptions (like 404 Module Not Found) pass through normally
        raise
    except Exception as e:
        # Catch unhandled crashes (Timeouts, IntegrityErrors, Column mismatches, etc.)
        db.rollback() 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Crash: {str(e)}")


@router.get("/module/{module_id}", response_model=List[DocumentResponse])
def get_documents_by_module(module_id: int, db: Session = Depends(get_db)):
    """Fetches all approved PDFs for a specific module."""
    docs = db.query(Document).filter(
        Document.module_id == module_id, 
        Document.status == "approved"
    ).all()
    return docs


@router.get("/search", response_model=List[DocumentResponse])
def search_documents(query: str, db: Session = Depends(get_db)):
    """Global search bar logic: fuzzy searches titles."""
    search_term = f"%{query}%"
    docs = db.query(Document).filter(
        Document.title.ilike(search_term),
        Document.status == "approved"
    ).limit(20).all()
    return docs


@router.get("/download/{filename}")
async def download_document(filename: str):
    """
    Fallback safety route. If any old items or components still hit this route,
    we seamlessly redirect their browser straight to the Supabase cloud file.
    """
    public_url = supabase.storage.from_("documents").get_public_url(filename)
    return RedirectResponse(url=public_url)


@router.delete("/{document_id}")
async def delete_document(
    document_id: int, 
    admin_user: dict = Depends(verify_admin), # 🛡️ Admin Security intact
    db: Session = Depends(get_db)
):
    # 1. Find the document in the database
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # 2. Extract filename from the end of the stored URL
    filename = document.file_url.split("/")[-1]
    
    try:
        # 3. Request Supabase to delete the file from the cloud bucket
        files_to_delete = [filename]
        if document.thumbnail_url:
            thumb_filename = document.thumbnail_url.split("/")[-1]
            files_to_delete.append(thumb_filename)
            
        supabase.storage.from_("documents").remove(files_to_delete)
    except Exception as e:
        # Log error or proceed so database record doesn't become an un-deletable orphan
        print(f"Warning: Failed to delete file(s) from Supabase storage: {e}")
        
    # 4. Delete the tracking record from database
    db.delete(document)
    db.commit()
    
    return {"message": f"Document {document_id} and its associated cloud files deleted successfully"}