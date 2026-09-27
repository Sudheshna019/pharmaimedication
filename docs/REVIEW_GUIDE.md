# PharmAI – Final Review Guide

Everything in this guide matches the current code and the real test results.

---

## 1. One-minute summary

PharmAI reads a printed prescription, recognises the medicines, and predicts
(1) **drug–drug interactions** and (2) **adverse drug reactions** for the patient.

* **OCR:** Tesseract (LSTM) reads the image → the parser finds medicines, dose, frequency, patient age/sex.
* **Normalisation:** 1,507 medicines (140 curated common drugs with Indian/US brand names and safety rules, plus all other named DrugBank drugs) + combination products
  (e.g. *Combiflam = Ibuprofen + Paracetamol*, *Pantocid = Pantoprazole*), salt forms and OCR spelling errors.
  Every drug is linked to its PubChem structure and DrugBank ID.
* **Patient details** (name, age, sex) are read from the prescription itself and used on the results page and the printed/downloaded report.
* **DDI:** two neural networks on chemical fingerprints + DrugBank records + curated clinical rules.
* **ADR:** 8 XGBoost models trained on FAERS reports, explained with TreeSHAP; SIDER side-effect frequencies.

---

## 2. Demo script (≈ 5 minutes)

Start: `npm run dev` → open http://localhost:3000 → sign in.

1. **Analyze Prescription → upload `data/sample_prescriptions/sample_eprescription_1_warfarin_aspirin…jpg`**
   → *Extract Medicines & Predict Risks*. Point out: patient name/age/sex and both medicines come from the image.
2. Results page:
   * **Critical** Warfarin + Aspirin card – why it happens, symptoms to watch, safer alternative;
     confidence = the ML interaction detector's probability.
   * **Predicted Adverse Side Effects:** "Bleeding risk" from the ADR model plus SIDER side-effect frequencies.
   * *View Printable Report* – same patient details and results (Print → Save as PDF).
3. **Unseen image:** upload `data/test_images/unseen_rx_1_augmentin_pand_dolo.jpg` (made for testing, different layout,
   rotated and blurred). Shows brand/combination recognition: Augmentin, Pan D, Dolo 650, Montair LC.
4. **Brand + duplicate detection** (Manual Entry): *Dolo 650* + *Combiflam* → High "Duplicate ingredient: Paracetamol".
5. **Safe prescription:** *Montelukast + Cetirizine* → Low risk, no significant interaction.
6. **Analytics tab:** model test scores before vs after retraining.
7. Terminal: `backend\.venv\Scripts\python run_ml_eval.py` – re-computes the test accuracy live (95.69 %).

---

## 3. The numbers (held-out test sets)

| Model | Test data | Result | Before |
|---|---|---|---|
| DDI interaction-type MLP (86 classes) | 38,337 DrugBank pairs | **95.69 % accuracy**, macro-F1 **0.937** | XGBoost 77.41 %, macro-F1 0.732 |
| DDI interaction detector MLP | 59,272 pairs | **92.07 % accuracy**, ROC-AUC **0.966**, F1 0.944, recall 0.958 | – |
| ADR XGBoost (8 categories) | 4,096 FAERS reports | macro ROC-AUC **0.702**, macro F1 0.184 | 0.589 |

ADR per category (ROC-AUC): hyperkalemia 0.817 · kidney 0.727 · liver 0.721 · GI 0.696 · bleeding 0.673 · neurological 0.668 ·
hypotension 0.654 · arrhythmia 0.659.

OCR: all 14 sample prescriptions + 2 unseen test images – every medicine correctly extracted (`npm run test:ocr`).

---

## 4. How each part works

### 4.1 OCR and parsing (`server.ts`, `src/utils/prescriptionParser.ts`)
* Browser resizes the image (small images are upscaled to ≥1400 px for OCR), PDFs are rendered to an image;
  digital PDFs use their text layer directly.
