import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.routers import auth, ocr, analysis, knowledge_base, reports

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production REST API server powered by FastAPI, Scikit-learn, XGBoost, SHAP, AWS Textract, and Firebase."
)

# Robust CORS Middleware supporting local dev origins, credentials, and preflights
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]
for extra_origin in getattr(settings, 'ALLOWED_ORIGINS', []):
    if extra_origin not in allowed_origins:
        allowed_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600
)

from backend.services.textract_ocr import textract_service
from backend.services.adr_inference import load_hybrid_system

@app.on_event("startup")
def prewarm_ml_models():
    """Pre-load ML models & EasyOCR weights into RAM at server startup to eliminate HTTP request timeouts."""
    try:
        load_hybrid_system()
        textract_service._init_reader()
    except Exception as e:
        print(f"Model pre-warm notice: {e}")

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(ocr.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(knowledge_base.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "FastAPI Backend Engine"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.main("backend.main:app", host="127.0.0.1", port=8000, reload=True)