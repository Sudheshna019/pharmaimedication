# PharmAI – Drug Interaction & Adverse Drug Reaction Prediction

PharmAI reads a printed prescription (image or PDF), recognises the medicines, and predicts
**drug–drug interactions (DDI)** and **adverse drug reactions (ADR)** with machine-learning models,
explaining its predictions with SHAP.

```
Prescription image ─► Tesseract OCR ─► patient details + medicine recognition & normalisation
                                                                                      │
          ┌───────────────────────────────────────────────────────────────────────────┘
          ▼
  Python ML service (FastAPI)
    ├─ DDI interaction detector (MLP on Morgan fingerprints)      → do the two drugs interact?
    ├─ DDI interaction-type classifier (MLP, 86 DrugBank types)   → what kind of interaction?
    ├─ DrugBank-recorded interactions + curated clinical rules    → confirmation, severity, advice
    ├─ ADR risk models (8 × XGBoost trained on FAERS)             → bleeding / kidney / liver / ... risk
    ├─ TreeSHAP                                                   → why the ADR risk is high
    └─ SIDER 4.1                                                  → known side-effect frequencies
```

## Models and real test results

All numbers are measured on held-out test data that was never used for training
(`backend/ml_artifacts/*/…metrics.json`, reproducible with `run_ml_eval.py`).

| Model | Data | Test result | Previous version |
|---|---|---|---|
| DDI interaction-type classifier (MLP 2048-1024-512-86) | DrugBank DDI, 191,870 pairs, 86 types (official split, 38,337 test pairs) | **95.69 % accuracy**, macro-F1 0.937 | XGBoost: 77.41 %, macro-F1 0.732 |
| DDI interaction detector (MLP 2048-1024-512-1) | 419k interacting + 198k non-interacting pairs (59,272 test pairs) | **92.07 % accuracy**, ROC-AUC 0.966, F1 0.944 | – (new) |
| ADR risk models (8 × XGBoost, binary relevance) | 27,312 FAERS reports (4,096 test reports) | **macro ROC-AUC 0.702**, macro F1 0.184 | ROC-AUC 0.589 |

ADR ROC-AUC per category (new / old): kidney 0.727 / 0.568 · bleeding 0.673 / 0.601 · liver 0.721 / 0.570 ·
arrhythmia 0.659 / 0.566 · hyperkalemia 0.817 / 0.627 · hypotension 0.654 / 0.547 · GI 0.696 / 0.631 · neurological 0.668 / 0.598.

Why the ADR model improved: the previous model's 12 drug-risk columns were all zero in the training data
(the columns did not exist in `features_dataset.csv`), so it effectively learned only from age and number
of drugs. The new model uses the actual medicines in each report (multi-hot), their drug classes and SIDER prior knowledge.

## Datasets

| Dataset | Used for | Location |
|---|---|---|
| DrugBank DDI (86 interaction types, SMILES) | DDI type model | `TRAINING_DATA_DIR/DDi/drugbank_{training,validation,test}.csv` |
| all_ddi_data.csv (interacting / non-interacting pairs) | DDI detector | `TRAINING_DATA_DIR/DDi/` |
| FAERS adverse-event reports (processed) | ADR models | `…/processed/features_dataset.csv` |
| SIDER 4.1 (`drug_names.tsv`, `meddra_all_se`, `meddra_freq`) | side-effect frequencies, ADR prior features | `TRAINING_DATA_DIR/sider/` |
| PubChem | verified chemical structures for the drug dictionary | queried by `ml/build_vocabulary.py` |

Small real samples of each dataset are in `data/samples/`. The full datasets are not in the repository (size).

## Project structure

```
server.ts                      Node/Express: serves the React app, OCR (Tesseract.js), forwards analysis to the ML service
src/                           React frontend
  utils/prescriptionParser.ts  OCR text → patient details + medicines (uses shared/drug_vocabulary.json)
shared/drug_vocabulary.json    1,507 medicines, brand names, combination products, DrugBank IDs, SMILES
backend/                       Python ML service (FastAPI)
  routers/analysis.py          the prediction pipeline
  services/                    DDI / ADR inference, normaliser, clinical rules, fingerprints
  ml_artifacts/                trained models + metrics + knowledge files
ml/                            training scripts (train_ddi.py, train_adr.py, build_vocabulary.py, build_knowledge.py)
scripts/                       dev launcher, OCR and prediction test scripts
run_ml_eval.py                 live re-evaluation of the models + example predictions
data/sample_prescriptions/     14 sample prescriptions;  data/test_images/  2 extra unseen test images
```

## Run locally (Windows)

Requirements: Node.js 20+, Python 3.10–3.12.

```bash
npm install
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
npm run dev
```

Open http://localhost:3000. `npm run dev` starts both the ML service (port 8000) and the web server (port 3000).

Useful commands:

```bash
backend/.venv/Scripts/python run_ml_eval.py        # re-evaluate models on the test sets + live examples
npm run test:ocr                                   # OCR + parser on all sample prescriptions
backend/.venv/Scripts/python scripts/test_predictions.py   # 22 prescription test cases against the running API
```

## Retrain the models

Training needs `torch`, `rdkit`, `pandas`, `scikit-learn`, `xgboost` and the raw datasets (`TRAINING_DATA_DIR`).

```bash
python -m ml.build_vocabulary        # drug dictionary (PubChem + DrugBank matching)
python -m ml.build_knowledge         # SIDER side effects, DrugBank known pairs, interaction-type severities
python -m ml.train_ddi --task type   # ~15 min on CPU
python -m ml.train_ddi --task detect # ~40 min on CPU
python -m ml.train_adr               # ~3 min
```

## Deploy (free tier)

Two free Render web services are connected to this GitHub repository and redeploy automatically on every push:
* **Website + OCR (Node):** https://pharmaimedication.onrender.com – build `npm install && npm run build`, start `npm start`
* **ML service (Python):** https://pharmai-ml.onrender.com – build `pip install -r backend/requirements.txt`, start `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Free services sleep after 15 minutes of inactivity; the first request afterwards can take ~1 minute.

## Limitations

* OCR is designed for printed / computer-generated prescriptions; handwriting is not supported.
* The drug dictionary knows 1,507 medicines (132 curated with brands, classes and safety rules + all other named DrugBank drugs); other names are shown as "not recognised".
* ADR probabilities come from spontaneous FAERS reports: they indicate relative risk, not incidence in the population.
* Decision-support prototype for education – not a substitute for a pharmacist or physician.
