# PharmAI Technical Notes — Tech Stack Breakdown, Code Snippets & Interview Q&A Bank

This document serves as your technical revision notebook. It breaks down the complete **Tech Stack**, analyzes critical **Code Snippets line-by-line**, and provides an extensive **30+ Interview Question Bank** with exact technical answers.

---

## 1. Complete Tech Stack & Architectural Justification

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND LAYER                                         │
│ React 19 • Vite 6 • TypeScript 5.8 • TailwindCSS 4 • Recharts 3 • Material UI 9       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Axios (90s Timeout + Bearer Token Interceptors)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             MIDDLEWARE & VISION GATEWAY                                │
│ Node.js • Express 4 • Google GenAI (Gemini 3.6 Flash) • pdf-parse • ESBuild            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST API / CORS
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI ML INFERENCE ENGINE                               │
│ Python 3.11 • FastAPI • Uvicorn • XGBoost • Scikit-learn • SHAP • Joblib • Pandas      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Realtime Sync / Auth
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLOUD & STORAGE LAYER                                   │
│ Firebase Auth • Firebase Firestore (NoSQL Document DB) • ReportLab PDF Engine          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Backend & Machine Learning Stack

| Library / Tool | Purpose in PharmAI | Why It Was Chosen Over Alternatives |
| :--- | :--- | :--- |
| **FastAPI** | High-performance asynchronous REST API server for Python ML models. | **pydantic validation + ASGI performance.** ~3x faster than Flask; auto-generates OpenAPI (`/docs`) schemas. |
| **Uvicorn** | Lightning-fast ASGI web server implementation. | Built on `uvloop` and `httptools` for high-concurrency Python asynchronous execution. |
| **XGBoost** | Gradient boosted decision trees for multi-class DDI classification. | **Superior tabular performance.** Outperforms Deep Neural Networks on small/medium tabular clinical datasets; supports custom loss weighting. |
| **Scikit-Learn** | Binary relevance multi-label pipeline & pre-processing metrics. | Industry standard for data splitting, metrics evaluation (`f1_score`, `roc_auc_score`), and pipeline orchestration. |
| **SHAP** | Game-theoretic Shapley Additive Explanations for feature importance. | Provides **mathematically proven local feature contribution** values ($\sum \phi_i = f(x) - E[f(x)]$). |
| **Joblib** | Serialization and loading of trained binary model artifacts (`.pkl`). | Optimized for heavy NumPy array disk I/O; significantly faster than native Python `pickle`. |
| **Pandas / NumPy** | Matrix manipulation, feature vector construction, DataFrame reindexing. | Efficient vectorized array math and DataFrame manipulation for ML feature preparation. |

---

### Middleware & Gateway Stack

| Library / Tool | Purpose in PharmAI | Why It Was Chosen Over Alternatives |
| :--- | :--- | :--- |
| **Node.js + Express** | Frontend BFF (Backend-For-Frontend), static asset server, and Vite dev server. | Provides seamless single-port web serving and handles Node-native SDKs (`@google/genai`, `pdf-parse`). |
| **`@google/genai` (Gemini 3.6 Flash)** | Multimodal Vision OCR extraction from prescription images and PDFs. | Supports direct base64 image/PDF vision prompts; returns structured JSON with high confidence. |
| **`pdf-parse`** | Server-side binary PDF text extraction stream. | Runs locally without external network calls; parses digital text from uploaded PDF prescriptions. |

---

### Frontend & UI Stack

| Library / Tool | Purpose in PharmAI | Why It Was Chosen Over Alternatives |
| :--- | :--- | :--- |
| **React 19** | Modern component-driven User Interface framework. | Concurrent rendering capabilities, clean hook state management, and optimized virtual DOM updates. |
| **TypeScript 5.8** | Static type safety across component props, API payloads, and state. | Prevents runtime `TypeError` / `NullPointer` exceptions; enforces strict interface contracts (`types.ts`). |
| **TailwindCSS v4** | Utility-first CSS styling engine with `@tailwindcss/vite`. | Rapid modern UI development with small CSS bundle footprints and zero runtime CSS-in-JS overhead. |
| **Recharts 3** | Responsive vertical bar chart visualizer for SHAP values. | Native React SVG rendering; handles dynamic horizontal/vertical layouts with clean tooltips. |
| **Firebase Auth & Firestore** | Authentication state listener & user-isolated NoSQL report storage. | Enables `onAuthStateChanged` session persistence and real-time NoSQL snapshot synchronization (`onSnapshot`). |

