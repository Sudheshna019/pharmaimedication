"""Dependency-free inference for the MLP models trained in ml/train_ddi.py.

The networks are trained with PyTorch, then BatchNorm is folded into the
linear layers and the weights are exported to .npz, so the API only needs
NumPy at runtime (keeps the deployment small enough for free hosting tiers).
"""
from pathlib import Path

import numpy as np


class NumpyMLP:
    def __init__(self, path: Path):
        data = np.load(path)
        n_layers = int(data["n_layers"])
        self.weights = [data[f"W{i}"].astype(np.float32) for i in range(n_layers)]
        self.biases = [data[f"b{i}"].astype(np.float32) for i in range(n_layers)]
        self.output = str(data["output"])  # "softmax" or "sigmoid"

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        h = np.atleast_2d(X).astype(np.float32)
        last = len(self.weights) - 1
        for i, (W, b) in enumerate(zip(self.weights, self.biases)):
            h = h @ W + b
            if i < last:
                np.maximum(h, 0, out=h)
        if self.output == "softmax":
            h = h - h.max(axis=1, keepdims=True)
            e = np.exp(h)
            return e / e.sum(axis=1, keepdims=True)
        return 1.0 / (1.0 + np.exp(-h[:, 0]))
