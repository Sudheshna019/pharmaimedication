"""DDI Inference Engine: Predict Interactions from Drug SMILES."""
import json
import logging
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from rdkit import Chem
from rdkit.Chem import rdFingerprintGenerator
from rdkit import RDLogger

# Silence RDKit warnings for clean API output
RDLogger.DisableLog('rdApp.*')
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOGGER = logging.getLogger(__name__)

# Paths
# Dynamically locate the ml_artifacts/ddi directory
BASE_DIR = Path(__file__).resolve().parent.parent
DDI_ARTIFACTS_DIR = BASE_DIR / "ml_artifacts" / "ddi"

MODEL_PATH = DDI_ARTIFACTS_DIR / "ddi_xgboost_multiclass.pkl"
LABEL_MAP_PATH = DDI_ARTIFACTS_DIR / "ddi_label_map.json"
INFO_PATH = DDI_ARTIFACTS_DIR / "Interaction_information.csv"

FP_SIZE = 512
# Initialize Morgan Generator
morgan_gen = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=FP_SIZE)

class DDIInferenceEngine:
    def __init__(self):
        LOGGER.info("Initializing DDI Inference Engine...")
        self.model = joblib.load(MODEL_PATH)
        
        # Load the label map to translate XGBoost predictions back to original DDI types
        with open(LABEL_MAP_PATH, "r") as f:
            reverse_map_str = json.load(f)
            self.index_to_type = {int(new): int(orig) for new, orig in reverse_map_str.items()}
            
        # Load the human-readable FDA interaction descriptions
        self.interaction_info = {}
        if INFO_PATH.exists():
            df_info = pd.read_csv(INFO_PATH)
            for _, row in df_info.iterrows():
                self.interaction_info[int(row['Interaction type'])] = row['Description']
        else:
            LOGGER.warning(f"Info file not found at {INFO_PATH}. Descriptions will be missing.")

    def _get_morgan_fingerprint(self, smiles: str) -> np.ndarray:
        """Internal helper to convert SMILES to binary arrays."""
        try:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return np.zeros(FP_SIZE, dtype=np.int8)
            fp = morgan_gen.GetFingerprint(mol)
            arr = np.zeros((1,), dtype=np.int8)
            Chem.DataStructs.ConvertToNumpyArray(fp, arr)
            return arr
        except Exception:
            return np.zeros(FP_SIZE, dtype=np.int8)

    def predict_interaction(self, smiles_a: str, smiles_b: str) -> dict:
        """Predicts the interaction between two chemical structures."""
        # 1. Canonical Sorting (Crucial to prevent A+B / B+A leakage)
        s1, s2 = str(smiles_a).strip(), str(smiles_b).strip()
        if s1 > s2:
            s1, s2 = s2, s1
            
        # 2. Extract Features
        fp1 = self._get_morgan_fingerprint(s1)
        fp2 = self._get_morgan_fingerprint(s2)
        X_input = np.concatenate([fp1, fp2]).reshape(1, -1)
        
        # 3. Predict using XGBoost
        probas = self.model.predict_proba(X_input)[0]
        pred_idx = int(np.argmax(probas))
        confidence = float(probas[pred_idx])
        
        # 4. Map to human-readable explanation
        orig_type = self.index_to_type[pred_idx]
        description = self.interaction_info.get(orig_type, "No description available.")
        
        return {
            "predicted_type": orig_type,
            "confidence": round(confidence, 4),
            "description": description
        }

if __name__ == "__main__":
    engine = DDIInferenceEngine()
    
    # Test with the exact SMILES strings from your DDI Audit
    test_smiles_1 = "CC1=CC2=CC3=C(OC(=O)C=C3C)C(C)=C2O1"
    test_smiles_2 = "COC(=O)CCC1=C2NC(\\C=C3/N=C(/C=C4\\N\\C(=C/C5=N/C(=C\\2)/C(CCC(O)=O)=C5C)C(C=C)=C4C)C2=CC=C([C@@H](C(=O)OC)[C@@]32C)C(=O)OC)=C1C"
    
    LOGGER.info("Running test prediction...")
    result = engine.predict_interaction(test_smiles_1, test_smiles_2)
    
    print("\n" + "="*50)
    print("⚕️  DDI PREDICTION RESULT")
    print("="*50)
    print(f"Interaction Type : Type {result['predicted_type']}")
    print(f"Model Confidence : {result['confidence']*100:.2f}%")
    print(f"Clinical Warning : {result['description']}")
    print("="*50 + "\n")