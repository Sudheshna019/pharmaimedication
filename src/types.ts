export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  confidence?: number;
  sourceDB?: string;
  isVerified?: boolean;
  originalName?: string;       // name as written on the prescription
  ingredients?: string[];      // active ingredients after normalisation
  matchType?: string;          // generic | brand | combination | fuzzy | unrecognized
  category?: string;
  purpose?: string;            // What this medicine does in plain language
  targetOrgan?: string;        // Primary target organ or body system
  mechanismOfAction?: string; // Biological mechanism of action
  commonUse?: string;         // Common reason prescribed
  foodInteractions?: string;   // Food/dietary interactions (e.g. Vitamin K, Grapefruit)
}

export interface DrugInteraction {
  id?: string;
  med1: string;
  med2: string;
  severity: SeverityLevel;
  description: string;
  mechanism: string;
  whyReactionHappens?: string;   // Accessible explanation of WHY reaction occurs
  biochemicalPathway?: string;   // Specific pathway (e.g., CYP2C19 Inhibition, Dual Hemostasis Blockade)
  symptomsToWatch?: string[];    // Key red-flag symptoms to monitor
  saferAlternative?: string;     // Recommended alternative or timing fix
  clinicalRecommendation: string;
  confidenceScore: number | null;  // ML interaction probability (null if no structure available)
  evidence?: InteractionEvidence;
}

export interface InteractionEvidence {
  source: string;
  curatedRule: boolean;
  drugbankRecorded: boolean;
  drugbankDescription?: string | null;
  mlInteractionProbability: number | null;
  mlPredictedType?: number | null;
  mlTypeDescription?: string | null;
  mlTypeConfidence?: number | null;
}

export interface AdrPrediction {
  label: string;
  probability: number;
  threshold: number;
  flagged: boolean;
  relative_risk: number;
  baseline_rate: number;
}

export interface ShapSummary {
  outcome: string;
  baseProbability: number;
  finalProbability: number;
}

export interface SideEffect {
  medName: string;
  effect: string;
  frequencyPercent: number;
  severity: 'Mild' | 'Moderate' | 'Severe';
  category: string;
}

export interface ShapFeature {
  featureName: string;
  impactValue: number; // e.g. +0.45 or -0.12
  category: string;
  direction: 'increases_risk' | 'decreases_risk';
  explanation: string;
  plainLanguageMeaning?: string; // Simplified summary for patients
  clinicalContext?: string;      // Biological/clinical detail
  actionableStep?: string;       // Actionable recommendation to reduce risk
  featureImportanceScore?: number; // 0-100 relative importance
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  detectedMedicines: MedicineItem[];
  drugInteractions: DrugInteraction[];
  sideEffects: SideEffect[];
  overallRiskLevel: SeverityLevel;
  overallConfidenceScore: number;
  clinicalRecommendations: string[];
  shapFeatures: ShapFeature[];
  adrPredictions?: Record<string, AdrPrediction>;
  shapSummary?: ShapSummary | null;
  modelInfo?: { engine: string; pairsEvaluated: number; shapExplainedOutcome: string | null; latencyMs: number };
  doctorNotes?: string;
  status: 'Completed' | 'Pending Review' | 'Flagged';
  prescribingDoctor?: string;
}

export interface PatientRecord {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  currentVitals: {
    hr: number; // bpm
    bp: string; // e.g. "128/82"
    spo2: number; // %
    temp: number; // °C
    rr: number; // breaths/min
  };
  activePrescriptions: string[];
  lastUpdated: string;
}

export interface VitalsPoint {
  time: string;
  hr: number;
  spo2: number;
  sysBP: number;
  diaBP: number;
  rr: number;
}

export interface ClinicianUser {
  id: string;
  name: string;
  title: string;
  department: string;
  hospital: string;
  email: string;
  role: string;
  npiNumber?: string;
  accountType: 'doctor' | 'patient';
  patientAge?: number;
  healthGoals?: string;
  authenticated: boolean;
  token?: string;
}
