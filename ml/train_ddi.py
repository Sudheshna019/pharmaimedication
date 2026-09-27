"""Train the drug-drug interaction (DDI) models.

Two neural networks are trained on Morgan fingerprints of both drugs:

  --task type    86-class interaction-type classifier (DrugBank DDI, the
                 same train/validation/test split used by the old XGBoost model)
  --task detect  binary "do these two drugs interact?" classifier trained on
                 all_ddi_data.csv (419k interacting + 198k non-interacting pairs)

Usage (needs torch + rdkit):
    python -m ml.train_ddi --task type
    python -m ml.train_ddi --task detect
"""
from __future__ import annotations

# torch must be imported before numpy/pandas on Windows, otherwise c10.dll fails to load
import torch
from torch import nn

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, average_precision_score, classification_report,
                             f1_score, precision_score, recall_score, roc_auc_score)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.services.fingerprints import FP_BITS, FP_RADIUS, morgan_fingerprint  # noqa: E402
from ml.paths import DDI_ARTIFACTS, DDI_RAW  # noqa: E402

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
torch.set_num_threads(max(1, torch.get_num_threads()))


def build_fp_table(smiles_series: list[pd.Series]):
    uniq = pd.unique(pd.concat(smiles_series, ignore_index=True).astype(str))
    index = {s: i for i, s in enumerate(uniq)}
    table = np.stack([morgan_fingerprint(s) for s in uniq]).astype(np.float32)
    return index, torch.from_numpy(table)


