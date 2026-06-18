from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import documents
from dotenv import load_dotenv
import os

# Force Python to read your .env file locally (Render will use its own environment variables)
load_dotenv()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Configuration: Allow Vercel frontend to communicate with Render backend
app.add_middleware(
    CORSMiddleware,
    # Change ["*"] to your actual Vercel domain later for strict security: ["https://your-app.vercel.app"]
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}