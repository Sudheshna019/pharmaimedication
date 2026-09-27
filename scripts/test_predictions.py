"""Send test prescriptions to the running ML service and print a compact summary.
    python scripts/test_predictions.py            (service must run on port 8000)
"""
import json
import sys
import urllib.request

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/api/v1/analysis/predict-interaction"

CASES = [
    ("1 Warfarin+Aspirin", 72, "Male", None, ["Warfarin 5mg", "Aspirin 81mg"]),
    ("2 Clopidogrel+Omeprazole+Atorva", 64, "Female", None, ["Clopidogrel 75mg", "Omeprazole 20mg", "Atorvastatin 40mg"]),
    ("3 Dengue: Dolo+Rantac+SM Fibro", 38, "Male", None, ["Dolo 650", "Rantac 150mg", "SM Fibro"]),
    ("4 Lisinopril+Metformin+Spironolactone+Atorva", 68, "Male", 40, ["Lisinopril 20mg", "Metformin 1000mg", "Spironolactone 25mg", "Atorvastatin 20mg"]),
    ("5 Fluoxetine+Tramadol", 42, "Female", None, ["Fluoxetine 20mg", "Tramadol 50mg"]),
    ("6 Pan 40+Paracetamol", 51, "Female", None, ["Pan 40", "Paracetamol 500mg"]),
    ("7 Digoxin+Furosemide", 70, "Male", None, ["Digoxin 0.25mg", "Furosemide 40mg"]),
    ("8 Amlodipine+Telmisartan", 61, "Female", None, ["Amlodipine 5mg", "Telmisartan 40mg"]),
    ("9 Amoxicillin+Pantoprazole", 45, "Male", None, ["Amoxicillin 500mg", "Pantoprazole 40mg"]),
    ("10 Warfarin+Ibuprofen", 73, "Female", None, ["Warfarin 5mg", "Ibuprofen 400mg"]),
    ("11 Metformin+Lisinopril+Atorva", 62, "Male", None, ["Metformin 1000mg", "Lisinopril 20mg", "Atorvastatin 20mg"]),
    ("12 Combiflam+Pantocid", 49, "Female", None, ["Combiflam", "Pantocid 40mg"]),
    ("13 Clopidogrel+Pantoprazole+Aspirin", 76, "Male", None, ["Clopidogrel 75mg", "Pantoprazole 40mg", "Aspirin 81mg"]),
    ("14 Montelukast+Cetirizine", 35, "Female", None, ["Montelukast 10mg", "Cetirizine 10mg"]),
    ("X Paracetamol+Cetirizine (safe)", 30, "Male", None, ["Paracetamol 500mg", "Cetirizine 10mg"]),
    ("X Dolo+Combiflam (duplicate)", 30, "Male", None, ["Dolo 650", "Combiflam"]),
    ("X Losartan Potassium+Metformin", 55, "Male", None, ["Losartan Potassium 50mg", "Metformin 500mg"]),
    ("X OCR typo: Warfarn+Asprin", 70, "Female", None, ["Warfarn 5mg", "Asprin 75mg"]),
    ("X Unknown drug", 40, "Male", None, ["Xyzabc 10mg", "Paracetamol 500mg"]),
    ("X Single drug", 30, "Female", None, ["Amoxicillin 500mg"]),
    ("X Simvastatin+Clarithromycin", 60, "Male", None, ["Simvastatin 40mg", "Clarithromycin 500mg"]),
    ("X Azithromycin+Ondansetron (QT)", 50, "Female", None, ["Azithromycin 500mg", "Ondansetron 4mg"]),
    ("5 meds, only Clopidogrel+Omeprazole interact", 60, "Male", None,
     ["Amoxicillin 500mg", "Clopidogrel 75mg", "Omeprazole 20mg", "Cetirizine 10mg", "Paracetamol 500mg"]),
    ("5 meds, only Warfarin+Fluconazole interact", 66, "Female", None,
     ["Metformin 500mg", "Warfarin 5mg", "Fluconazole 150mg", "Pantoprazole 40mg", "Amlodipine 5mg"]),
    ("5 safe meds", 30, "Female", None,
     ["Paracetamol 500mg", "Cetirizine 10mg", "Pantoprazole 40mg", "Amoxicillin 500mg", "Vitamin D3"]),
    ("Outside curated list: Tacrolimus+Clarithromycin", 45, "Male", None, ["Tacrolimus 1mg", "Clarithromycin 500mg"]),
    ("Outside curated list: Sildenafil+Isosorbide dinitrate", 60, "Male", None, ["Sildenafil 50mg", "Isosorbide dinitrate 10mg"]),
    ("Outside curated list: Linezolid+Sertraline", 40, "Female", None, ["Linezolid 600mg", "Sertraline 50mg"]),
    ("Outside curated list: Ketorolac+Enoxaparin-free pair Ketorolac+Probenecid", 50, "Male", None, ["Ketorolac 10mg", "Probenecid 500mg"]),
    ("Outside curated list: Allopurinol+Azathioprine", 55, "Male", None, ["Allopurinol 100mg", "Azathioprine 50mg"]),
    ("Outside curated list: Rifampicin+Oral contraceptive", 25, "Female", None, ["Rifampicin 600mg", "Ethinylestradiol 30mcg"]),
    ("Outside curated list: Nitrofurantoin + Cefalexin (safe)", 30, "Female", None, ["Nitrofurantoin 100mg", "Cefalexin 500mg"]),
]

for title, age, sex, egfr, meds in CASES:
    body = {"patientData": {"age": age, "gender": sex, "egfr": egfr},
            "medications": [{"id": str(i), "name": m} for i, m in enumerate(meds)]}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=60))["data"]
    meds_out = ", ".join(f"{m['name']}{'' if m['isVerified'] else ' [UNRECOGNISED]'}" for m in d["detectedMedicines"])
    print(f"\n### {title}  ->  RISK {d['overallRiskLevel']}  (certainty {d['overallConfidenceScore']:.2f}, {d['modelInfo']['latencyMs']} ms)")
    print(f"   meds: {meds_out}")
    for x in d["drugInteractions"]:
        ev = x["evidence"]
        p = ev["mlInteractionProbability"]
        print(f"   DDI [{x['severity']}] {x['med1']} + {x['med2']} | {ev['source']}"
              f"{' | DrugBank' if ev['drugbankRecorded'] else ''} | ML p={p if p is None else round(p, 3)}")
        print(f"       ML type: {ev.get('mlTypeDescription')}")
    flagged = [f"{r['label']} {r['probability']:.2f} ({r['relative_risk']}x)" for r in d["adrPredictions"].values() if r["flagged"]]
    print(f"   ADR flagged: {flagged or 'none'}")
    print(f"   SHAP ({d['shapSummary']['outcome'] if d['shapSummary'] else '-'}): " +
          ", ".join(f"{s['featureName']} {s['impactValue']:+.2f}" for s in d["shapFeatures"][:4]))
