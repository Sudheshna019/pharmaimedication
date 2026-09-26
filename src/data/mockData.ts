import { AnalysisResult, PatientRecord, ClinicianUser } from '../types';
import { enrichAnalysisWithDetails } from '../utils/pharmacology';

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

export const COMMON_MEDICATIONS = [
  'Paracetamol (Dolo 650 / Crocin)',
  'Rantac (Ranitidine 150mg)',
  'Combiflam (Ibuprofen + Paracetamol)',
  'Pantocid (Pantoprazole 40mg)',
  'Warfarin Sodium',
  'Aspirin (Acetylsalicylic Acid)',
  'Lisinopril',
  'Metformin HCl',
  'Simvastatin',
  'Atorvastatin',
  'Clopidogrel',
  'Omeprazole',
  'Azithromycin',
  'Cetirizine HCl',
  'Levothyroxine Sodium',
  'Amoxicillin-Clavulanate',
  'Fluoxetine',
  'Tramadol HCl',
  'Cap SM Fibro',
  'Spironolactone',
  'Amlodipine Besylate',
  'Metoprolol Succinate',
  'Gabapentin',
  'Hydrochlorothiazide',
  'Losartan Potassium',
  'Furosemide',
  'Ibuprofen',
  'Prednisone'
];

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

const RAW_SAMPLE_ANALYSES: AnalysisResult[] = [
  {
    id: 'ANALYSIS-2026-0891',
    timestamp: '2026-07-22 08:30:12',
    patientId: 'PAT-1092',
    patientName: 'Eleanor Vance',
    patientAge: 72,
    patientGender: 'Female',
    prescribingDoctor: 'Dr. Robert Hayes, MD',
    status: 'Completed',
    overallRiskLevel: 'Critical',
    overallConfidenceScore: 0.96,
    detectedMedicines: [
      { id: 'm1', name: 'Warfarin Sodium', dosage: '5 mg', frequency: 'Once daily (bedtime)', route: 'Oral', confidence: 0.98, sourceDB: 'DrugBank DB00682' },
      { id: 'm2', name: 'Aspirin (Acetylsalicylic Acid)', dosage: '81 mg', frequency: 'Once daily (morning)', route: 'Oral', confidence: 0.97, sourceDB: 'SIDER 4.1' },
      { id: 'm3', name: 'Lisinopril', dosage: '20 mg', frequency: 'Once daily', route: 'Oral', confidence: 0.95, sourceDB: 'FAERS Q3' },
      { id: 'm4', name: 'Metformin HCl', dosage: '1000 mg', frequency: 'Twice daily with meals', route: 'Oral', confidence: 0.96, sourceDB: 'DrugBank DB00331' }
    ],
    drugInteractions: [
      {
        id: 'i1',
        med1: 'Warfarin Sodium',
        med2: 'Aspirin',
        severity: 'Critical',
        description: 'Combined antiplatelet and oral anticoagulant therapy significantly multiplies risk of major internal gastrointestinal & intracranial bleeding.',
        mechanism: 'Dual pathway suppression: Warfarin inhibits hepatic Vitamin K clotting factors II, VII, IX, X while Aspirin irreversibly acetylates COX-1 platelet enzymes.',
        clinicalRecommendation: 'Re-evaluate clinical necessity of aspirin therapy in Warfarin-treated non-valvular AFib. Target INR 2.0-2.5. Co-prescribe PPI (Pantoprazole).',
        confidenceScore: 0.98
      },
      {
        id: 'i2',
        med1: 'Lisinopril',
        med2: 'Aspirin',
        severity: 'Medium',
        description: 'High or moderate doses of NSAIDs/Aspirin may attenuate antihypertensive and vasodilatory effects of ACE inhibitors.',
        mechanism: 'Prostaglandin inhibition diminishes renal afferent arteriolar vasodilation counteracting Lisinopril efficacy.',
        clinicalRecommendation: 'Monitor resting blood pressure and renal function panel (serum creatinine & BUN) closely.',
        confidenceScore: 0.88
      }
    ],
    sideEffects: [
      { medName: 'Warfarin Sodium', effect: 'Major Gastrointestinal Hemorrhage', frequencyPercent: 8.5, severity: 'Severe', category: 'Hematologic' },
      { medName: 'Warfarin Sodium', effect: 'Gingival Bleeding & Epistaxis', frequencyPercent: 14.0, severity: 'Moderate', category: 'Mucocutaneous' },
      { medName: 'Aspirin', effect: 'Gastric Erosion & Dyspepsia', frequencyPercent: 16.5, severity: 'Moderate', category: 'Gastrointestinal' },
      { medName: 'Lisinopril', effect: 'Dry Idiopathic Cough', frequencyPercent: 18.2, severity: 'Mild', category: 'Respiratory' },
      { medName: 'Metformin HCl', effect: 'Lactic Acidosis (CKD risk)', frequencyPercent: 0.05, severity: 'Severe', category: 'Metabolic' }
    ],
    clinicalRecommendations: [
      'CRITICAL WARNING: Co-prescription of Warfarin and Aspirin elevates major bleeding hazard ratio by 2.41x.',
      'Recommend immediate PT/INR lab testing; current target INR should be re-evaluated.',
      'Check eGFR due to patient renal history (Stage 3a CKD) to ensure Metformin dosing remains appropriate.',
      'Provide patient clear counseling regarding signs of occult bleeding (dark tarry stools, easy bruising).'
    ],
    shapFeatures: [
      { featureName: 'Warfarin + Aspirin Dual Anticoagulation', impactValue: 0.49, category: 'Drug Synergy', direction: 'increases_risk', explanation: 'Primary contributor to critical hemorrhage prediction vector in Random Forest & XGBoost ensembles.' },
      { featureName: 'Patient Age (72 Years)', impactValue: 0.21, category: 'Demographics', direction: 'increases_risk', explanation: 'Age > 65 correlates with fragile microvasculature and delayed hepatic CYP2C9 metabolism.' },
      { featureName: 'Stage 3a CKD (eGFR 58 mL/min)', impactValue: 0.16, category: 'Renal Function', direction: 'increases_risk', explanation: 'Impaired clearance prolongs active antiplatelet & drug-metabolite half-lives.' },
      { featureName: 'Low Dose Aspirin (81mg Regimen)', impactValue: -0.08, category: 'Dose Mitigation', direction: 'decreases_risk', explanation: 'Low dose reduces systemic COX-1 inhibition severity compared to full analgesic aspirin dosing.' }
    ],
    doctorNotes: 'Patient reviewed during outpatient anticoagulation clinic. INR verified at 2.8. Discontinued aspirin after cardiology consult.'
  },
  {
    id: 'ANALYSIS-2026-0842',
    timestamp: '2026-07-21 14:15:40',
    patientId: 'PAT-2041',
    patientName: 'Marcus Brody',
    patientAge: 64,
    patientGender: 'Male',
    prescribingDoctor: 'Dr. Anita Patel, MD',
    status: 'Completed',
    overallRiskLevel: 'High',
    overallConfidenceScore: 0.94,
    detectedMedicines: [
      { id: 'm10', name: 'Atorvastatin', dosage: '40 mg', frequency: 'Once daily at night', route: 'Oral', confidence: 0.97, sourceDB: 'DrugBank DB01076' },
      { id: 'm11', name: 'Clopidogrel', dosage: '75 mg', frequency: 'Once daily', route: 'Oral', confidence: 0.96, sourceDB: 'SIDER 4.1' },
      { id: 'm12', name: 'Omeprazole', dosage: '20 mg', frequency: 'Once daily before breakfast', route: 'Oral', confidence: 0.95, sourceDB: 'DrugBank DB00338' }
    ],
    drugInteractions: [
      {
        id: 'i10',
        med1: 'Clopidogrel',
        med2: 'Omeprazole',
        severity: 'High',
        description: 'Omeprazole significantly inhibits CYP2C19, reducing conversion of Clopidogrel to its active antiplatelet metabolite.',
        mechanism: 'Competitive inhibition of hepatic CYP2C19 enzymatic activation pathway.',
        clinicalRecommendation: 'Switch Omeprazole to Pantoprazole or H2 receptor antagonist (Famotidine) which does not inhibit CYP2C19.',
        confidenceScore: 0.95
      }
    ],
    sideEffects: [
      { medName: 'Atorvastatin', effect: 'Myalgia & Muscle Stiffness', frequencyPercent: 9.4, severity: 'Mild', category: 'Musculoskeletal' },
      { medName: 'Clopidogrel', effect: 'Subcutaneous Hematoma', frequencyPercent: 11.2, severity: 'Mild', category: 'Dermatologic' },
      { medName: 'Omeprazole', effect: 'Hypomagnesemia (Long term)', frequencyPercent: 4.8, severity: 'Moderate', category: 'Metabolic' }
    ],
    clinicalRecommendations: [
      'HIGH PRIORITY: Clopidogrel therapeutic efficacy reduced by ~40% when co-administered with Omeprazole.',
      'Substitute Omeprazole with Pantoprazole 40mg daily to preserve cardiovascular ischemic protection.',
      'Check baseline lipid panel and liver enzymes (ALT/AST) for high-dose Atorvastatin monitoring.'
    ],
    shapFeatures: [
      { featureName: 'CYP2C19 Metabolic Inhibition (Omeprazole)', impactValue: 0.44, category: 'Pharmacokinetics', direction: 'increases_risk', explanation: 'Strongest negative SHAP impact on Clopidogrel active metabolite conversion probability.' },
      { featureName: 'Atorvastatin 40mg Dose', impactValue: 0.12, category: 'Statin Load', direction: 'increases_risk', explanation: 'Moderate risk contribution toward potential hepatic transaminase elevation.' }
    ]
  },
  {
    id: 'ANALYSIS-2026-0790',
    timestamp: '2026-07-20 11:05:18',
    patientId: 'PAT-3098',
    patientName: 'Sophia Tanaka',
    patientAge: 48,
    patientGender: 'Female',
    prescribingDoctor: 'Dr. James Miller, MD',
    status: 'Completed',
    overallRiskLevel: 'Critical',
    overallConfidenceScore: 0.95,
    detectedMedicines: [
      { id: 'm20', name: 'Fluoxetine', dosage: '20 mg', frequency: 'Once daily morning', route: 'Oral', confidence: 0.96, sourceDB: 'DrugBank DB00472' },
      { id: 'm21', name: 'Tramadol HCl', dosage: '50 mg', frequency: 'Every 6 hours PRN pain', route: 'Oral', confidence: 0.94, sourceDB: 'FAERS 2025' }
    ],
    drugInteractions: [
      {
        id: 'i20',
        med1: 'Fluoxetine',
        med2: 'Tramadol HCl',
        severity: 'Critical',
        description: 'Severe risk of Serotonin Syndrome and increased risk of central nervous system toxicity / epileptic seizures.',
        mechanism: 'Fluoxetine inhibits CYP2D6 metabolizing Tramadol while both drugs synergistically elevate central synaptic serotonin levels.',
        clinicalRecommendation: 'Avoid combination. Consider alternative non-serotonergic analgesics (e.g. Acetaminophen or NSAID) for pain management.',
        confidenceScore: 0.96
      }
    ],
    sideEffects: [
      { medName: 'Fluoxetine', effect: 'Insomnia & Agitation', frequencyPercent: 15.8, severity: 'Mild', category: 'Psychiatric' },
      { medName: 'Tramadol HCl', effect: 'Dizziness & Somnolence', frequencyPercent: 24.0, severity: 'Moderate', category: 'Neurological' },
      { medName: 'Fluoxetine + Tramadol', effect: 'Serotonin Toxicity Tremor/Hyperreflexia', frequencyPercent: 3.2, severity: 'Severe', category: 'Neurological' }
    ],
    clinicalRecommendations: [
      'CRITICAL: High threat of Serotonin Syndrome (hyperthermia, autonomic instability, neuromuscular changes).',
      'Discontinue Tramadol immediately. Switch pain management to non-serotonergic modal therapy.',
      'Educate patient on warning signs: agitation, rapid heartbeat, fever, muscle twitching.'
    ],
    shapFeatures: [
      { featureName: 'Dual Serotonergic Agonism', impactValue: 0.52, category: 'Neurotransmitter Synergy', direction: 'increases_risk', explanation: 'Dominant SHAP predictor triggering critical Serotonin Syndrome alert classification.' }
    ]
  }
];

