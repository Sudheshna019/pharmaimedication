"""Prescription risk analysis endpoint (hybrid ML + clinical knowledge pipeline).

  1. Normalise every medicine name (brands, combinations, salts, OCR typos)
  2. Drug-drug interactions for every ingredient pair:
       ML interaction detector + ML interaction-type model (chemical structure),
       DrugBank-recorded interactions, curated clinical rules for severity/advice
  3. Adverse drug reaction risk (FAERS-trained XGBoost, TreeSHAP explanation)
  4. Known side effects per drug with real frequencies (SIDER 4.1)
"""
from __future__ import annotations

import itertools
import json
import logging
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.adr_inference import get_adr_engine
from backend.services.clinical_rules import find_rule
from backend.services.ddi_inference import get_ddi_engine
from backend.services.drug_normalizer import get_normalizer

LOGGER = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["ML Analysis & Explainability"])

ARTIFACTS = Path(__file__).resolve().parent.parent / "ml_artifacts"
SIDER = json.loads((ARTIFACTS / "knowledge" / "sider_side_effects.json").read_text())

SEVERITY_ORDER = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
# Interactions found only in the database / by the ML model (no curated clinical rule) are mostly
# minor pharmacokinetic effects, so they are graded one level below their interaction-type tier.
DATABASE_ONLY_SEVERITY = {"High": "Medium", "Medium": "Low", "Low": "Low"}
# An ADR category raises the overall risk only if it is flagged AND its absolute probability is meaningful
ADR_OVERALL_MIN_PROB = 0.20
TOP_SIDE_EFFECTS = 5
# Narrow therapeutic index drugs: small changes in blood level can cause toxicity or treatment failure
NARROW_MARGIN = ("tacrolimus", "cyclospor", "sirolimus", "everolimus", "digoxin", "warfarin", "lithium", "phenytoin",
                 "carbamazepine", "theophylline", "aminophylline", "methotrexate", "clozapine", "valpro",
                 "phenobarbital", "flecainide", "colchicine", "levothyroxine", "fosphenytoin", "mycophenol")
LEVEL_UP_TYPES = {1, 4, 5, 9, 10, 14}          # absorption/bioavailability up, metabolism/excretion down, level up
LEVEL_DOWN_TYPES = {0, 2, 3, 6, 8, 11, 12, 15}  # level or effect of the affected drug goes down
PK_WORDS = ("metabolism", "serum concentration", "absorption", "bioavailability", "excretion", "protein binding")

DRUG_GUIDANCE = {
    "paracetamol": "Paracetamol: do not exceed 4 g per day in total (including combination products) to avoid liver damage.",
    "ibuprofen": "Ibuprofen: take with food; avoid combining with other NSAIDs.",
    "naproxen": "Naproxen: take with food and maintain good fluid intake.",
    "diclofenac": "Diclofenac: take with food; avoid long-term use in heart or kidney disease.",
    "aspirin": "Aspirin: take with food; report black stools or unusual bruising.",
    "warfarin": "Warfarin: keep vitamin K intake (green leafy vegetables) consistent and check INR regularly.",
    "clopidogrel": "Clopidogrel: do not stop suddenly; avoid over-the-counter NSAIDs.",
    "lisinopril": "Lisinopril: monitor blood pressure, serum potassium and kidney function.",
    "telmisartan": "Telmisartan: monitor blood pressure and serum potassium.",
    "losartan": "Losartan: monitor blood pressure and serum potassium.",
    "metformin": "Metformin: take with meals; check kidney function and vitamin B12 periodically.",
    "atorvastatin": "Atorvastatin: report unexplained muscle pain; avoid large amounts of grapefruit juice.",
    "rosuvastatin": "Rosuvastatin: report unexplained muscle pain.",
    "omeprazole": "Omeprazole: take 30-60 minutes before breakfast.",
    "pantoprazole": "Pantoprazole: take before the morning meal.",
    "ranitidine": "Ranitidine: note that ranitidine was withdrawn in many countries (NDMA impurity); famotidine is a common alternative.",
    "fluoxetine": "Fluoxetine: avoid other serotonergic drugs and St John's Wort.",
    "tramadol": "Tramadol: avoid alcohol and other sedatives.",
    "amoxicillin": "Amoxicillin: complete the full course even if symptoms improve.",
    "azithromycin": "Azithromycin: complete the full course.",
    "digoxin": "Digoxin: monitor pulse, serum potassium and digoxin levels.",
    "furosemide": "Furosemide: monitor serum potassium and hydration.",
    "amlodipine": "Amlodipine: ankle swelling is a common side effect; rise slowly to avoid dizziness.",
    "montelukast": "Montelukast: report mood changes or sleep disturbance.",
    "cetirizine": "Cetirizine: may cause drowsiness; avoid driving if affected.",
    "levothyroxine": "Levothyroxine: take on an empty stomach, 30-60 minutes before breakfast.",
}

