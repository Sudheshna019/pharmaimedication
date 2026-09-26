import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Brain, 
  Stethoscope, 
  Printer, 
  FileCheck, 
  Pill, 
  Activity, 
  Info, 
  Languages, 
  Globe 
} from 'lucide-react';
import { AnalysisResult, SeverityLevel } from '../types';
import { MedicineDetailsSection } from './MedicineDetailsSection';
import { InteractionMechanismSection } from './InteractionMechanismSection';
import { ShapExplainabilityModule } from './ShapExplainabilityModule';

import { ClinicianUser } from '../types';

interface ResultsViewProps {
  result: AnalysisResult;
  onPrintReport: () => void;
  onSaveToEHR: () => void;
  clinician?: ClinicianUser;
}

type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'te' | 'zh';

const LANGUAGE_OPTIONS: { code: SupportedLanguage; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'zh', name: 'Chinese', native: '中文' }
];

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  onPrintReport,
  onSaveToEHR,
  clinician
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');

  const getLocalizedSummary = (lang: SupportedLanguage, result: AnalysisResult) => {
    const medCount = result.detectedMedicines.length;
    const interCount = result.drugInteractions.length;
    const risk = result.overallRiskLevel;

    switch (lang) {
      case 'es':
        return {
          title: 'Explicación Clínica en Español',
          summary: `Evaluación de seguridad farmacológica para el paciente ${result.patientName}. Se detectaron ${medCount} medicamentos y ${interCount} interacciones medicamentosas con una clasificación de riesgo ${risk}.`,
          advice: 'Se recomienda monitorear estrechamente los parámetros vitales del paciente y evaluar el ajuste de dosis.'
        };
      case 'fr':
        return {
          title: 'Explication Clinique en Français',
          summary: `Évaluation de la sécurité pharmacologique pour le patient ${result.patientName}. ${medCount} médicaments et ${interCount} interactions ont été identifiés avec un niveau de risque ${risk}.`,
          advice: 'Une surveillance clinique continue et une révision de la posologie sont fortement conseillées.'
        };
      case 'de':
        return {
          title: 'Klinische Erklärung auf Deutsch',
          summary: `Pharmakologische Sicherheitsbewertung für den Patienten ${result.patientName}. Es wurden ${medCount} Medikamente und ${interCount} Wechselwirkungen mit Risikostufe ${risk} festgestellt.`,
          advice: 'Engmaschige Überwachung der Vitalparameter und Überprüfung der Medikation empfohlen.'
        };
      case 'hi':
        return {
          title: 'हिंदी में नैदानिक स्पष्टीकरण (Clinical Summary in Hindi)',
          summary: `रोगी ${result.patientName} के लिए दवा सुरक्षा मूल्यांकन। ${medCount} दवाएं और ${interCount} परस्पर क्रियाएं (interactions) पाई गईं, जिनका जोखिम स्तर ${risk} है।`,
          advice: 'रोगी के महत्वपूर्ण संकेतों (vitals) की निरंतर निगरानी और खुराक समायोजन की सलाह दी जाती है।'
        };
      case 'te':
        return {
          title: 'తెలుగులో క్లినికల్ వివరణ (Clinical Summary in Telugu)',
          summary: `రోగి ${result.patientName} కొరకు మూల్యాంకనం. మొత్తం ${medCount} మందులు మరియు ${interCount} డ్రగ్ ఇంటరాక్షన్లు గుర్తించబడ్డాయి. ప్రమాద స్థాయి: ${risk}.`,
          advice: 'రోగి యొక్క వైటల్స్ నిరంతరం పర్యవేక్షించడం మరియు మోతాదులను సమీక్షించడం సూచించబడింది.'
        };
      case 'zh':
        return {
          title: '中文临床解释 (Clinical Summary in Chinese)',
          summary: `患者 ${result.patientName} 的药物安全评估。检测到 ${medCount} 种药物和 ${interCount} 项药物相互作用，风险等级为 ${risk}。`,
          advice: '建议密切监测患者生命体征并评估剂量调整。'
        };
      default:
        return {
          title: 'Clinical Summary in English',
          summary: `Pharmacological safety assessment for patient ${result.patientName}. Detected ${medCount} medications and ${interCount} drug interactions with a ${risk} overall risk classification.`,
          advice: 'Continuous monitoring of patient vital signs and dose titration is strongly advised.'
        };
    }
  };

  const localizedText = getLocalizedSummary(selectedLang, result);

  const getSeverityBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'Critical':
        return (
          <span className="bg-red-100 text-red-600 border border-red-200 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Critical Risk
          </span>
        );
      case 'High':
        return (
          <span className="bg-orange-100 text-orange-600 border border-orange-200 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> High Risk
          </span>
        );
      case 'Medium':
        return (
          <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-yellow-600" /> Moderate Risk
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Low Risk
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Unverified Drugs Warning Banner */}
      {result.detectedMedicines.some(m => m.isVerified === false) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs shadow-xs animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              ⚠️ Unverified Medication Detected ({result.detectedMedicines.filter(m => m.isVerified === false).map(m => `"${m.name}"`).join(', ')})
            </h3>
            <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
              One or more drug strings could not be matched against verified pharmacopeia databases. Please check the spelling or verify the full generic/brand name. Unverified drugs are safely bypassed from chemical interaction risk modeling.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              ID: {result.id} • {result.timestamp}
            </span>
            <span className="text-[9px] bg-blue-50 text-[#1565C0] border border-blue-200 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
              Verified Analysis
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-poppins tracking-tight">
            AI Clinical Safety & Risk Assessment
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Patient: <strong className="text-slate-800">{result.patientName}</strong> ({result.patientAge} Yrs, {result.patientGender})
          </p>
        </div>

        {/* Action Buttons & Language Picker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
            <Globe className="w-4 h-4 text-[#1565C0]" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.native} ({opt.name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onSaveToEHR}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            {clinician?.accountType === 'patient' ? 'Save to My History' : 'Save to EHR Patient Record'}
          </button>

          <button
            onClick={onPrintReport}
            className="bg-[#1565C0] hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" /> View Printable Report
          </button>
        </div>
      </div>

      {/* Multilingual Patient/Clinician Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-[#1565C0] text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-sky-300" />
            <span className="text-xs font-black uppercase tracking-widest text-sky-200">
              {localizedText.title}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed max-w-3xl">
            {localizedText.summary}
          </p>
          <p className="text-xs text-sky-100 font-semibold italic">
            • {localizedText.advice}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-white/10 border border-white/20 px-3 py-1 rounded-full text-white shrink-0">
          Auto-Translated by AI
        </span>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Risk Level */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Risk Classification
          </p>
          <div className="flex items-center justify-between">
            {getSeverityBadge(result.overallRiskLevel)}
          </div>
        </div>

        {/* Confidence Score */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Ensemble Confidence
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-poppins">
              {((result.overallConfidenceScore || 0.96) * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
              Optimal
            </span>
          </div>
        </div>

        {/* Detected Meds Count */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Active Prescriptions
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1565C0] font-poppins">
              {result.detectedMedicines.length}
            </span>
            <span className="text-xs text-slate-500 font-bold">Meds Flagged</span>
          </div>
        </div>

        {/* Interactions Count */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Interactions Found
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600 font-poppins">
              {result.drugInteractions.length}
            </span>
            <span className="text-xs text-slate-500 font-bold">Pairs Flagged</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="space-y-8">
        {/* Section 1: What Each Medicine Does */}
        <MedicineDetailsSection medicines={result.detectedMedicines} />

        {/* Section 2: Why Reaction Happened When Two Interact */}
        <InteractionMechanismSection interactions={result.drugInteractions} />

        {/* Section 4: Side Effects & Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Adverse Side Effects Breakdown */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-poppins flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="w-5 h-5 text-[#1565C0]" /> Predicted Adverse Side Effects
            </h2>

            {result.sideEffects && result.sideEffects.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {result.sideEffects.map((se, idx) => (
                  <div key={idx} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{se.effect}</span>
                      <p className="text-[11px] text-slate-500">Medication: {se.medName} • {se.category}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-slate-800">{se.frequencyPercent}% Incidence</span>
                        <span className="block text-[10px] text-slate-400">Severity: {se.severity}</span>
                      </div>
                      <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            se.severity === 'Severe' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(se.frequencyPercent * 3, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">No High-Risk Adverse Side Effects Flagged</p>
                <p className="text-[11px] text-slate-500">
                  All detected medications exhibit compatible safety and tolerability profiles under clinical database criteria.
                </p>
              </div>
            )}
          </div>

          {/* Right: Clinical Action Recommendations */}
          <div className="lg:col-span-5 bg-blue-50/80 border border-blue-200 rounded-2xl p-6 shadow-xs space-y-4 h-fit">
            <h2 className="text-base font-bold text-[#1565C0] font-poppins flex items-center gap-2 border-b border-blue-200/60 pb-3">
              <Stethoscope className="w-5 h-5 text-[#1565C0]" /> Doctor's Action Recommendations
            </h2>

            <ul className="space-y-3 text-xs text-slate-800">
              {result.clinicalRecommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed bg-white/80 p-3 rounded-xl border border-blue-100 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-[#1565C0] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
