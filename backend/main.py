"""PharmAI ML service (FastAPI).

Run from the project root:
    uvicorn backend.main:app --port 8000
"""
import os

# Free hosting tiers give a fraction of one CPU; many BLAS / OpenMP threads then fight each
# other and make every prediction ~100x slower. Use one thread (must be set before numpy loads).
for _var in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(_var, "1")

import logging  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import analysis
from backend.services.adr_inference import get_adr_engine
from backend.services.ddi_inference import get_ddi_engine
from backend.services.drug_normalizer import get_normalizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="PharmAI ML Service",
    version="3.0.0",
    description="Drug-drug interaction and adverse drug reaction prediction "
                "(PyTorch-trained MLPs on Morgan fingerprints, XGBoost on FAERS, TreeSHAP).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api/v1")


@app.on_event("startup")
def load_models():
    """Load all models once at startup so the first request is fast."""
    get_normalizer()
    get_ddi_engine()
    get_adr_engine()


@app.get("/")
def root():
    return {"service": "PharmAI ML Service", "status": "online", "docs": "/docs"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "drugs_in_vocabulary": len(get_normalizer().drugs),
        "ddi_models": ["interaction detector (MLP)", "interaction type classifier (MLP, 86 classes)"],
        "adr_models": len(get_adr_engine().boosters),
    }