# Drugs needing dose review in reduced kidney function (eGFR mL/min/1.73m2)
RENAL_CAUTION = {
    "metformin": (45, "Metformin: reduce dose if eGFR 30-45; contraindicated below 30."),
    "digoxin": (60, "Digoxin: renally cleared - reduce dose and monitor levels."),
    "class:nsaid": (60, "NSAIDs: avoid or minimise in reduced kidney function."),
    "gabapentin": (60, "Gabapentin: dose must be reduced for the patient's eGFR."),
    "pregabalin": (60, "Pregabalin: dose must be reduced for the patient's eGFR."),
    "spironolactone": (45, "Spironolactone: high hyperkalemia risk in reduced kidney function."),
    "ciprofloxacin": (50, "Ciprofloxacin: dose adjustment needed in reduced kidney function."),
    "levofloxacin": (50, "Levofloxacin: dose adjustment needed in reduced kidney function."),
    "rivaroxaban": (50, "Rivaroxaban: dose adjustment needed in reduced kidney function."),
    "apixaban": (30, "Apixaban: review dose in reduced kidney function."),
    "lithium carbonate": (60, "Lithium: renally cleared - monitor levels closely."),
}


class MedicationItem(BaseModel):
    id: str = ""
    name: str
    dosage: str = ""
    frequency: str = ""
    route: str = "Oral"


class PatientData(BaseModel):
    age: Optional[float] = None
    gender: str = "Unknown"
    egfr: Optional[float] = None


class PredictRequest(BaseModel):
    patientData: PatientData = Field(default_factory=PatientData)
    medications: List[MedicationItem]
    userId: Optional[str] = None


def _worst(levels) -> str:
    levels = list(levels)
    return max(levels, key=lambda s: SEVERITY_ORDER[s]) if levels else "Low"


def _fmt(text: str, a: str, b: str) -> str:
    return text.replace("{a}", a).replace("{b}", b)


def _is_narrow_margin(generic: str) -> bool:
    return any(k in generic for k in NARROW_MARGIN)


def _ml_alert(ml: dict) -> bool:
    """Should a pair without a clinical rule be reported?"""
    if ml["known_in_drugbank"]:
        return True
    # AI-only (not in DrugBank): only very confident predictions of a serious interaction type
    return (ml["interaction_probability"] >= 0.95 and ml["type_severity"] == "High"
            and ml["type_confidence"] >= 0.9)


SYMPTOM_HINTS = [
    (("bleeding", "anticoagulant", "antiplatelet", "thrombo"), ["Unusual bruising or bleeding", "Black stools", "Blood in urine"]),
    (("qtc", "arrhythm", "cardiotoxic", "bradycard", "av block", "tachycard"), ["Palpitations", "Fainting", "Dizziness"]),
    (("hypotensi",), ["Dizziness on standing", "Light-headedness", "Fainting"]),
    (("cns depressant", "sedative", "respiratory depressant"), ["Excessive sleepiness", "Confusion", "Slow breathing"]),
    (("serotonergic", "neuroexcitatory"), ["Agitation", "Fever and sweating", "Tremor or muscle twitching"]),
    (("hyperkal",), ["Muscle weakness", "Irregular heartbeat"]),
    (("hypoglyc",), ["Sweating", "Shakiness", "Confusion"]),
    (("nephrotox",), ["Less urine", "Swelling of feet"]),
    (("hepatotox",), ["Yellow eyes or skin", "Dark urine"]),
    (("ulcerogenic",), ["Stomach pain", "Black stools"]),
]


