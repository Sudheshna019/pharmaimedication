import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-8 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 text-center">
        
        {/* Brand & HIPAA Badge Line */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div 
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1565C0] text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight font-poppins">
              Pharm<span className="text-sky-400">AI</span>
            </span>
          </div>

          <span className="hidden sm:inline text-slate-700">•</span>

          <span className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
            <Lock className="w-3.5 h-3.5" /> HIPAA Compliant & 256-Bit Encrypted
          </span>
        </div>

        {/* Simple 1-Line Real Description */}
        <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
          AI-driven prescription OCR, drug-drug interaction risk analysis, and patient side-effect prediction.
        </p>

        {/* Simple 1-Line Clean Navigation Bar */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
          <button 
            onClick={() => setActiveTab('landing')} 
            className="hover:text-sky-400 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('analyze')} 
            className="hover:text-sky-400 transition-colors cursor-pointer text-sky-400 font-bold"
          >
            Analyze Prescription
          </button>
          <button 
            onClick={() => setActiveTab('manual')} 
            className="hover:text-sky-400 transition-colors cursor-pointer"
          >
            Manual Entry
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className="hover:text-sky-400 transition-colors cursor-pointer"
          >
            My History
          </button>
          <button 
            onClick={() => setActiveTab('about')} 
            className="hover:text-sky-400 transition-colors cursor-pointer"
          >
            About AI Architecture
          </button>
        </nav>

        {/* Simple 1-Line Copyright */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          © {new Date().getFullYear()} PharmAI Medication Safety Platform. Assistive decision support tool for clinical safety.
        </div>

      </div>
    </footer>
  );
};