class PairMLP(nn.Module):
    def __init__(self, in_dim: int, out_dim: int, hidden=(1024, 512), dropout=0.3):
        super().__init__()
        layers, prev = [], in_dim
        for h in hidden:
            layers += [nn.Linear(prev, h), nn.BatchNorm1d(h), nn.ReLU(), nn.Dropout(dropout)]
            prev = h
        layers.append(nn.Linear(prev, out_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


def make_batch(fp, a_idx, b_idx, sel):
    return torch.cat([fp[a_idx[sel]], fp[b_idx[sel]]], dim=1)


def predict(model, fp, a_idx, b_idx, batch=8192):
    model.eval()
    outs = []
    with torch.no_grad():
        for start in range(0, len(a_idx), batch):
            sel = torch.arange(start, min(start + batch, len(a_idx)))
            outs.append(model(make_batch(fp, a_idx, b_idx, sel)))
    return torch.cat(outs)


def export_numpy(model: PairMLP, path: Path, output: str):
    """Fold BatchNorm into the preceding Linear layer and save plain matrices."""
    mods = list(model.net)
    Ws, bs, i = [], [], 0
    while i < len(mods):
        m = mods[i]
        if isinstance(m, nn.Linear):
            W = m.weight.detach().numpy().copy()
            b = m.bias.detach().numpy().copy()
            if i + 1 < len(mods) and isinstance(mods[i + 1], nn.BatchNorm1d):
                bn = mods[i + 1]
                s = (bn.weight / torch.sqrt(bn.running_var + bn.eps)).detach().numpy()
                W = W * s[:, None]
                b = (b - bn.running_mean.numpy()) * s + bn.bias.detach().numpy()
            Ws.append(W.T.astype(np.float32))
            bs.append(b.astype(np.float32))
        i += 1
    arrays = {f"W{k}": w for k, w in enumerate(Ws)} | {f"b{k}": v for k, v in enumerate(bs)}
    np.savez_compressed(path, n_layers=len(Ws), output=output, **arrays)


def train(model, fp, tr, va, loss_fn, score_fn, epochs=40, batch=1024, patience=5, lr=1e-3):
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, mode="max", factor=0.5, patience=2)
    best, best_state, bad = -1.0, None, 0
    n = len(tr[0])
    for epoch in range(1, epochs + 1):
        model.train()
        t0, total = time.time(), 0.0
        perm = torch.randperm(n)
        for start in range(0, n, batch):
            sel = perm[start:start + batch]
            logits = model(make_batch(fp, tr[0], tr[1], sel))
            loss = loss_fn(logits, tr[2][sel])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(sel)
        score = score_fn(predict(model, fp, va[0], va[1]), va[2])
        sched.step(score)
        print(f"epoch {epoch:2d}  loss {total / n:.4f}  val {score:.4f}  ({time.time() - t0:.0f}s)", flush=True)
        if score > best + 1e-4:
            best, bad = score, 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                print("early stopping", flush=True)
                break
    model.load_state_dict(best_state)
    return best


def to_idx(df, index, c1, c2):
    return (torch.tensor(df[c1].astype(str).map(index).values),
            torch.tensor(df[c2].astype(str).map(index).values))


def run_type():
    tr = pd.read_csv(DDI_RAW / "drugbank_training.csv")
    va = pd.read_csv(DDI_RAW / "drugbank_validation.csv")
    te = pd.read_csv(DDI_RAW / "drugbank_test (1).csv")
    print(f"train {len(tr)}  val {len(va)}  test {len(te)}  classes {tr['type'].nunique()}")
    index, fp = build_fp_table([tr.smiles1, tr.smiles2, va.smiles1, va.smiles2, te.smiles1, te.smiles2])

    def pack(df):
        a, b = to_idx(df, index, "smiles1", "smiles2")
        return a, b, torch.tensor(df["type"].values, dtype=torch.long)

    TR, VA, TE = pack(tr), pack(va), pack(te)
    n_classes = 86
    model = PairMLP(2 * FP_BITS, n_classes)
    acc = lambda logits, y: accuracy_score(y.numpy(), logits.argmax(1).numpy())
    train(model, fp, TR, VA, nn.CrossEntropyLoss(), acc)

    y_true = TE[2].numpy()
    y_pred = predict(model, fp, TE[0], TE[1]).argmax(1).numpy()
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    old = json.loads((DDI_ARTIFACTS / "previous_xgboost_test_evaluation.json").read_text()) \
        if (DDI_ARTIFACTS / "previous_xgboost_test_evaluation.json").exists() else {}
    metrics = {
        "model": f"MLP ({2 * FP_BITS}-1024-512-{n_classes}) on Morgan r={FP_RADIUS} {FP_BITS}-bit fingerprints",
        "dataset": "DrugBank DDI (86 interaction types), official train/validation/test split",
        "n_train": int(len(tr)), "n_validation": int(len(va)), "n_test": int(len(te)),
        "test_accuracy": float(accuracy_score(y_true, y_pred)),
        "test_macro_f1": float(f1_score(y_true, y_pred, average="macro")),
        "test_weighted_f1": float(f1_score(y_true, y_pred, average="weighted")),
        "test_macro_precision": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "test_macro_recall": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "previous_xgboost_baseline": {
            "test_accuracy": old.get("accuracy"),
            "test_macro_f1": old.get("macro avg", {}).get("f1-score"),
            "test_weighted_f1": old.get("weighted avg", {}).get("f1-score"),
        },
        "classification_report": report,
    }
    (DDI_ARTIFACTS / "ddi_type_metrics.json").write_text(json.dumps(metrics, indent=2))
    export_numpy(model, DDI_ARTIFACTS / "ddi_type_mlp.npz", "softmax")
    check_export(model, fp, TE, DDI_ARTIFACTS / "ddi_type_mlp.npz")
    print(json.dumps({k: v for k, v in metrics.items() if k != "classification_report"}, indent=2))


def run_detect():
    df = pd.read_csv(DDI_RAW / "all_ddi_data.csv").dropna()
    df = df.drop_duplicates(subset=["smiles_1", "smiles_2"])
    rng = np.random.default_rng(SEED)
    perm = rng.permutation(len(df))
    n_te = n_va = int(0.1 * len(df))
    te, va, tr = df.iloc[perm[:n_te]], df.iloc[perm[n_te:n_te + n_va]], df.iloc[perm[n_te + n_va:]]
    print(f"train {len(tr)}  val {len(va)}  test {len(te)}  positive rate {df.label.mean():.3f}")
    index, fp = build_fp_table([df.smiles_1, df.smiles_2])

    def pack(d):
        a, b = to_idx(d, index, "smiles_1", "smiles_2")
        return a, b, torch.tensor(d["label"].values, dtype=torch.float32)

    TR, VA, TE = pack(tr), pack(va), pack(te)
    model = PairMLP(2 * FP_BITS, 1)
    bce = nn.BCEWithLogitsLoss()
    loss_fn = lambda logits, y: bce(logits[:, 0], y)
    auc = lambda logits, y: roc_auc_score(y.numpy(), logits[:, 0].numpy())
    train(model, fp, TR, VA, loss_fn, auc, epochs=25, batch=2048)

    prob = torch.sigmoid(predict(model, fp, TE[0], TE[1])[:, 0]).numpy()
    y = TE[2].numpy().astype(int)
    pred = (prob >= 0.5).astype(int)
    metrics = {
        "model": f"MLP ({2 * FP_BITS}-1024-512-1) on Morgan r={FP_RADIUS} {FP_BITS}-bit fingerprints",
        "dataset": "all_ddi_data.csv (interacting vs non-interacting drug pairs), random 80/10/10 split",
        "n_train": int(len(tr)), "n_validation": int(len(va)), "n_test": int(len(te)),
        "test_accuracy": float(accuracy_score(y, pred)),
        "test_roc_auc": float(roc_auc_score(y, prob)),
        "test_pr_auc": float(average_precision_score(y, prob)),
        "test_f1": float(f1_score(y, pred)),
        "test_precision": float(precision_score(y, pred)),
        "test_recall": float(recall_score(y, pred)),
        "threshold": 0.5,
    }
    (DDI_ARTIFACTS / "ddi_detect_metrics.json").write_text(json.dumps(metrics, indent=2))
    export_numpy(model, DDI_ARTIFACTS / "ddi_detect_mlp.npz", "sigmoid")
    check_export(model, fp, TE, DDI_ARTIFACTS / "ddi_detect_mlp.npz")
    print(json.dumps(metrics, indent=2))


def check_export(model, fp, split, path):
    from backend.services.mlp_numpy import NumpyMLP
    sel = torch.arange(min(2000, len(split[0])))
    x = make_batch(fp, split[0], split[1], sel)
    model.eval()
    with torch.no_grad():
        ref = model(x)
    ref = torch.softmax(ref, 1).numpy() if ref.shape[1] > 1 else torch.sigmoid(ref[:, 0]).numpy()
    got = NumpyMLP(path).predict_proba(x.numpy())
    print(f"export check: max abs diff {np.abs(ref - got).max():.2e}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", choices=["type", "detect"], required=True)
    args = ap.parse_args()
    run_type() if args.task == "type" else run_detect()
