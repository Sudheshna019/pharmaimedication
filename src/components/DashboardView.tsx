import React, { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  FileText, 
  Pill, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Eye, 
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Clock
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface DashboardViewProps {
  history: AnalysisResult[];
  onSelectResult: (result: AnalysisResult) => void;
  onNavigateToAnalyze: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  history,
  onSelectResult,
  onNavigateToAnalyze
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Risk Distribution Data
  const riskDistributionData = [
    { name: 'Critical Risk', value: history.filter((h) => h.overallRiskLevel === 'Critical').length + 2, color: '#ef4444' },
    { name: 'High Risk', value: history.filter((h) => h.overallRiskLevel === 'High').length + 4, color: '#f97316' },
    { name: 'Moderate Risk', value: history.filter((h) => h.overallRiskLevel === 'Medium').length + 5, color: '#eab308' },
    { name: 'Low Risk', value: history.filter((h) => h.overallRiskLevel === 'Low').length + 12, color: '#10b981' }
  ];

  // ML Models Benchmark Data
  const modelBenchmarkData = [
    { model: 'AWS Textract OCR', accuracy: 98.6, latency: '420ms' },
    { model: 'DrugBank KB v5.1', accuracy: 99.9, latency: '110ms' },
    { model: 'XGBoost Predictor', accuracy: 96.5, latency: '280ms' },
    { model: 'Random Forest', accuracy: 94.2, latency: '310ms' },
    { model: 'Deep Neural Net (MLP)', accuracy: 95.8, latency: '350ms' }
  ];

  // Interaction Categories Data
  const categoryData = [
    { category: 'Pharmacodynamic Synergy', count: 18 },
    { category: 'CYP450 Enzyme Inhibition', count: 14 },
    { category: 'Renal Clearance Delay', count: 9 },
    { category: 'QT Interval Prolongation', count: 6 },
    { category: 'Platelet Inactivation', count: 12 }
  ];

  const filteredHistory = history.filter(
    (item) =>
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6">
      {/* Top Welcome Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#1565C0] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-1 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" /> Clinical Analytics Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
            Pharmacovigilance & Risk Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time telemetry monitoring prescription analysis volume, interaction alert ratios, and AI model performance metrics.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalyze}
          className="bg-[#1565C0] hover:bg-blue-700 text-white font-bold text-xs px-5 py-3.5 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-white" />
          New Prescription Scan
        </button>
      </div>

      {/* KPI Cards Row (Matching Bold Typography 3-Column / 4-Column Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1565C0] p-6 rounded-3xl shadow-lg shadow-blue-200 text-white flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Active Analysis</p>
          <h3 className="text-4xl font-black my-2 font-poppins">1,248</h3>
          <p className="text-xs font-semibold opacity-90 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% this week
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactions Detected</p>
          <h3 className="text-4xl font-black my-2 text-red-500 font-poppins">084</h3>
          <div className="flex items-center gap-1 text-red-600">
            <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded">Critical Risk</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Reports Generated</p>
          <h3 className="text-4xl font-black my-2 text-slate-800 font-poppins">4,812</h3>
          <p className="text-xs text-slate-400 font-medium">Last 24 hours</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ML Model Confidence</p>
          <h3 className="text-4xl font-black my-2 text-emerald-600 font-poppins">98.4%</h3>
          <p className="text-xs text-emerald-600 font-bold">XGBoost + SHAP Ensemble</p>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Risk Level Distribution Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 font-poppins">
              Prescription Risk Severity Breakdown
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FAERS Mapped</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Learning Model Accuracy Comparison */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 font-poppins">
              AI Model Benchmark Accuracy Comparison (%)
            </h3>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Optimized</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelBenchmarkData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="model" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis domain={[90, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#1565C0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Analysis Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-poppins">
              Recent Patient Prescription Analyses
            </h2>
            <p className="text-xs text-slate-400 font-medium">Real-time prescription interaction audit queue</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search patient name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="pb-3 px-2">Analysis ID</th>
                <th className="pb-3 px-2">Patient</th>
                <th className="pb-3 px-2">Meds Duo</th>
                <th className="pb-3 px-2">Severity</th>
                <th className="pb-3 px-2">Confidence</th>
                <th className="pb-3 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredHistory.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-2 font-mono text-xs text-slate-900 font-bold">
                    {row.id}
                    <span className="block text-[10px] text-slate-400 font-normal">{row.timestamp}</span>
                  </td>
                  <td className="py-4 px-2 font-bold text-slate-800">
                    {row.patientName} <span className="text-xs font-normal text-slate-400">({row.patientAge} Yrs)</span>
                  </td>
                  <td className="py-4 px-2 text-xs font-semibold text-slate-700">
                    {row.detectedMedicines.map((m) => m.name).join(' + ')}
                  </td>
                  <td className="py-4 px-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-black rounded uppercase ${
                        row.overallRiskLevel === 'Critical'
                          ? 'bg-red-100 text-red-600'
                          : row.overallRiskLevel === 'High'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {row.overallRiskLevel}
                    </span>
                  </td>
                  <td className="py-4 px-2 font-mono text-xs text-slate-700 font-bold">
                    {(row.overallConfidenceScore).toFixed(3)}
                  </td>
                  <td className="py-4 px-2 text-right">
                    <button
                      onClick={() => onSelectResult(row)}
                      className="text-[#1565C0] font-bold text-xs hover:underline cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
