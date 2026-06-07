from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import os

from app.database import get_db
from app.models.academic import Document, Module, DocCategory
from app.schemas.academic import DocumentResponse

# Import the official Supabase Client tools
from supabase import create_client, Client

router = APIRouter()

# Initialize Supabase client using cloud environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials missing from Environment Variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    category: DocCategory = Form(...),
    module_id: int = Form(...),
    uploaded_by: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads a PDF to Supabase Storage using a temporary local buffer."""
    
    # 1. Check file type and module
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    safe_filename = file.filename.replace(" ", "_")
    
    # 2. Create a temporary staging area
    TEMP_DIR = "temp_uploads"
    os.makedirs(TEMP_DIR, exist_ok=True)
    temp_file_path = f"{TEMP_DIR}/{safe_filename}"
    
    try:
        # 3. Save the file to the local disk momentarily
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        # 4. Upload the physical file to Supabase (bypasses the memory bug)
        supabase.storage.from_("documents").upload(
            file=temp_file_path,
            path=safe_filename,
            file_options={"content-type": file.content_type}
        )
        
        # 5. Extract the permanent public link
        public_url = supabase.storage.from_("documents").get_public_url(safe_filename)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase Error: {str(e)}")
        
    finally:
        # 6. IMMEDIATELY delete the temporary file so Render stays clean
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    # 7. Save the cloud URL to the Neon database
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
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Deletes a document from the database and scrubs the file out of Supabase."""
    
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