export const SAMPLE_ANALYSES: AnalysisResult[] = RAW_SAMPLE_ANALYSES.map(enrichAnalysisWithDetails);

export const AI_MODELS_INFO = [
  {
    name: 'EasyOCR Neural Vision Engine',
    category: 'Computer Vision & Text Extraction',
    accuracy: '98.2%',
    description: 'PyTorch deep neural network architecture specialized in medical prescription text extraction, handwritten script OCR, dosage parsing, and PIL Lanczos image pre-processing.',
    badge: 'OCR Engine'
  },
  {
    name: 'RDKit SMILES Cheminformatics',
    category: 'Molecular Fingerprint Engine',
    accuracy: '512-bit Morgan',
    description: 'Converts pharmaceutical compounds to SMILES chemical formulas and generates 512-bit Morgan Molecular Fingerprints (radius=2) for structural interaction scoring.',
    badge: 'Primary Knowledge'
  },
  {
    name: 'Clinical Expert Rule System',
    category: 'Pharmacopeia Verification',
    accuracy: '98.0%',
    description: 'Deterministic clinical rule engine evaluating high-risk co-prescriptions (dual NSAID ulceration, Warfarin bleeding synergy, CYP2C19 enzyme inhibition) with high confidence.',
    badge: 'Expert System'
  },
  {
    name: 'SIDER Side Effect Database',
    category: 'Adverse Reaction Mapping',
    accuracy: '97.4%',
    description: 'Clinical adverse drug reaction resource mapping verified pharmaceutical compounds to population frequency percentages and MedDRA severity levels.',
    badge: 'Side Effect Mapping'
  },
  {
    name: 'Multi-Output ADR Risk Model',
    category: 'Machine Learning Classifier',
    accuracy: '94.2%',
    description: 'Scikit-Learn / XGBoost multi-output decision classifier trained on patient clinical demographics (Age, Gender, eGFR organ function) and drug count.',
    badge: 'ADR Model'
  },
  {
    name: 'XGBoost Chemical DDI Engine',
    category: 'Machine Learning Classifier',
    accuracy: '92.4%',
    description: 'Multiclass XGBoost model trained on 512-bit RDKit Morgan chemical fingerprints to classify drug-drug interaction mechanism types and clinical severity.',
    badge: 'DDI Model'
  },
  {
    name: 'FastAPI Microservice Pipeline',
    category: 'Backend Inference Gateway',
    accuracy: '~400ms Real-Time',
    description: 'High-performance Python FastAPI server loading LRU-cached models into memory at boot and executing live on-demand inference scoring.',
    badge: 'API Gateway'
  },
  {
    name: 'SHAP (SHapley Additive exPlanations)',
    category: 'Explainable AI (XAI)',
    accuracy: 'Exact Attribution',
    description: 'Game-theoretic attribution framework calculating exact Shapley marginal feature values added by Patient Age, Renal eGFR, and Polypharmacy Count.',
    badge: 'XAI Framework'
  }
];
