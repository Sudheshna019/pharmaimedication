"""ADR inference: per-category adverse-reaction risk from the FAERS-trained XGBoost models,
with exact TreeSHAP feature contributions (XGBoost pred_contribs)."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np
import xgboost as xgb

from backend.services.adr_features import TARGET_LABELS, TARGETS, featurize
from backend.services.drug_normalizer import get_normalizer

LOGGER = logging.getLogger(__name__)
ADR_DIR = Path(__file__).resolve().parent.parent / "ml_artifacts" / "adr"


class ADRInferenceEngine:
    def __init__(self):
        self.spec = json.loads((ADR_DIR / "adr_feature_spec.json").read_text())
        self.spec["index"] = {c: i for i, c in enumerate(self.spec["columns"])}
        self.thresholds = json.loads((ADR_DIR / "adr_thresholds.json").read_text())
        metrics = json.loads((ADR_DIR / "adr_metrics.json").read_text())
        self.base_rates = {t: m["positive_rate"] for t, m in metrics["per_target"].items()}
        self.boosters = {}
        for t in TARGETS:
            b = xgb.Booster()
            b.load_model(str(ADR_DIR / f"adr_xgb_{t}.json"))
            b.set_param({"nthread": 1})
            self.boosters[t] = b
        self.norm = get_normalizer()
        LOGGER.info("ADR engine loaded: %d XGBoost models, %d features", len(self.boosters), len(self.spec["columns"]))

    def feature_label(self, col: str, value: float, age, drug_count: int) -> tuple[str, str]:
        """Human-readable name + category for a model feature."""
        if col == "patient_age":
            return f"Patient Age ({int(age)} yrs)", "Patient Demographics"
        if col in ("sex_female", "sex_male"):
            return ("Female Sex" if col == "sex_female" else "Male Sex"), "Patient Demographics"
        if col == "drug_count":
            return f"Number of Medicines ({drug_count})", "Polypharmacy"
        if col.startswith("drug="):
            return f"{self.norm.display_name(col[5:])} in Regimen", "Medicine"
        if col.startswith("class="):
            return f"{col[6:].replace('_', ' ').title()} Class ({int(value)} drug{'s' if value > 1 else ''})", "Drug Class"
        if col.startswith("sider_prior="):
            label = TARGET_LABELS[col[len('sider_prior='):]].lower()
            return f"Drugs with Known {label.title()} Side Effect (SIDER: {int(value)})", "Prior Knowledge (SIDER)"
        return col, "Other"

    def predict(self, age, sex: str, generics: list[str]) -> dict:
        x = featurize(age, sex.lower(), generics, self.spec, self.norm.drug_class)
        dm = xgb.DMatrix(x.reshape(1, -1))
        risks = {}
        for t in TARGETS:
            prob = float(self.boosters[t].predict(dm)[0])
            risks[t] = {
                "label": TARGET_LABELS[t],
                "probability": round(prob, 4),
                "threshold": round(self.thresholds[t], 4),
                "flagged": prob >= self.thresholds[t],
                "relative_risk": round(prob / max(self.base_rates[t], 1e-6), 2),
                "baseline_rate": round(self.base_rates[t], 4),
            }

        # SHAP explanation for the category with the highest risk relative to baseline
        top = max(TARGETS, key=lambda t: risks[t]["relative_risk"])
        # TreeSHAP only for the explained category (it is the slowest step on small servers)
        contrib = self.boosters[top].predict(dm, pred_contribs=True)[0]
        phi = contrib[:-1]
        cols = self.spec["columns"]
        order = np.argsort(-np.abs(phi))
        shap = []
        for i in order:
            # only explain features that are actually present for this patient
            if abs(phi[i]) < 1e-3 or np.isnan(x[i]) or x[i] == 0:
                continue
            name, cat = self.feature_label(cols[i], float(x[i]), age, len(generics))
            shap.append({"feature": cols[i], "featureName": name, "category": cat,
                         "impactValue": round(float(phi[i]), 3)})
            if len(shap) == 6:
                break
        base = float(contrib[-1])
        summary = {"outcome": TARGET_LABELS[top],
                   "baseProbability": round(1 / (1 + np.exp(-base)), 4),        # model output with no patient info
                   "finalProbability": risks[top]["probability"]}                # = sigmoid(base + sum of all SHAP values)
        return {"risks": risks, "explained_target": top, "explained_label": TARGET_LABELS[top],
                "shap": shap, "shap_base_value": round(base, 3), "summary": summary}


@lru_cache(maxsize=1)
def get_adr_engine() -> ADRInferenceEngine:
    return ADRInferenceEngine()
