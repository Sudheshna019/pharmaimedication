import React from 'react';
import { 
  FileSearch, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  setActiveTab: (tab: string) => void;
  onRunDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab, onRunDemo }) => {
  return (
    <div className="w-full">
      {/* Edge-to-Edge Hero Section - Full Width & Full Viewport Height Seamless Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F3C78] via-[#1565C0] to-slate-900 text-white min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-poppins leading-tight">
            AI-Based Prediction of <span className="text-sky-300 font-black">Medication Side Effects</span> & Drug Interactions
          </h1>

          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
            Check prescriptions in seconds for dangerous drug interactions and side effects. Smart AI predictions help doctors keep patients safe and prevent harmful medication mistakes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setActiveTab('analyze')}
              className="bg-white hover:bg-sky-50 text-[#1565C0] font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm sm:text-base cursor-pointer group"
            >
              <FileSearch className="w-5 h-5 text-[#1565C0]" />
              Analyze Prescription Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onRunDemo}
              className="bg-sky-500/20 hover:bg-sky-500/30 text-white font-semibold border border-sky-300/40 px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 text-sm sm:text-base cursor-pointer backdrop-blur-xs"
            >
              <Sparkles className="w-5 h-5 text-sky-300" />
              Try Interactive Demo (Polypharmacy)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
