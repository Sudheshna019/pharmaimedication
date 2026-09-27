"""Shared paths for the offline training scripts.

The raw datasets are large, so they are not stored in this repository.
Point TRAINING_DATA_DIR at the folder that contains the raw data
(the folder with the DDi/, fears/ and sider/ sub-folders).
"""
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

RAW_DIR = Path(os.getenv("TRAINING_DATA_DIR", "C:/Users/91970/Desktop/training/data/raw"))
DDI_RAW = RAW_DIR / "DDi"
SIDER_RAW = RAW_DIR / "sider"
FAERS_PROCESSED = Path(os.getenv(
    "FAERS_FEATURES_CSV",
    str(RAW_DIR.parent / "processed" / "features_dataset.csv"),
))

ARTIFACTS = PROJECT_ROOT / "backend" / "ml_artifacts"
DDI_ARTIFACTS = ARTIFACTS / "ddi"
ADR_ARTIFACTS = ARTIFACTS / "adr"
KB_ARTIFACTS = ARTIFACTS / "knowledge"
SHARED_DIR = PROJECT_ROOT / "shared"

for d in (DDI_ARTIFACTS, ADR_ARTIFACTS, KB_ARTIFACTS, SHARED_DIR):
    d.mkdir(parents=True, exist_ok=True)
