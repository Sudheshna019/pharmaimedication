import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { Brain, Sparkles, TrendingUp, TrendingDown, UserCheck, Stethoscope, HelpCircle, Layers, ShieldAlert, CheckCircle2, Sliders } from 'lucide-react';
import { ShapFeature } from '../types';

interface ShapExplainabilityModuleProps {
  shapFeatures: ShapFeature[];
  overallRiskLevel: string;
}

export const ShapExplainabilityModule: React.FC<ShapExplainabilityModuleProps> = ({
  shapFeatures,
  overallRiskLevel
}) => {
  const [viewMode, setViewMode] = useState<'patient' | 'clinician'>('patient');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeFeatureIdx, setActiveFeatureIdx] = useState<number | null>(0);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(shapFeatures.map((f) => f.category)))];

  const filteredFeatures = selectedCategory === 'All' 
    ? shapFeatures 
    : shapFeatures.filter((f) => f.category === selectedCategory);

  // Prepare chart data for Recharts
  const chartData = filteredFeatures.map((f) => ({
    name: f.featureName.length > 20 ? f.featureName.slice(0, 18) + '...' : f.featureName,
    fullName: f.featureName,
    impactPct: Math.round(f.impactValue * 100),
    category: f.category,
    isRisk: f.impactValue > 0
  }));

  // Compute baseline vs final model probability shift
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-poppins">
              AI Explainability & Risk Drivers (SHAP Analysis)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Game-Theoretic Shapley values break down how each medical factor pushed the AI prediction toward {overallRiskLevel} risk.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-center">
          <button
            onClick={() => setViewMode('patient')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'patient'
                ? 'bg-white text-[#1565C0] shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Patient / Friendly View
          </button>
          <button
            onClick={() => setViewMode('clinician')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'clinician'
                ? 'bg-[#1565C0] text-white shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" /> Clinician XAI Matrix
          </button>
        </div>
      </div>

      {/* Baseline Risk Shift Visualizer Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Model Probability Waterfall Shift
          </span>
          <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            Shapley Value Synthesis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Baseline Risk */}
          <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-center space-y-0.5">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
              Population Baseline Risk
            </span>
            <span className="text-2xl font-black font-poppins text-indigo-200">
              {baselineRiskPercent}%
            </span>
            <span className="text-[10px] text-slate-400 block">Average cohort prior probability</span>
          </div>

          {/* Risk Factors Shift Arrow */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              <span className="text-rose-400 flex items-center gap-0.5">
                <TrendingUp className="w-4 h-4" /> +{Math.round(positiveImpactSum * 100)}%
              </span>
              <span className="text-slate-400">vs</span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingDown className="w-4 h-4" /> {Math.round(negativeImpactSum * 100)}%
              </span>
            </div>

            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${(positiveImpactSum / (positiveImpactSum + Math.abs(negativeImpactSum))) * 100}%` }}
              ></div>
              <div
                className="bg-emerald-400 h-full transition-all"
                style={{ width: `${(Math.abs(negativeImpactSum) / (positiveImpactSum + Math.abs(negativeImpactSum))) * 100}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-indigo-300 font-mono">Additive Shapley Vector Addition</span>
          </div>

          {/* Final Calculated Risk */}
          <div className="bg-rose-500/20 border border-rose-400/30 rounded-xl p-3 text-center space-y-0.5">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
              Patient Calculated Risk
            </span>
            <span className="text-2xl font-black font-poppins text-rose-200">
              {calculatedRiskPercent}%
            </span>
            <span className="text-[10px] text-rose-300 font-bold block uppercase">{overallRiskLevel} Risk Tier</span>
          </div>
        </div>
      </div>

      {/* Recharts SHAP Feature Impact Bar Chart */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold text-slate-700 font-poppins flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#1565C0]" /> SHAP Value Distribution Chart (Recharts)
          </span>
          <span className="text-[10px] font-mono text-slate-500">% Impact on Final Risk Probability</span>
        </div>
        <div className="h-52 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" domain={[-30, 60]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 600 }} width={120} />
              <RechartsTooltip 
                formatter={(val: any) => [`${val}%`, 'Risk Contribution']}
                labelFormatter={(lbl: any, payload: any[]) => payload[0]?.payload?.fullName || lbl}
              />
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar dataKey="impactPct" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.isRisk ? '#f43f5e' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono shrink-0 flex items-center gap-1">
          <Sliders className="w-3 h-3" /> Filter:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1565C0] text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* SHAP Feature Contribution Bars */}
      <div className="space-y-4">
        {filteredFeatures.map((shap, idx) => {
          const isRiskAccelerator = shap.impactValue > 0;
          const absVal = Math.abs(shap.impactValue);
          const barWidthPercent = Math.min(Math.round(absVal * 150), 100);
          const isSelected = activeFeatureIdx === idx;

          return (
            <div
              key={idx}
              onClick={() => setActiveFeatureIdx(isSelected ? null : idx)}
              className={`rounded-2xl border p-4.5 transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? isRiskAccelerator ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200' : 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                  : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Feature Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    isRiskAccelerator ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isRiskAccelerator ? '+' : '-'}
                  </span>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-poppins">
                      {shap.featureName}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Category: {shap.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isRiskAccelerator 
                      ? 'bg-rose-100 text-rose-800 border-rose-200' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isRiskAccelerator ? 'Increases Risk' : 'Reduces Risk'}
                  </span>

                  <span className={`text-sm font-black font-mono ${
                    isRiskAccelerator ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {shap.impactValue > 0 ? `+${(shap.impactValue * 100).toFixed(0)}%` : `${(shap.impactValue * 100).toFixed(0)}%`}
                  </span>
                </div>
              </div>

              {/* Animated Contribution Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isRiskAccelerator ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                ></div>
              </div>

              {/* Patient View Summary */}
              {viewMode === 'patient' && (
                <p className="text-xs text-slate-700 font-medium leading-relaxed mt-2 bg-white rounded-xl p-3 border border-slate-200/80">
                  💡 <strong>Patient Summary:</strong> {shap.plainLanguageMeaning || shap.explanation}
                </p>
              )}

              {/* Clinician View Summary */}
              {viewMode === 'clinician' && (
                <div className="mt-2 text-xs space-y-1.5 bg-slate-900 text-slate-100 rounded-xl p-3 font-mono border border-slate-800">
                  <div className="flex justify-between text-[11px] text-indigo-300">
                    <span>Shapley Weight: {shap.impactValue}</span>
                    <span>Feature Score: {shap.featureImportanceScore || 85}/100</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Vector Direction: {shap.direction} • {shap.clinicalContext || shap.explanation}
                  </p>
                </div>
              )}

              {/* Expanded Actionable Details */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2 text-xs">
                  {shap.clinicalContext && (
                    <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100">
                      <strong className="text-[#1565C0] block font-bold mb-0.5">Biological Context:</strong>
                      <span className="text-slate-800">{shap.clinicalContext}</span>
                    </div>
                  )}

                  {shap.actionableStep && (
                    <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200">
                      <strong className="text-emerald-900 block font-bold mb-0.5">Actionable Risk Mitigation Step:</strong>
                      <span className="text-emerald-950">{shap.actionableStep}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
