import React, { useState } from 'react';
import { Pill, Heart, Brain, Activity, HelpCircle, ChevronDown, ChevronUp, AlertCircle, Sparkles, Utensils } from 'lucide-react';
import { MedicineItem } from '../types';

interface MedicineDetailsSectionProps {
  medicines: MedicineItem[];
}

export const MedicineDetailsSection: React.FC<MedicineDetailsSectionProps> = ({ medicines }) => {
  const [expandedMedId, setExpandedMedId] = useState<string | null>(medicines[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedMedId(expandedMedId === id ? null : id);
  };

  const getOrganIcon = (organStr?: string) => {
    const organ = organStr?.toLowerCase() || '';
    if (organ.includes('heart') || organ.includes('cardio') || organ.includes('vascular') || organ.includes('blood')) {
      return <Heart className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    if (organ.includes('brain') || organ.includes('neuro') || organ.includes('psych') || organ.includes('nervous')) {
      return <Brain className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    return <Activity className="w-4 h-4 text-[#1565C0] shrink-0" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Pill className="w-4 h-4 text-[#1565C0]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-poppins">
              What Each Medicine Does
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detailed breakdown of therapeutic indications, biological mechanisms, and dietary guidelines for each detected drug.
          </p>
        </div>

        <span className="text-[11px] font-bold text-[#1565C0] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full w-fit">
          {medicines.length} Prescription {medicines.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      <div className="space-y-4">
        {medicines.map((med, index) => {
          const isExpanded = expandedMedId === med.id || (expandedMedId === null && index === 0);

          return (
            <div
              key={med.id || index}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded 
                  ? 'border-blue-300 bg-blue-50/20 shadow-xs ring-1 ring-blue-100' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Card Header Bar */}
              <div
                onClick={() => toggleExpand(med.id || `${index}`)}
                className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs font-bold text-slate-700 text-xs shrink-0 mt-0.5 sm:mt-0 font-mono">
                    #{index + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 font-poppins">
                        {med.name}
                      </h3>
                      <span className="text-[10px] font-extrabold bg-blue-100/80 text-[#1565C0] px-2.5 py-0.5 rounded-full font-mono">
                        {med.dosage}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2 font-medium">
                      <span>Frequency: <strong className="text-slate-700">{med.frequency}</strong></span>
                      <span>•</span>
                      <span>Route: <span className="text-slate-700">{med.route}</span></span>
                      {med.isVerified === false ? (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-500" /> Unverified
                          </span>
                        </>
                      ) : med.category ? (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 italic">{med.category}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[11px] font-bold bg-white text-slate-700 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                    {getOrganIcon(med.targetOrgan)}
                    <span className="truncate max-w-[140px] sm:max-w-[180px]">
                      {med.targetOrgan || 'Systemic Target'}
                    </span>
                  </span>

                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Card Expanded Content */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200/60 space-y-4 bg-white">
                  {/* Unverified Drug Warning Notice */}
                  {med.isVerified === false && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-amber-900">⚠️ Drug Not Found in Pharmacopeia Database</p>
                        <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                          "{med.name}" could not be matched against verified pharmacopeia databases. Please check the spelling or verify the full generic/brand name. Unverified entries are safely bypassed from chemical interaction risk modeling.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Purpose Card */}
                  <div className={`rounded-xl p-4 border space-y-1.5 ${
                    med.isVerified === false 
                      ? 'bg-amber-50/50 border-amber-200' 
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50/40 border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1565C0] uppercase tracking-wider font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" /> What This Medicine Does (Purpose & Indication)
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                      {med.purpose || `${med.name} is prescribed to treat key underlying physiological conditions.`}
                    </p>
                  </div>

                  {/* Biological Mechanism & Common Use Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Biological Mechanism */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" /> How It Works (Mechanism of Action)
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {med.mechanismOfAction || 'Acts on specific enzyme systems and cellular receptors to produce therapeutic effects.'}
                      </p>
                    </div>

                    {/* Prescribed For / Common Indications */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-600" /> Typical Clinical Indications
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {med.commonUse || 'Indicated for therapeutic management as evaluated by clinical guidelines.'}
                      </p>
                    </div>
                  </div>

                  {/* Food & Lifestyle Notes */}
                  {med.foodInteractions && (
                    <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/80 flex items-start gap-2.5 text-xs">
                      <Utensils className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-900 font-bold block mb-0.5">Dietary & Food Considerations:</strong>
                        <span className="text-amber-800">{med.foodInteractions}</span>
                      </div>
                    </div>
                  )}

                  {/* Verification Footer */}
                  <div className="flex items-center justify-end text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-3">
                    {med.isVerified !== false ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Pharmacological Match Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> ⚠️ Unverified Drug - Check Spelling
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