def _simple_symptoms(description: str) -> list[str]:
    d = description.lower()
    for keys, symptoms in SYMPTOM_HINTS:
        if any(k in d for k in keys):
            return symptoms
    if "decrease" in d or "reduced" in d:
        return ["The medicine may not work as well as expected"]
    return ["More side effects than usual from either medicine"]


def _analyse_medicines(meds: list[MedicationItem]):
    norm = get_normalizer()
    detected, ingredients = [], {}  # generic -> list of product indices
    for i, m in enumerate(meds):
        n = norm.normalize_name(m.name)
        entry = {
            "id": m.id or f"med-{i + 1}",
            "name": n["display"] if n["recognized"] else m.name.strip(),
            "originalName": m.name.strip(),
            "dosage": m.dosage or "Not specified",
            "frequency": m.frequency or "Not specified",
            "route": m.route or "Oral",
            "isVerified": n["recognized"],
            "matchType": ("fuzzy" if n.get("fuzzy") else n["kind"]) if n["recognized"] else "unrecognized",
            "ingredients": [norm.display_name(g) for g in n["generics"]],
            "category": ", ".join(sorted({(c or "").replace("_", " ").title() for c in n["classes"] if c})) or None,
        }
        ids = [norm.drugbank_id(g) for g in n["generics"] if norm.drugbank_id(g)]
        entry["sourceDB"] = f"DrugBank {', '.join(ids)}" if ids else ("Drug vocabulary" if n["recognized"] else "Not found")
        detected.append(entry)
        for g in n["generics"]:
            ingredients.setdefault(g, []).append(i)
    return detected, ingredients


def _duplicate_interactions(detected, ingredients):
    norm = get_normalizer()
    out = []
    for g, products in ingredients.items():
        if len(set(products)) < 2:
            continue
        names = [detected[p]["name"] for p in dict.fromkeys(products)]
        drug = norm.display_name(g)
        extra = " Total paracetamol must stay below 4 g/day to avoid liver damage." if g == "paracetamol" else ""
        out.append({
            "med1": names[0], "med2": names[1], "severity": "High",
            "description": f"Duplicate ingredient: {drug} is present in both {names[0]} and {names[1]}. "
                           f"Taking both doubles the dose of {drug}.{extra}",
            "mechanism": "Therapeutic duplication (same active ingredient)",
            "biochemicalPathway": "Additive exposure to the same active ingredient",
            "whyReactionHappens": f"Both products contain {drug}, so the body receives two doses at the same time.",
            "symptomsToWatch": ["Symptoms of overdose of " + drug, "Nausea or vomiting", "Unusual drowsiness"],
            "clinicalRecommendation": f"Take only one product containing {drug}, or confirm the combined dose with the prescriber.",
            "saferAlternative": f"Keep a single {drug}-containing product.",
            "confidenceScore": 1.0,
            "evidence": {"source": "Ingredient-level duplicate check", "curatedRule": True,
                         "drugbankRecorded": False, "mlInteractionProbability": None},
        })
    return out


