"""Inference module for the Hybrid Clinical Decision Support System."""
from __future__ import annotations

import json
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any

from backend.services.feature_engineering import _count_keyword_matches, _compile_keyword_sets, _derive_clinical_severity
logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

import functools

# Dynamically locate the ml_artifacts/adr directory
BASE_DIR = Path(__file__).resolve().parent.parent
ADR_ARTIFACTS_DIR = BASE_DIR / "ml_artifacts" / "adr"

BEST_MODEL_PATH = ADR_ARTIFACTS_DIR / "binary_relevance_models.pkl"
FEATURE_COLUMNS_PATH = ADR_ARTIFACTS_DIR / "feature_columns.json"
TARGET_COLUMNS_PATH = ADR_ARTIFACTS_DIR / "target_columns.json"

@functools.lru_cache(maxsize=1)
def load_hybrid_system():
    LOGGER.info("Loading ADR Hybrid System models into memory...")
    model = joblib.load(BEST_MODEL_PATH)
    with open(FEATURE_COLUMNS_PATH, "r") as f: features = json.load(f)
    with open(TARGET_COLUMNS_PATH, "r") as f: targets = json.load(f)
    return model, features, targets

def evaluate_prescription(age: float, sex: str, renal_egfr: float | None, drug_names: list[str]) -> dict[str, Any]:
    model_data, features, targets = load_hybrid_system()
    keywords = _compile_keyword_sets()
    
    drugs_str = ", ".join([str(d).lower() for d in drug_names])
    high_risk_count = _count_keyword_matches(drugs_str, keywords.get("blood_thinners", []))
    mod_risk_count = _count_keyword_matches(drugs_str, keywords.get("nsaids", []))
    
    severity_str = _derive_clinical_severity(high_risk_count, mod_risk_count, int(age))
    
    reasons = []
    if high_risk_count >= 2: reasons.append("Multiple Anticoagulant / Antiplatelet Synergy Detected")
    if mod_risk_count >= 2: reasons.append("Multiple NSAID Co-prescription Risk")
    
    expert_system_output = {
        "ddi_detected": bool(high_risk_count > 0 or mod_risk_count > 0),
        "severity_class": severity_str.upper(),
        "clinical_reasons": reasons if reasons else ["General Pharmacokinetic Baseline"]
    }

    # Build feature dictionary matching feature_columns.json
    X_dict = {
        "patient_age": age,
        "biological_sex": str(sex).lower(),
        "renal_egfr": renal_egfr if renal_egfr is not None else np.nan,
        "renal_impairment": int(renal_egfr is not None and renal_egfr < 60),
        "egfr_missing": int(renal_egfr is None),
        "drug_count": len(drug_names),
        "drug_pair_count": int(len(drug_names) * max(0, len(drug_names) - 1) / 2),
        "geriatric_flag": int(age >= 65),
        "bleeding_synergy": int(high_risk_count > 0),
        "raas_inhibition": int(_count_keyword_matches(drugs_str, ["lisinopril", "losartan", "ramipril", "enalapril", "valsartan"]) > 0),
        "qt_prolongation": int(_count_keyword_matches(drugs_str, ["amiodarone", "sotalol", "haloperidol", "citalopram", "azithromycin", "methadone"]) > 0),
        "hyperkalemia_risk": int(_count_keyword_matches(drugs_str, ["spironolactone", "eplerenone", "triamterene", "kcl", "potassium"]) > 0),
        "nephrotoxicity": int(_count_keyword_matches(drugs_str, ["gentamicin", "vancomycin", "furosemide", "ibuprofen", "naproxen"]) > 0),
        "cyp450_interaction": int(_count_keyword_matches(drugs_str, ["omeprazole", "fluconazole", "ketoconazole", "clarithromycin", "erythromycin"]) > 0),
        "bleeding_med_count": high_risk_count,
        "raas_med_count": int(_count_keyword_matches(drugs_str, ["lisinopril", "losartan", "ramipril", "enalapril", "valsartan"])),
        "qt_med_count": int(_count_keyword_matches(drugs_str, ["amiodarone", "sotalol", "haloperidol", "citalopram", "azithromycin", "methadone"])),
        "hyperk_med_count": int(_count_keyword_matches(drugs_str, ["spironolactone", "eplerenone", "triamterene", "kcl", "potassium"])),
        "nephro_med_count": int(_count_keyword_matches(drugs_str, ["gentamicin", "vancomycin", "furosemide", "ibuprofen", "naproxen"])),
        "cyp_med_count": int(_count_keyword_matches(drugs_str, ["omeprazole", "fluconazole", "ketoconazole", "clarithromycin", "erythromycin"])),
        "matched_sider_drug_count": len(drug_names)
    }
    
    X_df = pd.DataFrame([X_dict]).reindex(columns=features)
    
    adr_predictions = {}
    for target_name in targets:
        clean_name = target_name.replace("adr_", "").replace("_", " ").title()
        if isinstance(model_data, dict) and target_name in model_data:
            target_info = model_data[target_name]
            pipeline = target_info["pipeline"] if isinstance(target_info, dict) else target_info
            prob = float(pipeline.predict_proba(X_df)[0][1])
        else:
            prob = 0.05
        adr_predictions[clean_name] = f"{prob * 100:.1f}%"
        
    sorted_adrs = dict(sorted(adr_predictions.items(), key=lambda item: float(item[1].strip('%')), reverse=True))

    return {
        "rule_based_ddi_analysis": expert_system_output,
        "machine_learning_adr_predictions": sorted_adrs,
        "patient_risk_factors": X_dict
    }

if __name__ == "__main__":
    res = evaluate_prescription(72, "male", 45.0, ["warfarin", "aspirin", "lisinopril"])
    print(json.dumps(res, indent=2))