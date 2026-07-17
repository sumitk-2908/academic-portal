import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- SlowAPI Imports ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import the optimized documents router
from app.routers import documents, users
from app.config import settings
import sentry_sdk

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
    )

# Force Python to read your .env file locally (Render will use its own environment variables)
load_dotenv()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Academic Portal API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration: Allow frontend to communicate with backend
origins=settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Mount the routers
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

@app.get("/health", tags=["Health"])
@limiter.limit("20/minute")
async def health_check(request: Request):
    return {"status": "healthy", "version": "1.0.0", "engine": "supabase-direct"}