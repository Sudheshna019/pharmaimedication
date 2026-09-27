"""Train the adverse drug reaction (ADR) risk models on FAERS reports.

One XGBoost binary classifier per ADR category (binary relevance, 8 targets).
Features per patient report:
  * age, sex, number of drugs
  * which drugs were taken (multi-hot, names normalised with shared/drug_vocabulary.json)
  * how many drugs of each pharmacological class were taken
  * SIDER prior knowledge: how many of the drugs list a side effect of each ADR category

The previous model only saw age / sex / drug count (its 12 risk-flag columns were
all zero in the training data), which is why its ROC-AUC was ~0.57.

Usage:  python -m ml.train_adr     (after ml.build_vocabulary)
"""
from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import average_precision_score, f1_score, precision_recall_curve, roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.services.adr_features import TARGETS, categories_of, featurize  # noqa: E402
from backend.services.drug_normalizer import DrugNormalizer  # noqa: E402
from ml.paths import ADR_ARTIFACTS, FAERS_PROCESSED, SIDER_RAW  # noqa: E402

SEED = 42
TOP_DRUGS = 400

def parse_list(s) -> list[str]:
    try:
        v = ast.literal_eval(str(s))
        return [str(x).strip().lower() for x in v] if isinstance(v, list) else []
    except Exception:
        return []


def sider_category_flags() -> dict[str, list[int]]:
    """drug name -> [1 if SIDER lists a side effect of that ADR category else 0 for each target]."""
    names = pd.read_csv(SIDER_RAW / "drug_names.tsv", sep="\t", header=None, names=["stitch", "name"])
    se = pd.read_csv(SIDER_RAW / "meddra_all_se.tsv.gz", sep="\t", header=None, usecols=[0, 5],
                     names=["stitch", "term"])
    se["term"] = se.term.str.lower()
    per_drug = se.groupby("stitch")["term"].apply(set)
    flags = {}
    for stitch, name in zip(names.stitch, names.name.str.lower().str.strip()):
        cats = categories_of(per_drug.get(stitch, set()))
        flags[name] = [int(t in cats) for t in TARGETS]
    return flags


def best_threshold(y, p):
    prec, rec, thr = precision_recall_curve(y, p)
    f1 = 2 * prec * rec / np.clip(prec + rec, 1e-9, None)
    i = int(np.nanargmax(f1[:-1])) if len(thr) else 0
    return float(thr[i]) if len(thr) else 0.5


def main():
    norm = DrugNormalizer()
    df = pd.read_csv(FAERS_PROCESSED)
    df["drugs"] = df.drug_names.map(lambda s: sorted({g for raw in parse_list(s) for g in norm.normalize_faers(raw)}))
    df["cats"] = df.reaction_list.map(lambda s: categories_of(parse_list(s)))
    Y = np.array([[int(t in c) for t in TARGETS] for c in df.cats], dtype=np.int8)

    counts = pd.Series([d for ds in df.drugs for d in ds]).value_counts()
    drug_cols = list(counts.head(TOP_DRUGS).index)
    vocab_generics = [g for g in norm.generics() if counts.get(g, 0) >= 5 and g not in drug_cols]
    drug_cols += vocab_generics
    classes = sorted(norm.all_classes())
    sider = sider_category_flags()
    sider_flags = {}
    for name in set(drug_cols) | set(norm.generics()):
        for alias in [name] + norm.aliases(name):
            if alias in sider:
                sider_flags[name] = sider[alias]
                break

    columns = (["patient_age", "sex_female", "sex_male", "drug_count"]
               + [f"drug={d}" for d in drug_cols] + [f"class={c}" for c in classes]
               + [f"sider_prior={t}" for t in TARGETS])
    spec = {"columns": columns, "index": {c: i for i, c in enumerate(columns)},
            "targets": TARGETS, "sider_flags": sider_flags}
    X = np.stack([featurize(a, str(s).lower(), ds, spec, norm.drug_class)
                  for a, s, ds in zip(df.patient_age, df.biological_sex, df.drugs)])
    print(f"reports {len(df)}  features {X.shape[1]}  drug columns {len(drug_cols)}")

    rng = np.random.default_rng(SEED)
    perm = rng.permutation(len(df))
    n_te = n_va = int(0.15 * len(df))
    te, va, tr = perm[:n_te], perm[n_te:n_te + n_va], perm[n_te + n_va:]

    old = json.loads((ADR_ARTIFACTS / "previous_model_training_metrics.json").read_text()) \
        if (ADR_ARTIFACTS / "previous_model_training_metrics.json").exists() else {}
    metrics, thresholds = {}, {}
    for j, target in enumerate(TARGETS):
        model = xgb.XGBClassifier(n_estimators=800, learning_rate=0.05, max_depth=5, subsample=0.8,
                                  colsample_bytree=0.5, min_child_weight=3, tree_method="hist",
                                  eval_metric="logloss", early_stopping_rounds=50,
                                  random_state=SEED, n_jobs=-1)
        model.fit(X[tr], Y[tr, j], eval_set=[(X[va], Y[va, j])], verbose=False)
        thr = best_threshold(Y[va, j], model.predict_proba(X[va])[:, 1])
        p = model.predict_proba(X[te])[:, 1]
        metrics[target] = {
            "test_roc_auc": float(roc_auc_score(Y[te, j], p)),
            "test_pr_auc": float(average_precision_score(Y[te, j], p)),
            "test_f1": float(f1_score(Y[te, j], p >= thr)),
            "positive_rate": float(Y[:, j].mean()),
            "threshold": thr,
            "previous_model_test_roc_auc": old.get(target, {}).get("test_roc_auc"),
        }
        thresholds[target] = thr
        # keep only the trees up to the early-stopping best iteration (what predict_proba used above)
        model.get_booster()[: model.best_iteration + 1].save_model(str(ADR_ARTIFACTS / f"adr_xgb_{target}.json"))
        print(f"{target:22s} ROC-AUC {metrics[target]['test_roc_auc']:.3f} "
              f"(old {metrics[target]['previous_model_test_roc_auc'] or float('nan'):.3f})  "
              f"PR-AUC {metrics[target]['test_pr_auc']:.3f}  F1 {metrics[target]['test_f1']:.3f}", flush=True)

    summary = {
        "model": "XGBoost binary-relevance (one classifier per ADR category)",
        "dataset": f"FAERS reports ({len(df)}), random 70/15/15 split",
        "n_train": int(len(tr)), "n_validation": int(len(va)), "n_test": int(len(te)),
        "macro_test_roc_auc": float(np.mean([m["test_roc_auc"] for m in metrics.values()])),
        "macro_test_pr_auc": float(np.mean([m["test_pr_auc"] for m in metrics.values()])),
        "macro_test_f1": float(np.mean([m["test_f1"] for m in metrics.values()])),
        "previous_model_macro_test_roc_auc": float(np.mean([v["test_roc_auc"] for v in old.values()])) if old else None,
        "per_target": metrics,
    }
    spec.pop("index")
    (ADR_ARTIFACTS / "adr_feature_spec.json").write_text(json.dumps(spec))
    (ADR_ARTIFACTS / "adr_thresholds.json").write_text(json.dumps(thresholds, indent=2))
    (ADR_ARTIFACTS / "adr_metrics.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({k: v for k, v in summary.items() if k != "per_target"}, indent=2))


if __name__ == "__main__":
    main()