* Tesseract.js (LSTM, `eng.traineddata`) extracts the text on the Node server.
* The parser matches drug names with longest-match n-grams against the dictionary, handles "PanD"/"TabPanD"
  (OCR merged words), salt words ("Losartan **Potassium**" is one drug), fuzzy matching for OCR typos
  (edit distance, e.g. "Warfarn" → Warfarin), then extracts dose (`650mg`, "Dolo 650"), frequency (`1-0-1`, BD, TDS,
  "every 6 hours", "at bedtime") and duration from the line and the following "Sig:/Directions:" lines.

### 4.2 Drug dictionary (`ml/build_vocabulary.py` → `shared/drug_vocabulary.json`)
* 132 generics with class + brand synonyms, 20 combination brands.
* Structure from PubChem, matched to the DrugBank DDI dataset by InChIKey → the model gets the *same* SMILES it was
  trained on. 129/132 drugs are in the DDI dataset.
* Bug fixed here: the old code used wrong SMILES (the "warfarin" string was actually trioxsalen, DB04571 – the first
  row of the dataset), and several others were wrong.

### 4.3 DDI models (`ml/train_ddi.py`, `backend/services/ddi_inference.py`)
* Features: Morgan fingerprints (radius 2, 1024 bits) of drug 1 and drug 2, concatenated (2048 inputs).
* **Type model:** MLP 2048→1024→512→86 (BatchNorm, ReLU, dropout 0.3, AdamW, early stopping on validation).
* **Detector:** same architecture with 1 sigmoid output, trained on interacting vs non-interacting pairs.
* Trained with PyTorch; BatchNorm is folded into the weights and exported to NumPy (`.npz`), so the API needs no
  PyTorch (small enough for free hosting). Export verified: max difference 1e-6.
* **Only meaningful pairs are shown.** Every pair of medicines is checked, but a pair appears only if a clinical rule,
  a serious DrugBank-recorded interaction, or a very confident AI prediction of a serious interaction type says so.
  Example: 5 medicines where only medicine 2 + 3 interact → exactly one card.
* Direction: the interaction text has #Drug1/#Drug2, so both orders are predicted and the more confident one is used.
* Bug fixed: the old code looked up the description by the wrong column (model class k ↔ "DDI type k+1"),
  so every warning text was wrong (e.g. Warfarin + Aspirin showed "AV block").

### 4.4 Hybrid decision (`backend/routers/analysis.py`, `backend/services/clinical_rules.py`)
For every pair of ingredients:
1. **Curated clinical rule** (anticoagulant + NSAID/antiplatelet, clopidogrel + omeprazole, serotonin syndrome,
   hyperkalemia, QT prolongation, digoxin, statin + macrolide, opioid + benzodiazepine, duplications …) → severity + advice.
2. Otherwise **recorded in DrugBank** → severity from the interaction type, one level lower (database-only
   interactions are mostly minor pharmacokinetic effects).
3. Otherwise ML-only prediction (p ≥ 0.8) → shown as *Low (unconfirmed)*.
* Same ingredient in two products (Dolo + Combiflam) → High "duplicate ingredient".
* Why hybrid? The ML model says whether/how drugs interact, but DrugBank also lists many minor interactions,
  so clinical severity needs expert knowledge. The rules also give explanations and safer alternatives.

### 4.5 ADR models (`ml/train_adr.py`, `backend/services/adr_inference.py`)
* Data: 27,312 FAERS reports (age, sex, list of drugs, list of reactions).
* Labels: 8 categories from MedDRA reaction keywords (kidney, bleeding, liver, arrhythmia, hyperkalemia,
  hypotension, GI, neurological).
* Features (495): age, sex, drug count, multi-hot of the 423 most frequent drugs, drug-class counts,
  SIDER prior (how many of the drugs list a side effect of that category).
