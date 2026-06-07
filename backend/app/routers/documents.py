from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import os
import httpx

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
    uploaded_by: str = Form("Admin"),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token),       # 🛡️ General Token Security intact
    admin_user: dict = Depends(verify_admin), # 🛡️ Admin Security intact
    db: Session = Depends(get_db)
):
    """Uploads a PDF directly via REST API, completely bypassing the buggy Supabase SDK."""
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    safe_filename = file.filename.replace(" ", "_")
    file_bytes = await file.read()
    
    # 1. Clean the URL (removes accidental trailing slashes that break uploads)
    base_url = SUPABASE_URL.rstrip("/")
    
    # 2. Build the exact Supabase REST API endpoint
    upload_url = f"{base_url}/storage/v1/object/documents/{safe_filename}"
    
    # 3. Set up the strict security headers (using your service_role key)
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": file.content_type,
        "x-upsert": "true" # Forces overwrite if you test the same file twice
    }
    
    # 4. Fire the file directly at their servers
    async with httpx.AsyncClient() as client:
        response = await client.post(upload_url, content=file_bytes, headers=headers)
        
    # 5. The Moment of Truth: If it fails, print the REAL error message
    if response.status_code >= 400:
        raise HTTPException(
            status_code=500, 
            detail=f"Direct Upload Failed: {response.text}"
        )
        
    # 6. Generate the standard public URL
    public_url = f"{base_url}/storage/v1/object/public/documents/{safe_filename}"

    # 7. Save to the Neon database
    new_doc = Document(
        title=title,
        category=category,
        module_id=module_id,
        uploaded_by=uploaded_by,
        file_url=public_url 
    )
    
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    return new_doc


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
        supabase.storage.from_("documents").remove([filename])
    except Exception as e:
        # Log error or proceed so database record doesn't become an un-deletable orphan
        print(f"Warning: Failed to delete file from Supabase storage: {e}")
        
    # 4. Delete the tracking record from Neon database
    db.delete(document)
    db.commit()
    
    return {"message": f"Document {document_id} and its associated cloud file deleted successfully"}