---

## 2. Code Snippets Deep-Dive & Line-by-Line Defense

When an interviewer asks you to open your editor or explain a snippet, use these line-by-line defenses:

### Snippet 1: Model Prewarming & LRU Caching (`backend/services/adr_inference.py`)

```python
@functools.lru_cache(maxsize=1)
def load_hybrid_system():
    LOGGER.info("Loading ADR Hybrid System models into memory...")
    model = joblib.load(BEST_MODEL_PATH)
    with open(FEATURE_COLUMNS_PATH, "r") as f: features = json.load(f)
    with open(TARGET_COLUMNS_PATH, "r") as f: targets = json.load(f)
    return model, features, targets
```

* **Interviewer Question:** *"Why use `@functools.lru_cache(maxsize=1)` here?"*
* **Line-by-Line Explanation:**
  * `joblib.load` opens a file handle, reads binary data from disk, and deserializes Python objects.
  * Without `@lru_cache`, **every incoming API request would re-read the file from disk**, adding 800ms–2,500ms of unnecessary I/O overhead.
  * `@lru_cache(maxsize=1)` ensures the binary model is loaded into RAM **exactly once** on the first call or server startup (`prewarm_ml_models()`), making all subsequent lookups $\mathcal{O}(1)$ pointer operations.

---

### Snippet 2: Canonical Pharmacopeia Verification (`backend/routers/analysis.py`)

```python
VERIFIED_DRUGS = {
    "paracetamol", "acetaminophen", "ibuprofen", "naproxen", "aspirin", "warfarin", 
    "lisinopril", "metformin", "atorvastatin", "clopidogrel", "omeprazole", "pantoprazole", ...
}

med_list = []
for m in payload.medications:
    m_dict = m.model_dump()
    m_clean = m_dict["name"].lower()
    is_ver = any(k in m_clean for k in VERIFIED_DRUGS)
    m_dict["isVerified"] = is_ver
    med_list.append(m_dict)

# Safety: Only verified drugs are passed to risk model and DDI interaction matrix
verified_drug_names = [m["name"].lower() for m in med_list if m["isVerified"]]
```

* **Interviewer Question:** *"Why filter unverified drugs before passing them to the ML pipeline?"*
* **Line-by-Line Explanation:**
  * `VERIFIED_DRUGS` is defined as a Python `set` for $\mathcal{O}(1)$ average hash-table lookup.
  * If a user types a misspelled drug (e.g., `"Wafarin 500mg"` or `"RandomSubstance"`), passing an unverified string into the chemical SMILES lookup dictionary would result in `KeyError` or produce garbage feature vectors ($0$-vectors).
  * Excluding unverified drugs from `verified_drug_names` acts as a **Pipeline Guardrail**, preventing hallucinated or noisy chemical pairings from skewing the XGBoost model predictions.

---

### Snippet 3: Multimodal Vision Ingestion (`server.ts`)

```typescript
const cleanBase64 = imageBase64.replace(/^data:(image\/\w+|application\/pdf);base64,/, "");
const isPdf = imageBase64.startsWith("data:application/pdf");
const mimeType = isPdf ? "application/pdf" : "image/jpeg";

const response = await ai.models.generateContent({
  model: "gemini-3.6-flash",
  contents: {
    parts: [
      { inlineData: { mimeType, data: cleanBase64 } },
      { text: `Extract all text, patient demographics, and prescribed medication items...` }
    ]
  }
});
```

* **Interviewer Question:** *"How does your server handle base64 prescription processing securely?"*
* **Line-by-Line Explanation:**
  * The Regex `.replace()` strips the Data URI prefix (`data:image/png;base64,`) to extract the raw base64 string.
  * MIME type inspection detects whether the file is a PDF or an image, routing the appropriate `inlineData` structure to the Gemini API.
  * If Gemini Vision fails (e.g., network error), code catches the exception and falls back to `pdf-parse` or local drug keyword scanners.

---

### Snippet 4: SHAP Probability Shift Calculation (`src/components/ShapExplainabilityModule.tsx`)

```typescript
const positiveImpactSum = shapFeatures
  .filter((f) => f.impactValue > 0)
  .reduce((acc, f) => acc + f.impactValue, 0);

const negativeImpactSum = shapFeatures
  .filter((f) => f.impactValue < 0)
  .reduce((acc, f) => acc + f.impactValue, 0);

const baselineRiskPercent = 15; // Standard cohort baseline risk
const calculatedRiskPercent = Math.min(
  Math.max(Math.round((baselineRiskPercent / 100 + positiveImpactSum + negativeImpactSum) * 100), 10),
  98
);
```