* Model: one XGBoost per category (binary relevance), early stopping, decision threshold chosen on validation F1.
* Output: probability, relative risk (× average report) and **exact TreeSHAP** values (XGBoost `pred_contribs`).
* Bug fixed: the old model's 12 risk columns were always 0 in training → it only used age/drug count (AUC ≈ 0.59).

### 4.6 SIDER side effects (`ml/build_knowledge.py`)
Top label frequencies per drug (e.g. Metformin: diarrhoea 16.7 %; Amlodipine: headache 7.3 %, oedema 5.3 %).
Terms describing the treated disease or neonatal/IV-only products are filtered out.

---

## 5. Likely questions – honest answers

**Q: Is the 95.7 % realistic?**
It is the accuracy on the official DrugBank test split (random pair split). Drugs in the test set also appear in
training (with other partners), which is the standard benchmark setting (DeepDDI reported 92.4 % on the same
86-class task). For completely new drugs accuracy would be lower.

**Q: Why is the ADR AUC only 0.70?**
FAERS is spontaneous-report data: noisy, no denominator, the reaction often comes from the underlying disease.
0.70 is a clear improvement over 0.59 and the model is used as a *risk signal* (relative risk + SHAP), not a diagnosis.

**Q: Why an MLP instead of XGBoost for DDI?**
Both were tried: XGBoost (100 trees, 512-bit FP) reached 77.4 %; the MLP on 1024-bit fingerprints reaches 95.7 %.
Fingerprint bits are sparse, high-dimensional inputs where a neural network learns combinations of substructures better.

**Q: How do you handle class imbalance?**
DDI types are highly imbalanced (largest class 31.7 %, smallest a few pairs). We report macro-F1 (0.937), which weights
every class equally, not only accuracy. ADR: decision thresholds are tuned on validation F1 per category.

**Q: What does SHAP show?**
Exact Shapley values of the XGBoost ADR model: how much each factor (a drug, a drug class, age, number of drugs)
moved the predicted log-odds from the baseline for this patient.

**Q: What if OCR makes a mistake?**
Fuzzy matching corrects small spelling errors of common drugs ("Warfarn" → Warfarin). Names that are not recognised are
listed but not analysed; Manual Entry can be used for those.

**Q: Handwritten prescriptions?**
Not supported – Tesseract is designed for printed text. The system targets printed/e-prescriptions.

**Q: Is it free to deploy?**
Yes: Tesseract.js (no API key), NumPy/XGBoost inference, two free Render services.

---

## 6. Things that were fixed in the final version

* OCR returned hardcoded text for the sample files (matched by *file name*) and a fixed fake prescription for any other image → replaced by real Tesseract OCR.
* The web app never called the ML models (all results came from if/else rules in `server.ts`) → now every analysis runs the Python ML service.
* Wrong SMILES and wrong DDI description mapping → fixed and verified against DrugBank IDs.
* ADR model trained on all-zero features → retrained (AUC 0.589 → 0.702).
* Fake numbers removed (dashboard counters, "98.4 %" confidence, benchmark chart, `run_ml_eval.py` hardcoded results, fake login/PDF/knowledge-base endpoints).

---

## 7. Showing accuracy / F1 in the terminal

```
cd C:\Users\91970\Downloads\pharmaimedication
backend\.venv\Scripts\python run_ml_eval.py
```
Takes ~1 minute and recomputes everything from the saved models and the held-out test data:
DDI type model (accuracy, macro/weighted precision-recall-F1), DDI detector (accuracy, precision, recall, F1,
ROC-AUC, PR-AUC), ADR models (ROC-AUC, PR-AUC, precision, recall, F1, accuracy per category) and 4 live predictions.

Stored results of training: `backend/ml_artifacts/ddi/ddi_type_metrics.json`, `ddi_detect_metrics.json`,
`backend/ml_artifacts/adr/adr_metrics.json`. Training code: `ml/train_ddi.py`, `ml/train_adr.py`.
