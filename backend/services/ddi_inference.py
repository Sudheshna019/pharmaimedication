"""DDI inference: interaction detection + interaction-type prediction from chemical structure.

Models (trained by ml/train_ddi.py, stored in ml_artifacts/ddi/):
  ddi_detect_mlp.npz  P(the two drugs interact)
  ddi_type_mlp.npz    which of the 86 DrugBank interaction types it is
Plus a lookup of interactions recorded in the DrugBank dataset for the known drugs.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np

from backend.services.drug_normalizer import get_normalizer
from backend.services.fingerprints import pair_features
from backend.services.mlp_numpy import NumpyMLP

LOGGER = logging.getLogger(__name__)
ARTIFACTS = Path(__file__).resolve().parent.parent / "ml_artifacts"
DDI_DIR = ARTIFACTS / "ddi"
KB_DIR = ARTIFACTS / "knowledge"

# Probability above which the detector reports an interaction
DETECT_THRESHOLD = 0.5


class DDIInferenceEngine:
    def __init__(self):
        self.detector = NumpyMLP(DDI_DIR / "ddi_detect_mlp.npz")
        self.typer = NumpyMLP(DDI_DIR / "ddi_type_mlp.npz")
        self.types = json.loads((KB_DIR / "ddi_types.json").read_text())
        self.known = json.loads((KB_DIR / "drugbank_known_pairs.json").read_text())
        self.norm = get_normalizer()
        LOGGER.info("DDI engine loaded: detector + 86-class type model, %d DrugBank-recorded pairs", len(self.known))

    def describe(self, cls: int, drug1: str, drug2: str) -> str:
        text = self.types[str(cls)]["description"]
        return text.replace("#Drug1", drug1).replace("#Drug2", drug2)

    def predict_pair(self, g1: str, g2: str) -> dict | None:
        """Predict the interaction between two generic drugs. None if a structure is missing."""
        s1, s2 = self.norm.smiles(g1), self.norm.smiles(g2)
        if not s1 or not s2:
            return None
        n1, n2 = self.norm.display_name(g1), self.norm.display_name(g2)

        X = np.stack([pair_features(s1, s2), pair_features(s2, s1)])
        p_detect = float(self.detector.predict_proba(X).mean())  # symmetric: average both orders
        type_probs = self.typer.predict_proba(X)
        order = int(type_probs.max(axis=1).argmax())             # direction the model is most sure about
        cls = int(type_probs[order].argmax())
        conf = float(type_probs[order, cls])
        drug1, drug2 = (n1, n2) if order == 0 else (n2, n1)
        affected = g2 if order == 0 else g1          # the drug named "#Drug2" (whose level/effect changes)

        result = {
            "interaction_probability": round(p_detect, 4),
            "interacts": p_detect >= DETECT_THRESHOLD,
            "predicted_type": cls,
            "type_confidence": round(conf, 4),
            "type_severity": self.types[str(cls)]["severity"],
            "description": self.describe(cls, drug1, drug2),
            "affected_drug": affected,
            "known_in_drugbank": False,
        }

        db1, db2 = self.norm.drugbank_id(g1), self.norm.drugbank_id(g2)
        if db1 and db2:
            for a, b, na, nb, gb in ((db1, db2, n1, n2, g2), (db2, db1, n2, n1, g1)):
                known_type = self.known.get(f"{a}|{b}")
                if known_type is not None:
                    result.update(known_in_drugbank=True, known_type=known_type, known_affected_drug=gb,
                                  known_severity=self.types[str(known_type)]["severity"],
                                  known_description=self.describe(known_type, na, nb))
                    break
        return result


@lru_cache(maxsize=1)
def get_ddi_engine() -> DDIInferenceEngine:
    return DDIInferenceEngine()