def _pair_interactions(detected, ingredients):
    norm, ddi = get_normalizer(), get_ddi_engine()
    out, certainties, evaluated = [], [], 0
    for g1, g2 in itertools.combinations(ingredients, 2):
        # ingredients of the same combination product are an intended pairing
        if set(ingredients[g1]) & set(ingredients[g2]) and len(ingredients[g1]) == len(ingredients[g2]) == 1:
            continue
        evaluated += 1
        n1, n2 = norm.display_name(g1), norm.display_name(g2)
        rule = find_rule(g1, norm.drug_class(g1), g2, norm.drug_class(g2))
        ml = ddi.predict_pair(g1, g2)
        if ml:
            p = ml["interaction_probability"]
            certainties.append(max(p, 1 - p))

        if rule:
            a, b = norm.display_name(rule["first"]), norm.display_name(rule["second"])
            severity, source = rule["severity"], "Curated clinical rule"
            description = _fmt(rule["description"], a, b)
            mechanism = pathway = rule["mechanism"]
            why, symptoms = _fmt(rule["why"], a, b), rule["symptoms"]
            recommendation, alternative = _fmt(rule["recommendation"], a, b), _fmt(rule["alternative"], a, b)
        elif ml and _ml_alert(ml):
            known = ml["known_in_drugbank"]
            # recorded in DrugBank: one level below the type tier; AI-only prediction: at most Medium
            severity = DATABASE_ONLY_SEVERITY[ml["known_severity"] if known else ml["type_severity"]]
            affected = ml["known_affected_drug"] if known else ml["affected_drug"]
            cls = ml["known_type"] if known else ml["predicted_type"]
            if _is_narrow_margin(affected) and cls in LEVEL_UP_TYPES | LEVEL_DOWN_TYPES:
                # small level changes of narrow-therapeutic-index drugs are clinically important
                severity = "Medium" if severity == "Low" else severity
                recommendation_extra = f" {norm.display_name(affected)} has a narrow safety margin - its blood level or effect should be monitored."
            else:
                recommendation_extra = ""
            source = "Recorded in DrugBank" if known else "AI model prediction"
            description = ml["known_description"] if known else ml["description"]
            pathway = mechanism = ("Changes the level of a drug in the blood" if any(k in description.lower() for k in PK_WORDS)
                                   else "The two drugs add to or oppose each other's effect")
            why = description
            symptoms = _simple_symptoms(description)
            recommendation = "Tell the doctor or pharmacist about both medicines and watch for the symptoms listed." + recommendation_extra
            alternative = "The doctor may adjust the dose, space the doses apart, or choose another medicine."
        else:
            continue

        out.append({
            "med1": n1, "med2": n2, "severity": severity,
            "description": description, "mechanism": mechanism, "biochemicalPathway": pathway,
            "whyReactionHappens": why, "symptomsToWatch": symptoms,
            "clinicalRecommendation": recommendation, "saferAlternative": alternative,
            "confidenceScore": ml["interaction_probability"] if ml else None,
            "evidence": {
                "source": source,
                "curatedRule": bool(rule),
                "drugbankRecorded": bool(ml and ml["known_in_drugbank"]),
                "drugbankDescription": ml.get("known_description") if ml else None,
                "mlInteractionProbability": ml["interaction_probability"] if ml else None,
                "mlPredictedType": ml["predicted_type"] if ml else None,
                "mlTypeDescription": ml["description"] if ml else None,
                "mlTypeConfidence": ml["type_confidence"] if ml else None,
            },
        })
    # minor (Low) interactions are not reported - only clinically meaningful pairs are shown
    out = [d for d in out if d["severity"] != "Low"]
    out.sort(key=lambda d: -SEVERITY_ORDER[d["severity"]])
    return out, certainties, evaluated


def _side_effects(ingredients, adr):
    norm = get_normalizer()
    out = []
    for g in ingredients:
        for se in SIDER.get(g, {}).get("side_effects", [])[:3]:
            if se["frequencyPercent"] is None:
                continue
            out.append({"medName": norm.display_name(g), "effect": se["effect"],
                        "frequencyPercent": se["frequencyPercent"], "severity": se["severity"],
                        "category": se["category"]})
    for t, r in adr["risks"].items():
        if not r["flagged"]:
            continue
        rr, p = r["relative_risk"], r["probability"]
        out.append({"medName": "All medicines together", "effect": f"{r['label']} risk",
                    "frequencyPercent": round(p * 100, 1),
                    "severity": "Severe" if p >= 0.3 else "Moderate" if p >= 0.1 else "Mild",
                    "category": f"AI prediction ({rr:.1f}x usual risk)"})
    # show only the 5 most frequent side effects
    out.sort(key=lambda se: -se["frequencyPercent"])
    return out[:TOP_SIDE_EFFECTS]


