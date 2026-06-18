import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import the optimized documents router
from app.routers import documents

# Force Python to read your .env file locally (Render will use its own environment variables)
load_dotenv()

app = FastAPI(
    title="Academic Portal API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Configuration: Allow frontend to communicate with backend
origins=["http://localhost:3000", "https://academic-portal-git-beta-sumitk2408-s-projects.vercel.app", "https://academic-portal-blush.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the router
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "engine": "supabase-direct"}