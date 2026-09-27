import { AnalysisResult, PatientRecord, ClinicianUser } from '../types';
import { enrichAnalysisWithDetails } from '../utils/pharmacology';
import sampleAnalysis from './sampleAnalysis.json';

export const INITIAL_CLINICIAN: ClinicianUser = {
  id: 'GUEST-001',
  name: 'Guest User',
  title: 'Guest Session • Not Logged In',
  department: 'General Public',
  hospital: 'Unauthenticated Session',
  email: '',
  role: 'Unauthenticated Guest',
  npiNumber: '',
  accountType: 'patient',
  authenticated: false
};


export const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: 'PAT-1092',
    mrn: 'MRN-9023411',
    name: 'Eleanor Vance',
    age: 72,
    gender: 'Female',
    bloodType: 'A+',
    allergies: ['Penicillin G', 'Sulfa Drugs'],
    chronicConditions: ['Atrial Fibrillation', 'Hypertension', 'Type 2 Diabetes', 'Stage 3a CKD'],
    currentVitals: {
      hr: 78,
      bp: '134/84',
      spo2: 98,
      temp: 36.8,
      rr: 16
    },
    activePrescriptions: ['Warfarin 5mg', 'Lisinopril 20mg', 'Metformin 1000mg', 'Aspirin 81mg'],
    lastUpdated: '10 mins ago'
  },
  {
    id: 'PAT-2041',
    mrn: 'MRN-8812034',
    name: 'Marcus Brody',
    age: 64,
    gender: 'Male',
    bloodType: 'O+',
    allergies: ['Codeine'],
    chronicConditions: ['Hyperlipidemia', 'Coronary Artery Disease', 'GERD'],
    currentVitals: {
      hr: 68,
      bp: '122/78',
      spo2: 99,
      temp: 36.6,
      rr: 14
    },
    activePrescriptions: ['Atorvastatin 40mg', 'Clopidogrel 75mg', 'Omeprazole 20mg'],
    lastUpdated: '25 mins ago'
  },
  {
    id: 'PAT-3098',
    mrn: 'MRN-7734190',
    name: 'Sophia Tanaka',
    age: 48,
    gender: 'Female',
    bloodType: 'B-',
    allergies: ['None Reported'],
    chronicConditions: ['Major Depressive Disorder', 'Chronic Musculoskeletal Pain'],
    currentVitals: {
      hr: 82,
      bp: '118/76',
      spo2: 97,
      temp: 37.0,
      rr: 18
    },
    activePrescriptions: ['Fluoxetine 20mg', 'Tramadol 50mg PRN'],
    lastUpdated: '1 hour ago'
  }
];

// Demo result = real output of the ML pipeline (see src/data/sampleAnalysis.json).
// The demo button re-runs the live pipeline; this stored copy is only the offline fallback.
export const DEMO_REQUEST = sampleAnalysis.demoRequest;
export const SAMPLE_ANALYSES: AnalysisResult[] = [enrichAnalysisWithDetails(sampleAnalysis.result as unknown as AnalysisResult)];

// Metrics are the real held-out test-set results from ml/train_ddi.py and ml/train_adr.py
export const AI_MODELS_INFO = [
  {
    name: 'Tesseract OCR (LSTM)',
    category: 'Text Extraction',
    accuracy: 'Printed Rx',
    description: 'Open-source LSTM OCR engine (Tesseract.js, English model) reads printed and e-prescriptions. Extracted medicines are shown for review before analysis.',
    badge: 'OCR Engine'
  },
  {
    name: 'Drug-Name Normalisation',
    category: 'Brand / Generic Mapping',
    accuracy: '132 generics',
    description: 'Maps Indian and US brand names, combination products (e.g. Combiflam = Ibuprofen + Paracetamol), salt forms and OCR spelling errors to generic ingredients linked to PubChem and DrugBank IDs.',
    badge: 'Normalisation'
  },
  {
    name: 'DDI Interaction Detector (MLP)',
    category: 'Deep Learning Classifier',
    accuracy: '92.1% acc',
    description: 'Neural network on Morgan fingerprints (2 x 1024 bits) predicting whether two drugs interact. Test ROC-AUC 0.966, F1 0.944 on 59,272 held-out pairs.',
    badge: 'DDI Model'
  },
  {
    name: 'DDI Interaction-Type Classifier (MLP)',
    category: 'Deep Learning Classifier',
    accuracy: '95.7% acc',
    description: 'Classifies the interaction into one of 86 DrugBank mechanism types. Test accuracy 95.7% and macro-F1 0.937 on 38,337 pairs (previous XGBoost: 77.4%).',
    badge: 'DDI Model'
  },
  {
    name: 'ADR Risk Model (XGBoost)',
    category: 'Machine Learning Classifier',
    accuracy: 'AUC 0.70',
    description: 'Eight XGBoost classifiers trained on 27,312 FAERS reports predict bleeding, kidney, liver, heart-rhythm, potassium, blood-pressure, GI and neurological reaction risk (macro ROC-AUC 0.702, previously 0.589).',
    badge: 'ADR Model'
  },
  {
    name: 'Clinical Rules + DrugBank',
    category: 'Knowledge-Based Safety Layer',
    accuracy: 'Curated',
    description: 'Curated rules for well-established interactions (anticoagulants, serotonin syndrome, hyperkalemia, QT prolongation...) provide severity and advice; DrugBank-recorded interactions are flagged as confirmed.',
    badge: 'Expert System'
  },
  {
    name: 'SIDER 4.1 Side Effects',
    category: 'Side-Effect Frequencies',
    accuracy: '121 drugs',
    description: 'Side-effect frequencies from drug labels (SIDER 4.1) shown per medicine.',
    badge: 'Side Effect Mapping'
  },
  {
    name: 'TreeSHAP Explanations',
    category: 'Explainable AI (XAI)',
    accuracy: 'Exact',
    description: 'Exact Shapley-value contributions from the XGBoost ADR model show which medicines and patient factors raised or lowered the predicted risk.',
    badge: 'XAI'
  }
];
