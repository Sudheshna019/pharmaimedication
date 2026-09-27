"""
PharmAI - live model evaluation and inference demo (for the project review).

Everything printed here is computed now from the saved models:
  1. re-evaluates the DDI models on the held-out DrugBank test set
  2. re-evaluates the ADR models on the held-out FAERS test split
  3. runs the full prediction pipeline on example prescriptions

Run from the project root:
    backend\\.venv\\Scripts\\python run_ml_eval.py        (Windows)
    backend/.venv/bin/python run_ml_eval.py             (Linux / macOS)

The raw datasets are read from TRAINING_DATA_DIR (default: the local training folder).
If they are not available, the stored test metrics are shown instead.
"""
import ast
import csv
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from backend.services.adr_features import TARGETS, categories_of, featurize  # noqa: E402
from backend.services.adr_inference import get_adr_engine  # noqa: E402
from backend.services.ddi_inference import get_ddi_engine  # noqa: E402
from backend.services.drug_normalizer import get_normalizer  # noqa: E402
from backend.services.fingerprints import pair_features  # noqa: E402

RAW = Path(os.getenv("TRAINING_DATA_DIR", "C:/Users/91970/Desktop/training/data/raw"))
FAERS = Path(os.getenv("FAERS_FEATURES_CSV", str(RAW.parent / "processed" / "features_dataset.csv")))
ART = ROOT / "backend" / "ml_artifacts"


def header(title):
    print("\n" + "=" * 78 + f"\n {title}\n" + "=" * 78)


def roc_auc(y, p):
    """ROC-AUC via the Mann-Whitney rank statistic (no sklearn needed)."""
    y, p = np.asarray(y), np.asarray(p)
    _, inverse, counts = np.unique(p, return_inverse=True, return_counts=True)
    upper = np.cumsum(counts)                         # tied scores share their average rank
    ranks = (upper - (counts - 1) / 2.0)[inverse]
    n_pos, n_neg = y.sum(), len(y) - y.sum()
    return (ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)


def average_precision(y, p):
    """PR-AUC (average precision), same definition as sklearn."""
    order = np.argsort(-np.asarray(p), kind="mergesort")
    y = np.asarray(y)[order]
    tp = np.cumsum(y)
    precision = tp / np.arange(1, len(y) + 1)
    return float((precision * y).sum() / max(y.sum(), 1))


def prf(y, pred):
    """Precision, recall, F1 for binary 0/1 labels."""
    tp = int(np.sum((pred == 1) & (y == 1)))
    fp = int(np.sum((pred == 1) & (y == 0)))
    fn = int(np.sum((pred == 0) & (y == 1)))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


def multiclass_report(y, pred):
    """Accuracy + macro / weighted precision, recall, F1 over all classes present in y."""
    rows = []
    for c in np.unique(y):
        p_, r_, f_ = prf((y == c).astype(int), (pred == c).astype(int))
        rows.append((int(c), p_, r_, f_, int(np.sum(y == c))))
    support = np.array([r[4] for r in rows])
    arr = np.array([[r[1], r[2], r[3]] for r in rows])
    return {
        "accuracy": float((pred == y).mean()),
        "macro": arr.mean(axis=0),
        "weighted": (arr * support[:, None]).sum(axis=0) / support.sum(),
        "per_class": rows,
    }


def batched_predict(model, pairs, batch=5000):
    out = []
    for i in range(0, len(pairs), batch):
        X = np.stack([pair_features(a, b) for a, b in pairs[i:i + batch]])
        out.append(model.predict_proba(X))
    return np.concatenate(out)