def _recommendations(interactions, detected, ingredients, patient, adr):
    norm = get_normalizer()
    recs = []
    for d in interactions:
        if d["severity"] in ("Critical", "High", "Medium"):
            recs.append(f"{d['severity']} - {d['med1']} + {d['med2']}: {d['clinicalRecommendation']}")
    for g in ingredients:
        if g in DRUG_GUIDANCE:
            recs.append(DRUG_GUIDANCE[g])
    if patient.egfr is not None:
        for g in ingredients:
            for key, (limit, text) in RENAL_CAUTION.items():
                hit = key == g or (key.startswith("class:") and norm.drug_class(g) == key[6:])
                if hit and patient.egfr < limit and text not in recs:
                    recs.append(f"Renal function (eGFR {patient.egfr:g}): {text}")
    if patient.age and patient.age >= 65 and len(ingredients) >= 2:
        recs.append(f"Older patient ({int(patient.age)} yrs) on {len(ingredients)} medicines: review the regimen regularly (Beers criteria) and monitor for falls, dizziness and kidney function.")
    for t, r in adr["risks"].items():
        if r["flagged"] and r["relative_risk"] >= 1.5 and r["probability"] >= 0.05:
            recs.append(f"ADR model: elevated {r['label'].lower()} risk ({r['relative_risk']}x average) - monitor the patient for related symptoms.")
    unknown = [m["originalName"] for m in detected if not m["isVerified"]]
    if unknown:
        recs.append(f"Not recognised: {', '.join(unknown)}. These were not included in the interaction analysis - please verify the spelling.")
    if not any(d["severity"] != "Low" for d in interactions):
        recs.append("No clinically significant drug-drug interactions were found between the recognised medicines.")
    return recs


@router.post("/predict-interaction")
def predict_interaction_risk(payload: PredictRequest):
    if not payload.medications:
        raise HTTPException(status_code=400, detail="At least one medication is required.")
    t0 = time.time()
    patient = payload.patientData
    sex = (patient.gender or "unknown").lower()

    detected, ingredients = _analyse_medicines(payload.medications)
    duplicates = _duplicate_interactions(detected, ingredients)
    pairs, certainties, evaluated = _pair_interactions(detected, ingredients)
    interactions = duplicates + pairs

    adr = get_adr_engine().predict(patient.age, sex, list(ingredients)) if ingredients else \
        {"risks": {}, "shap": [], "explained_label": None, "shap_base_value": 0.0}
    side_effects = _side_effects(ingredients, adr)

    risk = _worst(d["severity"] for d in interactions)
    if risk == "Low" and any(r["flagged"] and r["probability"] >= ADR_OVERALL_MIN_PROB and r["relative_risk"] >= 2
                             for r in adr["risks"].values()):
        risk = "Medium"

    if certainties:
        confidence = sum(certainties) / len(certainties)
    elif adr["risks"]:
        confidence = sum(max(r["probability"], 1 - r["probability"]) for r in adr["risks"].values()) / len(adr["risks"])
    else:
        confidence = 0.0

    shap = [{
        "featureName": s["featureName"],
        "impactValue": s["impactValue"],
        "category": s["category"],
        "direction": "increases_risk" if s["impactValue"] > 0 else "decreases_risk",
        "explanation": f"TreeSHAP contribution (log-odds) to the predicted {adr['explained_label'].lower()} risk.",
    } for s in adr["shap"]]

    return {
        "success": True,
        "data": {
            "id": f"ANALYSIS-{int(time.time() * 1000) % 100000:05d}",
            "overallRiskLevel": risk,
            "overallConfidenceScore": round(confidence, 3),
            "detectedMedicines": detected,
            "drugInteractions": interactions,
            "sideEffects": side_effects,
            "clinicalRecommendations": _recommendations(interactions, detected, ingredients, patient, adr),
            "shapFeatures": shap,
            "adrPredictions": adr["risks"],
            "shapSummary": adr.get("summary"),
            "modelInfo": {
                "engine": "PharmAI hybrid ML pipeline (Python)",
                "pairsEvaluated": evaluated,
                "shapExplainedOutcome": adr["explained_label"],
                "latencyMs": round((time.time() - t0) * 1000),
            },
        },
    }


@router.get("/model-metrics")
def model_metrics():
    """Real test-set metrics of the deployed models."""
    def load(p):
        return json.loads((ARTIFACTS / p).read_text())
    ddi_type = load("ddi/ddi_type_metrics.json")
    ddi_type.pop("classification_report", None)
    adr = load("adr/adr_metrics.json")
    return {"ddi_type_model": ddi_type, "ddi_detection_model": load("ddi/ddi_detect_metrics.json"), "adr_model": adr}
