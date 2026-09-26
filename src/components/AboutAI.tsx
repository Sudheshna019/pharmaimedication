import React from 'react';
import { 
  BrainCircuit, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Microscope, 
  FileSearch, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { AI_MODELS_INFO } from '../data/mockData';

export const AboutAI: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 py-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1565C0] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
          <BrainCircuit className="w-3.5 h-3.5" /> Explainable AI Architecture
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-poppins">
          About PharmAI Artificial Intelligence Engine
        </h1>
        <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
          PharmAI combines state-of-the-art computer vision OCR, curated pharmaceutical knowledge bases, ensemble Machine Learning classifiers, and Explainable AI (SHAP) to eliminate black-box decision uncertainty in clinical environments.
        </p>
      </div>

      {/* Interactive Infographic Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AI_MODELS_INFO.map((model, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:border-blue-400 transition-all space-y-4 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#1565C0] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                  {model.badge}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {model.accuracy}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 font-poppins group-hover:text-[#1565C0] transition-colors">
                {model.name}
              </h3>

              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {model.category}
              </p>

              <p className="text-xs text-slate-600 leading-relaxed">
                {model.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Pipeline Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        <h2 className="text-xl font-bold text-slate-900 font-poppins border-b border-slate-100 pb-4">
          Machine Learning Pipeline & SHAP Game Theory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1565C0] flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-900 font-poppins">Feature Embedding</h4>
            <p className="text-slate-600 leading-relaxed">
              Molecules are converted into SMILES strings and encoded into 512-bit RDKit Morgan chemical fingerprints combined with patient clinical demographics (Age, Gender, eGFR organ function).
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#1565C0] text-white flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-900 font-poppins">Dual-Track ML Scoring</h4>
            <p className="text-slate-600 leading-relaxed">
              Track 1 Scikit-Learn Multi-Output Classifiers and Track 2 XGBoost Fingerprint models evaluate interaction severity and adverse event risk in ~400ms real-time inference.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-900 font-poppins">SHAP Marginal Decomposition</h4>
            <p className="text-slate-600 leading-relaxed">
              Computes Shapley values quantifying exact marginal risk contributions for each drug co-prescription and patient organ risk factor (Age, eGFR, Polypharmacy Count).
            </p>
          </div>
        </div>
      </div>

      {/* Complete Architecture & Tech Stack Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-poppins flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1565C0]" /> System Architecture & Full Tech Stack
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive technical specification across frontend, backend microservices, ML engines, and cloud persistence.
            </p>
          </div>
          <span className="text-xs font-bold bg-blue-50 text-[#1565C0] border border-blue-200 px-3 py-1 rounded-full font-mono">
            Production Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Frontend */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <Cpu className="w-4 h-4 text-blue-600" /> Frontend Frameworks
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['React 19 (Vite)', 'TypeScript', 'TailwindCSS v4', 'Material UI', 'React Router DOM', 'Axios', 'React Hook Form', 'Framer Motion', 'React Dropzone', 'Recharts'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Backend */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <Activity className="w-4 h-4 text-emerald-600" /> Backend Services
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['FastAPI', 'Python 3.11', 'Uvicorn', 'REST APIs', 'Express Node Bridge', 'Firebase Auth'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Machine Learning */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <BrainCircuit className="w-4 h-4 text-purple-600" /> Machine Learning & XAI
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Scikit-learn', 'XGBoost Multi-Output', 'RDKit SMILES', 'Morgan Fingerprints (512-bit)', 'SHAP Explainability'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* OCR & Knowledge Bases */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <FileSearch className="w-4 h-4 text-amber-600" /> OCR & Reference Databases
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['EasyOCR (PyTorch)', 'PIL Lanczos Pre-processor', 'SIDER Side Effect DB', 'RxNorm Pharmacopeia'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Database, Auth & Storage */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <Database className="w-4 h-4 text-rose-600" /> Database & Storage
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Firebase Cloud Firestore', 'Firebase Auth', 'LocalStorage Cache', 'Pandas & NumPy'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Deployment & DevOps Tools */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-poppins">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Deployment & Tooling
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Vercel (Frontend)', 'Render (FastAPI)', 'Git & GitHub', 'Postman', 'VS Code'].map((tech) => (
                <span key={tech} className="bg-white text-slate-800 border border-slate-300 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
