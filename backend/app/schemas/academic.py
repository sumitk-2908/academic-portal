from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.academic import DocCategory, ReviewStatus

# Data required to create a new document
class DocumentCreate(BaseModel):
    title: str
    category: DocCategory
    module_id: int
    uploaded_by: Optional[str] = None

# The data FastAPI will send back to your frontend
class DocumentResponse(BaseModel):
    id: int
    title: str
    category: DocCategory
    file_url: str
    uploaded_by: Optional[str]
    status: ReviewStatus
    created_at: datetime
    module_id: int

    # This tells Pydantic to read data directly from your SQLAlchemy database models
    model_config = ConfigDict(from_attributes=True)