def eval_ddi():
    header("1. DRUG-DRUG INTERACTION (DDI) MODELS")
    test = RAW / "DDi" / "drugbank_test (1).csv"
    stored = json.loads((ART / "ddi" / "ddi_type_metrics.json").read_text())
    detect = json.loads((ART / "ddi" / "ddi_detect_metrics.json").read_text())
    base = stored["previous_xgboost_baseline"]
    engine = get_ddi_engine()

    print("\n  (a) Interaction-TYPE classifier - MLP, 86 DrugBank interaction types")
    if not test.exists():
        print(f"      raw data not found at {test} - stored test results:")
        print(f"      accuracy {stored['test_accuracy'] * 100:.2f}%   macro F1 {stored['test_macro_f1']:.4f}")
    else:
        with open(test, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        t0 = time.time()
        pred = batched_predict(engine.typer, [(r["smiles1"], r["smiles2"]) for r in rows]).argmax(1)
        y = np.array([int(r["type"]) for r in rows])
        rep = multiclass_report(y, pred)
        print(f"      test pairs          : {len(rows):,}   (computed now in {time.time() - t0:.1f} s)")
        print(f"      ACCURACY            : {rep['accuracy'] * 100:.2f}%")
        print(f"      macro    precision {rep['macro'][0]:.4f}   recall {rep['macro'][1]:.4f}   F1 {rep['macro'][2]:.4f}")
        print(f"      weighted precision {rep['weighted'][0]:.4f}   recall {rep['weighted'][1]:.4f}   F1 {rep['weighted'][2]:.4f}")
        print("      5 largest classes:")
        for c, p_, r_, f_, n in sorted(rep["per_class"], key=lambda r: -r[4])[:5]:
            print(f"        class {c:2d}  support {n:6,}   precision {p_:.3f}  recall {r_:.3f}  F1 {f_:.3f}")
    print(f"      previous XGBoost model: accuracy {base['test_accuracy'] * 100:.2f}%   macro F1 {base['test_macro_f1']:.4f}")

    print("\n  (b) Interaction DETECTOR - MLP, 'do these two drugs interact?' (yes / no)")
    all_ddi = RAW / "DDi" / "all_ddi_data.csv"
    if not all_ddi.exists():
        print(f"      raw data not found - stored test results: accuracy {detect['test_accuracy'] * 100:.2f}%  "
              f"F1 {detect['test_f1']:.4f}  ROC-AUC {detect['test_roc_auc']:.4f}")
        return
    t0 = time.time()
    seen, data = set(), []
    with open(all_ddi, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):                       # same cleaning + split as ml/train_ddi.py
            if not (r["label"] and r["smiles_1"] and r["smiles_2"]):
                continue
            key = (r["smiles_1"], r["smiles_2"])
            if key in seen:
                continue
            seen.add(key)
            data.append((r["smiles_1"], r["smiles_2"], int(float(r["label"]))))
    perm = np.random.default_rng(42).permutation(len(data))
    te = [data[i] for i in perm[: int(0.1 * len(data))]]
    prob = batched_predict(engine.detector, [(a, b) for a, b, _ in te])
    y = np.array([l for _, _, l in te])
    pred = (prob >= 0.5).astype(int)
    p_, r_, f_ = prf(y, pred)
    print(f"      test pairs          : {len(te):,}   (computed now in {time.time() - t0:.1f} s)")
    print(f"      ACCURACY            : {(pred == y).mean() * 100:.2f}%")
    print(f"      precision {p_:.4f}   recall {r_:.4f}   F1 {f_:.4f}")
    print(f"      ROC-AUC {roc_auc(y, prob):.4f}   PR-AUC {average_precision(y, prob):.4f}")


def eval_adr():
    header("2. ADVERSE DRUG REACTION (ADR) MODELS - 8 XGBoost classifiers")
    metrics = json.loads((ART / "adr" / "adr_metrics.json").read_text())
    if not FAERS.exists():
        print(f"  (FAERS data not found at {FAERS} - showing stored test metrics)")
        for t, m in metrics["per_target"].items():
            print(f"  {t:22s} ROC-AUC {m['test_roc_auc']:.3f}  F1 {m['test_f1']:.3f}")
        return
    engine, norm = get_adr_engine(), get_normalizer()
    with open(FAERS, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    parse = lambda s: [str(x).strip().lower() for x in ast.literal_eval(s)] if s.startswith("[") else []
    drugs = [sorted({g for raw in parse(r["drug_names"]) for g in norm.normalize_faers(raw)}) for r in rows]
    Y = np.array([[int(t in categories_of(parse(r["reaction_list"]))) for t in TARGETS] for r in rows])
    X = np.stack([featurize(float(r["patient_age"] or 0), r["biological_sex"].lower(), d, engine.spec, norm.drug_class)
                  for r, d in zip(rows, drugs)])
    perm = np.random.default_rng(42).permutation(len(rows))      # same split as ml/train_adr.py
    te = perm[: int(0.15 * len(rows))]
    import xgboost as xgb
    dm = xgb.DMatrix(X[te])
    print(f"  Test reports: {len(te):,} FAERS reports (never used in training)\n")
    names = ["ROC-AUC", "PR-AUC", "Precis.", "Recall", "F1", "Accur."]
    print(f"  {'ADR category':20s}" + "".join(f"{n:>9s}" for n in names) + f"{'old AUC':>9s}")
    cols = []
    for j, t in enumerate(TARGETS):
        prob = engine.boosters[t].predict(dm)
        y = Y[te, j]
        pred = (prob >= engine.thresholds[t]).astype(int)
        p_, r_, f_ = prf(y, pred)
        vals = [roc_auc(y, prob), average_precision(y, prob), p_, r_, f_, float((pred == y).mean())]
        cols.append(vals)
        old = metrics["per_target"][t]["previous_model_test_roc_auc"]
        print(f"  {t[4:]:20s}" + "".join(f"{v:9.3f}" for v in vals) + f"{old:9.3f}")
    m = np.mean(cols, axis=0)
    print(f"  {'MACRO AVERAGE':20s}" + "".join(f"{v:9.3f}" for v in m)
          + f"{metrics['previous_model_macro_test_roc_auc']:9.3f}")
    print("\n  Note: accuracy looks high because most reports do not contain a given reaction;")
    print("  ROC-AUC and F1 are the meaningful measures for these rare, imbalanced outcomes.")


def demo():
    header("3. LIVE PREDICTIONS ON EXAMPLE PRESCRIPTIONS")
    from backend.routers.analysis import PredictRequest, predict_interaction_risk
    cases = [
        ("Warfarin + Aspirin (72 y, F)", 72, "Female", ["Warfarin 5mg", "Aspirin 81mg"]),
        ("Combiflam + Pantocid (49 y, F)", 49, "Female", ["Combiflam", "Pantocid 40mg"]),
        ("Dolo 650 + Combiflam - duplicate paracetamol", 30, "Male", ["Dolo 650", "Combiflam"]),
        ("Montelukast + Cetirizine (35 y, F)", 35, "Female", ["Montelukast 10mg", "Cetirizine 10mg"]),
    ]
    for title, age, sex, meds in cases:
        req = PredictRequest(patientData={"age": age, "gender": sex},
                             medications=[{"name": m} for m in meds])
        d = predict_interaction_risk(req)["data"]
        print(f"\n  {title}\n  -> overall risk: {d['overallRiskLevel']}")
        for x in d["drugInteractions"]:
            p = x["evidence"]["mlInteractionProbability"]
            print(f"     [{x['severity']}] {x['med1']} + {x['med2']}  ({x['evidence']['source']}"
                  f"{'' if p is None else f', ML p={p:.3f}'})")
        flagged = [f"{r['label']} {r['probability'] * 100:.1f}%" for r in d["adrPredictions"].values() if r["flagged"]]
        print(f"     ADR flagged: {', '.join(flagged) or 'none'}")


if __name__ == "__main__":
    print("#" * 78 + "\n#  PharmAI - drug interaction & adverse reaction prediction: live evaluation\n" + "#" * 78)
    eval_ddi()
    eval_adr()
    demo()
    print()
