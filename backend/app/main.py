from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# --- Database Auto-Creation Imports ---
from app.database import engine
from app.models.academic import Base
# --------------------------------------

from app.routers import documents

from dotenv import load_dotenv

# This forces Python to read your .env file immediately
load_dotenv()


# 2. Recreate them perfectly with all new columns
Base.metadata.create_all(bind=engine)
# ------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "env": settings.APP_ENV}