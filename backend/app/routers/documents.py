from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import shutil
import os

from app.database import get_db
from app.models.academic import Document, Module, DocCategory
from app.schemas.academic import DocumentResponse

router = APIRouter()

# Create a local folder to store the PDFs for now
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    category: DocCategory = Form(...),
    module_id: int = Form(...),
    uploaded_by: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Uploads a PDF and links it to a specific module."""
    
    # 1. Check if the file is actually a PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # 2. Verify the module exists in the database
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # 3. Save the file to our local uploads folder
    safe_filename = file.filename.replace(" ", "_")
    file_path = f"{UPLOAD_DIR}/{safe_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Save the record in the database
    new_doc = Document(
        title=title,
        category=category,
        module_id=module_id,
        uploaded_by=uploaded_by,
        file_url=f"/api/v1/documents/download/{safe_filename}" # We will create this download route later
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
    """Serves the actual PDF file to the browser."""
    file_path = f"{UPLOAD_DIR}/{filename}"
    
    # Check if the file actually exists on the hard drive
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    # Send the PDF file directly to the user
    return FileResponse(
        path=file_path, 
        media_type="application/pdf", 
        filename=filename
    )


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Deletes a document from the database and removes the file from the hard drive."""
    # 1. Find the document in the database
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # 2. Reconstruct the file path and delete the physical PDF from the uploads folder
    filename = document.file_url.split("/")[-1]
    file_path = f"{UPLOAD_DIR}/{filename}"
    
    if os.path.exists(file_path):
        os.remove(file_path)
        
    # 3. Delete the record from the database
    db.delete(document)
    db.commit()
    
    return {"message": f"Document {document_id} deleted successfully"}