* **Interviewer Question:** *"How do you calculate the final calculated risk from Shapley values?"*
* **Line-by-Line Explanation:**
  * SHAP values are additive: $\text{FinalRisk} = \text{Baseline} + \sum \phi_i$.
  * `positiveImpactSum` isolates features that **increase** risk (e.g., Age > 65, eGFR < 60).
  * `negativeImpactSum` isolates features that **decrease** risk (e.g., low dosage).
  * `Math.min(Math.max(..., 10), 98)` applies a bounding box to guarantee probabilities stay within realistic clinical display bounds (10% to 98%).

---

### Snippet 5: Axios Request Interceptor & Timeout Handling (`src/api/client.ts`)

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s timeout threshold
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rx_firebase_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

* **Interviewer Question:** *"How do you pass authentication tokens to your FastAPI backend?"*
* **Line-by-Line Explanation:**
  * An Axios **Request Interceptor** automatically captures the Firebase Auth JWT token stored in `localStorage`.
  * It injects the token into the `Authorization: Bearer <token>` HTTP header for every outbound API request.
  * 90,000 ms (90s) timeout prevents premature drop-offs during high-resolution OCR image analysis.

---

### Snippet 6: Inverse Class Weight Formula (`run_ml_eval.py`)

```python
# Class Weight Formula for 86 Imbalanced DDI Classes:
# W_k = N / (K * N_k)
# Majority Class (#25) Weight = 38337 / (86 * 12149) = 0.036
# Rare Class (#42) Weight     = 38337 / (86 * 18)    = 24.76
```

* **Interviewer Question:** *"Explain the math behind your class balancing technique."*
* **Line-by-Line Explanation:**
  * $N = 38,337$ (Total samples), $K = 86$ (Total classes), $N_k$ (Samples in class $k$).
  * For majority class #25 ($12,149$ samples), weight is $0.036$, meaning a misclassification incurs a small penalty.
  * For rare class #42 ($18$ samples), weight is $24.76$, meaning a misclassification incurs a **$24.76\times$ higher loss penalty**, forcing XGBoost loss optimization to prioritize rare DDI patterns.

---

## 3. Comprehensive Interview Question Bank (30+ Q&A)

### Section A: Technical & Full-Stack Coding

#### Q1: Why did you use `tsx` to run `server.ts` during development instead of `ts-node` or compiling with `tsc`?
* **Answer:** `tsx` is powered by `esbuild`, making typescript execution up to $20\times$ faster than traditional `ts-node`. It supports ESM modules out of the box without complex `tsconfig` compilation steps.

#### Q2: How does the Vite dev server integrate with your Express application in `server.ts`?
* **Answer:** In development mode (`NODE_ENV !== "production"`), Express creates a Vite server in middleware mode (`createViteServer({ server: { middlewareMode: true } })`). Requests not handled by Express API routes fall through to `vite.middlewares`, which dynamically transforms and serves TypeScript/React components with Hot Module Replacement (HMR).

#### Q3: How do you handle CORS cross-origin requests securely in FastAPI?
* **Answer:** I configured `CORSMiddleware` in `backend/main.py` with explicit `allow_origins` matching trusted local origins (`http://localhost:5173`, `http://localhost:3000`), enabling `allow_credentials=True`, and setting `max_age=600` to cache preflight `OPTIONS` requests for 10 minutes.

#### Q4: What is the purpose of `reindex(columns=features)` in Pandas before calling `model.predict_proba()`?
* **Answer:** Scikit-learn and XGBoost models require feature input matrices to have **exact column ordering** matching the training state. `reindex(columns=features)` ensures that any missing keys are filled with `NaN` and features are ordered strictly according to `feature_columns.json`.

---

### Section B: Machine Learning & Explainable AI (XAI)

#### Q5: What is the difference between Binary Relevance and Classifier Chains in multi-label classification?
* **Answer:** 
  * *Binary Relevance:* Trains $L$ independent binary models (one per label). Fast, parallelizable, but ignores label correlations.
  * *Classifier Chains:* Chains binary models sequentially, passing previous label predictions as features. Captures correlations but suffers from error propagation.
  * *Choice:* I chose Binary Relevance for ADR prediction due to parallel training capability and isolated model hyperparameter tuning.

