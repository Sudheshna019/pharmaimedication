"""Molecular fingerprint featurisation shared by DDI training and inference.

Training (ml/train_ddi.py) and the API (ddi_inference.py) both import this
module so the features are computed identically in both places.
"""
from functools import lru_cache

import numpy as np
from rdkit import Chem, DataStructs, RDLogger
from rdkit.Chem import rdFingerprintGenerator

RDLogger.DisableLog("rdApp.*")

FP_BITS = 1024
FP_RADIUS = 2
_generator = rdFingerprintGenerator.GetMorganGenerator(radius=FP_RADIUS, fpSize=FP_BITS)


@lru_cache(maxsize=8192)
def morgan_fingerprint(smiles: str) -> np.ndarray:
    """Morgan (ECFP4-like) bit vector for one molecule. Invalid SMILES -> all zeros."""
    arr = np.zeros((FP_BITS,), dtype=np.uint8)
    mol = Chem.MolFromSmiles(str(smiles)) if smiles else None
    if mol is None:
        return arr
    DataStructs.ConvertToNumpyArray(_generator.GetFingerprint(mol), arr)
    return arr


def pair_features(smiles_a: str, smiles_b: str) -> np.ndarray:
    """Ordered pair feature vector: [fp(Drug1) | fp(Drug2)]."""
    return np.concatenate([morgan_fingerprint(smiles_a), morgan_fingerprint(smiles_b)]).astype(np.float32)
