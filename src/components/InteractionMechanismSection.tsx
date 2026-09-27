import React from 'react';
import { ShieldAlert, Zap, AlertTriangle, Stethoscope, CheckCircle2, Info, ArrowRight, Eye, ShieldCheck, Flame } from 'lucide-react';
import { DrugInteraction, SeverityLevel } from '../types';

interface InteractionMechanismSectionProps {
  interactions: DrugInteraction[];
}

export const InteractionMechanismSection: React.FC<InteractionMechanismSectionProps> = ({ interactions }) => {
  const getSeverityBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'Critical':
        return (
          <span className="bg-red-100 text-red-700 border border-red-300 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Critical Reaction Threat
          </span>
        );
      case 'High':
        return (
          <span className="bg-orange-100 text-orange-700 border border-orange-300 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> High Interaction Risk
          </span>
        );
      case 'Medium':
        return (
          <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-yellow-600" /> Moderate Precaution
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Low Risk Synergy
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-poppins">
              Why Drug Reactions & Interactions Happen
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Biochemical mechanism, enzyme inhibition, and physical symptoms explaining why reactions occur when these medications meet in your body.
          </p>
        </div>

        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full w-fit">
          {interactions.length} {interactions.length === 1 ? 'Interaction Pair' : 'Interaction Pairs'} Flagged
        </span>
      </div>

      {interactions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Hazardous Drug Reactions Identified</h3>
          <p className="text-xs max-w-md mx-auto text-slate-600">
            All detected medications exhibit compatible pharmacokinetic and metabolic profiles under clinical database criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {interactions.map((inter, idx) => (
            <div
              key={inter.id || idx}
              className="bg-gradient-to-b from-rose-50/40 via-white to-white border border-rose-200 rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Interaction Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2 text-base font-black text-slate-900 font-poppins">
                  <span className="bg-blue-100 text-[#1565C0] px-3 py-1 rounded-xl text-xs sm:text-sm border border-blue-200 font-mono">
                    {inter.med1}
                  </span>
                  <Zap className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-xl text-xs sm:text-sm border border-purple-200 font-mono">
                    {inter.med2}
                  </span>
                </div>

                {getSeverityBadge(inter.severity)}
              </div>

              {/* WHY REACTION HAPPENED - Big Spotlight Box */}
              <div className="bg-rose-50 border-l-4 border-l-rose-600 border border-rose-200 rounded-r-2xl p-4.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-rose-900 uppercase tracking-widest font-mono">
                  <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                  Why This Reaction Happens (Biochemical Cause)
                </div>
                <p className="text-xs sm:text-sm text-rose-950 font-medium leading-relaxed">
                  {inter.whyReactionHappens || inter.description}
                </p>
              </div>

              {/* Pathway & Mechanism Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Biochemical Pathway */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Enzyme / Metabolic Pathway Affected:
                  </div>
                  <p className="text-xs font-bold text-slate-800 font-mono">
                    {inter.biochemicalPathway || 'Hepatic CYP450 System / Receptor Competition'}
                  </p>
                  <p className="text-[11px] text-slate-600 italic leading-snug">
                    {inter.mechanism}
                  </p>
                </div>

                {/* Warning Symptoms to Watch */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-600" /> Red-Flag Symptoms to Watch:
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(inter.symptomsToWatch || ['Dizziness', 'Unusual Bleeding', 'Palpitations', 'Nausea']).map((symp, sIdx) => (
                      <span
                        key={sIdx}
                        className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      >
                        ⚠️ {symp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safe Clinical Recommendation */}
              <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Safer Clinical Alternative & Dosing Adjustment
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {inter.saferAlternative || inter.clinicalRecommendation}
                </p>
                <div className="text-[11px] text-emerald-800 font-semibold italic pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>Clinical Recommendation: {inter.clinicalRecommendation}</span>
                  {inter.confidenceScore != null && (
                    <span className="font-mono">Confidence: {(inter.confidenceScore * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