#### Q6: How do Shapley values satisfy the "Additivity Property"?
* **Answer:** In game theory, Shapley value additivity guarantees that for any two independent games (or combined models) $v$ and $w$, the Shapley value of feature $i$ in game $v+w$ is simply $\phi_i(v + w) = \phi_i(v) + \phi_i(w)$. In our system, this guarantees that feature risk contributions sum up linearly to the final model prediction.

#### Q7: What is the mathematical definition of ROC-AUC vs. PR-AUC, and why does PR-AUC matter for imbalanced clinical data?
* **Answer:** 
  * $\text{ROC-AUC}$ plots True Positive Rate vs. False Positive Rate. On highly imbalanced datasets where negative samples dominate, False Positive Rate stays tiny, making ROC-AUC look deceptively high ($>0.95$).
  * $\text{PR-AUC}$ plots Precision vs. Recall. It focuses exclusively on the positive class, making it the true indicator of model quality on imbalanced healthcare datasets.

#### Q8: How do you extract SMILES strings for chemical interaction modeling?
* **Answer:** Mapped drug names to canonical SMILES (Simplified Molecular Input Line Entry System) representations stored in `SMILES_DB` (e.g., Aspirin $\rightarrow$ `CC(=O)OC1=CC=CC=C1C(=O)O`). The SMILES strings are passed into `DDIInferenceEngine` to evaluate functional group interactions.

---

### Section C: System Design, Reliability & Security

#### Q9: How do you prevent multi-tenant data leaks in Firebase Firestore?
* **Answer:** Firestore document paths are structured hierarchically as `users/{userId}/analyses/{analysisId}`. In `src/firebase.ts`, helper functions validate `userId` before executing queries. In production, Firestore Security Rules enforce `request.auth.uid == userId`.

#### Q10: How would you scale the FastAPI backend to handle 10,000 concurrent requests per second?
* **Answer:**
  1. **Containerization & Kubernetes:** Package FastAPI in Docker containers and deploy on GKE/EKS with Horizontal Pod Autoscaling (HPA) based on CPU/RAM metrics.
  2. **Gunicorn + Uvicorn Workers:** Run `gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app` per container.
  3. **Redis Caching Tier:** Cache frequent drug pair interaction lookups in a Redis cluster to avoid re-evaluating ML models for identical queries.

#### Q11: What steps did you take to secure API credentials and environment variables?
* **Answer:** Kept sensitive keys (`GEMINI_API_KEY`, Firebase Service Accounts) in `.env` files managed by `dotenv`. Excluded `.env` and `firebase-credentials.json` from Git via `.gitignore`. Rendered frontend variables via Vite `import.meta.env.VITE_*` prefixes.

---

### Section D: Edge Cases & Troubleshooting

#### Q12: What happens if a patient has severe renal impairment (`eGFR < 15 mL/min`)?
* **Answer:** Track 1 ADR engine triggers a high `renal_impairment` flag, increasing the `impactValue` of nephrotoxic drugs (e.g., Lisinopril, Ibuprofen) in the SHAP vector, and automatically appends a clinical recommendation: *"Renal Function Notice (eGFR <15): Dosage adjustment required."*

#### Q13: How does your system handle duplicate medications in a single prescription?
* **Answer:** The dynamic evaluator in `server.ts` scans normalized medicine names for duplicate keywords. If detected, it raises a **Critical Risk Duplicate Medication Alert** ("Therapeutic Duplication & Overdosage Risk"), flagging accidental double-dosing.

#### Q14: How do you deal with client-side network disconnects mid-analysis?
* **Answer:** Axios requests rejected due to `Network Error` or timeout trigger custom interceptor handlers. The React state falls back to local storage history (`HistoryReports.tsx`), allowing the physician to view previously saved snapshots offline.

---

## 📝 Key Numbers & Quick Facts Cheat Sheet

* **FastAPI Server Port:** `8000`
* **Node/Express Server Port:** `3000`
* **Vite Local Dev Port:** `5173`
* **Dataset Size:** 38,337 Test DDI Pairs | 1.25M FAERS Event Reports | 139,756 SIDER Side Effects
* **Number of DDI Classes:** 86 Mechanism Classes
* **Axios Timeout:** 90,000 ms (90 Seconds)
* **Hybrid CDSS Accuracy:** 91.40%
* **Critical DDI Recall:** 100.00% (Zero False Negatives)
* **Pre-warmed Inference Latency:** 510 ms
