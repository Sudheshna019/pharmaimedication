"""ADR feature construction shared by training (ml/train_adr.py) and the API."""
from __future__ import annotations

import numpy as np

# MedDRA keyword groups defining the 8 ADR outcome categories (same as the original pipeline)
ADR_KEYWORDS = {
    "adr_kidney": ["kidney", "renal", "nephropathy"],
    "adr_bleeding": ["bleed", "hemorrhage", "haemorrhage", "melaena"],
    "adr_hepatotoxicity": ["liver", "hepat", "hepatic"],
    "adr_arrhythmia": ["qt", "arrhythmia", "fibrillation", "tachycardia", "bradycardia"],
    "adr_hyperkalemia": ["hyperkalaemia", "hyperkalemia", "potassium increased"],
    "adr_hypotension": ["hypotension", "blood pressure decreased"],
    "adr_gastrointestinal": ["nausea", "vomiting", "diarrhoea", "abdominal", "constipation"],
    "adr_neurological": ["headache", "dizziness", "tremor", "seizure", "neuropathy", "somnolence"],
}
TARGETS = list(ADR_KEYWORDS)

TARGET_LABELS = {
    "adr_kidney": "Kidney Injury",
    "adr_bleeding": "Bleeding",
    "adr_hepatotoxicity": "Liver Toxicity",
    "adr_arrhythmia": "Heart Rhythm Disturbance",
    "adr_hyperkalemia": "High Potassium (Hyperkalemia)",
    "adr_hypotension": "Low Blood Pressure",
    "adr_gastrointestinal": "Gastrointestinal Upset",
    "adr_neurological": "Neurological Effects",
}


def categories_of(terms) -> set[str]:
    cats = set()
    for t in terms:
        for target, keys in ADR_KEYWORDS.items():
            if any(k in t for k in keys):
                cats.add(target)
    return cats


def featurize(age, sex: str, drugs: list[str], spec: dict, drug_class) -> np.ndarray:
    """Feature vector in the column order of spec['columns'].

    drugs      normalised generic names
    drug_class callable generic -> pharmacological class (or None)
    """
    idx = spec["index"]
    x = np.zeros(len(spec["columns"]), dtype=np.float32)
    x[idx["patient_age"]] = np.nan if age is None or not age > 0 else float(age)
    x[idx["sex_female"]] = float(sex == "female")
    x[idx["sex_male"]] = float(sex == "male")
    x[idx["drug_count"]] = len(drugs)
    for d in drugs:
        if f"drug={d}" in idx:
            x[idx[f"drug={d}"]] = 1
        cls = drug_class(d)
        if cls and f"class={cls}" in idx:
            x[idx[f"class={cls}"]] += 1
        for t, flag in zip(TARGETS, spec["sider_flags"].get(d, [0] * len(TARGETS))):
            x[idx[f"sider_prior={t}"]] += flag
    return x
