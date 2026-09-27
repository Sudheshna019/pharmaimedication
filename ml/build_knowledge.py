"""Build the knowledge files used by the API next to the ML models.

Outputs (backend/ml_artifacts/knowledge/):
  sider_side_effects.json   real side-effect frequencies per vocabulary drug (SIDER 4.1)
  drugbank_known_pairs.json DrugBank-recorded interaction type for vocabulary drug pairs
  ddi_types.json            the 86 DrugBank interaction types: description + severity tier

Usage:  python -m ml.build_knowledge      (after ml.build_vocabulary)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ml.paths import DDI_ARTIFACTS, DDI_RAW, KB_ARTIFACTS, SHARED_DIR, SIDER_RAW  # noqa: E402

# Severity tier of every DrugBank interaction type (model class index 0-85).
# High   = can cause serious harm (bleeding, arrhythmia, organ toxicity, loss of anticoagulation...)
# Medium = clinically relevant change in drug level / effect, needs monitoring
# Low    = minor or usually not clinically significant
HIGH_TYPES = {17, 18, 19, 20, 21, 22, 26, 27, 28, 31, 33, 35, 45, 47, 49, 50, 53, 54, 60, 67, 69,
              70, 75, 76, 78, 81, 82}
LOW_TYPES = {7, 13, 15, 16, 23, 32, 36, 37, 38, 39, 40, 41, 43, 46, 48, 55, 56, 74, 84}

# Label-table terms that describe the treated condition or trial population, not a side effect
EXCLUDED_TERMS = ["foetal", "fetal", "neonatal", "congenital", "postinfarction", "death", "drug ineffective",
                  "pregnancy", "abortion", "overdose", "infarction", "neoplasm", "cancer",
                  "injection", "infusion", "catheter", "mental disorder", "apnoea", "ductus",
                  "intraventricular", "gastrooesophageal reflux", "^infection$", "^pain$"]

SERIOUS_TERMS = ["haemorrhage", "hemorrhage", "bleeding", "failure", "arrest", "infarction", "stroke",
                 "anaphyla", "stevens-johnson", "toxic epidermal", "agranulocytosis", "pancytopenia",
                 "rhabdomyolysis", "torsade", "fibrillation", "arrhythmia", "hepatitis", "necrosis",
                 "seizure", "convulsion", "suicid", "pancreatitis", "angioedema", "hyperkalaemia",
                 "lactic acidosis", "neutropenia", "thrombocytopenia", "serotonin syndrome", "coma"]
MODERATE_TERMS = ["hypotension", "hypertension", "tachycardia", "bradycardia", "ulcer", "jaundice",
                  "hypoglycaemia", "hyperglycaemia", "oedema", "edema", "syncope", "dyspnoea", "vomiting",
                  "depression", "confusion", "hallucination", "palpitations", "renal", "hepatic",
                  "cough", "insomnia", "somnolence"]


def se_severity(term: str) -> str:
    t = term.lower()
    if any(k in t for k in SERIOUS_TERMS):
        return "Severe"
    if any(k in t for k in MODERATE_TERMS):
        return "Moderate"
    return "Mild"


def se_category(term: str) -> str:
    t = term.lower()
    groups = {
        "Gastrointestinal": ["nausea", "vomit", "diarrh", "constipation", "abdominal", "dyspepsia", "gastr", "flatulence", "stomach"],
        "Neurological": ["headache", "dizziness", "somnolence", "tremor", "seizure", "insomnia", "paraesthesia", "neuropathy", "confusion"],
        "Cardiovascular": ["hypotension", "hypertension", "tachycardia", "bradycardia", "palpitations", "arrhythmia", "oedema", "fibrillation"],
        "Hematologic": ["haemorrhage", "hemorrhage", "bleeding", "bruis", "anaemia", "thrombocytopenia", "neutropenia", "haematoma"],
        "Renal": ["renal", "kidney", "hyperkalaemia", "urinary"],
        "Hepatic": ["hepat", "liver", "jaundice", "transaminase"],
        "Dermatologic": ["rash", "pruritus", "urticaria", "dermatitis", "alopecia", "photosensitivity"],
        "Respiratory": ["cough", "dyspnoea", "bronch", "rhinitis", "pharyngitis"],
        "Musculoskeletal": ["myalgia", "arthralgia", "back pain", "muscle"],
        "Metabolic": ["hypoglycaemia", "hyperglycaemia", "weight", "appetite"],
    }
    for name, keys in groups.items():
        if any(k in t for k in keys):
            return name
    return "General"


def build_sider(vocab: dict) -> dict:
    names = pd.read_csv(SIDER_RAW / "drug_names.tsv", sep="\t", header=None, names=["stitch", "name"])
    names["name"] = names["name"].str.lower().str.strip()
    by_name = dict(zip(names.name, names.stitch))
    by_cid = {int(s[4:]): s for s in names.stitch}

    freq = pd.read_csv(SIDER_RAW / "meddra_freq.tsv.gz", sep="\t", header=None,
                       names=["flat", "stereo", "umls", "placebo", "freq_text", "lower", "upper",
                              "meddra_type", "umls_meddra", "term"])
    freq = freq[(freq.meddra_type == "PT") & (freq.placebo.isna()) & (freq.freq_text != "postmarketing")]
    freq = freq[~freq.term.str.lower().str.contains("|".join(EXCLUDED_TERMS), regex=True)]
    # exact label percentages ("5%", "1-5%") -> midpoint; word descriptors ("common") -> lower bound
    is_pct = freq.freq_text.astype(str).str.endswith("%")
    freq["pct"] = ((freq.lower + freq.upper) / 2).where(is_pct, freq.lower) * 100
    all_se = pd.read_csv(SIDER_RAW / "meddra_all_se.tsv.gz", sep="\t", header=None,
                         names=["flat", "stereo", "umls", "meddra_type", "umls_meddra", "term"])
    all_se = all_se[all_se.meddra_type == "PT"]

    out, missing = {}, []
    for key, d in vocab["drugs"].items():
        candidates = [key] + d["synonyms"]
        stitch = next((by_name[c] for c in candidates if c in by_name), None)
        if stitch is None and d.get("pubchem_cid"):
            stitch = by_cid.get(int(d["pubchem_cid"]))
        if stitch is None:
            missing.append(key)
            continue
        rows = freq[freq.flat == stitch]
        effects = []
        if len(rows):
            agg = rows.groupby("term")["pct"].agg(["median", "count"])
            # prefer side effects reported on more than one label (typical, not formulation-specific)
            repeated = agg[agg["count"] >= 2]
            agg = (repeated if len(repeated) >= 3 else agg)["median"].sort_values(ascending=False)
            for term, pct in agg.head(8).items():
                effects.append({"effect": term, "frequencyPercent": round(float(pct), 1),
                                "severity": se_severity(term), "category": se_category(term)})
        else:
            terms = all_se[all_se.flat == stitch].term.drop_duplicates().head(6)
            for term in terms:
                effects.append({"effect": term, "frequencyPercent": None,
                                "severity": se_severity(term), "category": se_category(term)})
        out[key] = {"sider_id": stitch, "side_effects": effects}
    print(f"SIDER: side effects for {len(out)} drugs; not in SIDER: {missing}")
    return out


def build_known_pairs(vocab: dict) -> dict:
    ids = {d["drugbank_id"] for d in vocab["drugs"].values() if d["drugbank_id"]}
    pairs = {}
    for f in ["drugbank_training.csv", "drugbank_validation.csv", "drugbank_test (1).csv"]:
        df = pd.read_csv(DDI_RAW / f, usecols=["d1", "d2", "type"])
        df = df[df.d1.isin(ids) & df.d2.isin(ids)]
        for a, b, t in zip(df.d1, df.d2, df.type):
            pairs[f"{a}|{b}"] = int(t)
    print(f"DrugBank: {len(pairs)} recorded interactions among vocabulary drugs")
    return pairs


def build_ddi_types() -> dict:
    info = pd.read_csv(DDI_ARTIFACTS / "Interaction_information.csv")
    types = {}
    for _, row in info.iterrows():
        cls = int(str(row["DDI type"]).split()[-1]) - 1  # "DDI type k" <-> model class k-1
        sev = "High" if cls in HIGH_TYPES else "Low" if cls in LOW_TYPES else "Medium"
        types[str(cls)] = {"description": row["Description"], "severity": sev,
                           "drugbank_interaction_type": int(row["Interaction type"])}
    assert len(types) == 86
    return types


def main():
    vocab = json.loads((SHARED_DIR / "drug_vocabulary.json").read_text(encoding="utf-8"))
    (KB_ARTIFACTS / "sider_side_effects.json").write_text(json.dumps(build_sider(vocab), indent=1))
    (KB_ARTIFACTS / "drugbank_known_pairs.json").write_text(json.dumps(build_known_pairs(vocab)))
    (KB_ARTIFACTS / "ddi_types.json").write_text(json.dumps(build_ddi_types(), indent=1))
    print(f"written to {KB_ARTIFACTS}")


if __name__ == "__main__":
    main()
