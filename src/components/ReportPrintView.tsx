import React from 'react';
import { ShieldCheck, Printer, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { AnalysisResult, ClinicianUser } from '../types';
import { auth } from '../firebase';

interface ReportPrintViewProps {
  result: AnalysisResult;
  clinician: ClinicianUser;
  onBack: () => void;
}

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  result,
  clinician,
  onBack
}) => {
  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 print:py-0 print:max-w-none">
      {/* Top Action Toolbar (Hidden when printing) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex justify-between items-center print:hidden">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <button
          onClick={handlePrintTrigger}
          className="bg-[#1565C0] hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Hospital Formal Consultation Sheet */}
      <div className="bg-white rounded-2xl p-8 border border-slate-300 shadow-md space-y-8 text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
        {/* Simple Professional Header */}
        <div className="flex justify-between items-start border-b-2 border-[#1565C0] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#1565C0] text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 font-poppins">
                  PharmAI Clinical Safety & Medication Analysis Report
                </h1>
                <p className="text-xs font-bold text-[#1565C0] uppercase tracking-wider">
                  Clinical Decision Support & Drug Interaction Analysis
                </p>
              </div>
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            <span className="bg-blue-100 text-[#1565C0] border border-blue-200 font-bold px-3 py-1 rounded-md inline-block font-mono">
              REPORT: {result.id}
            </span>
            <p className="text-slate-500 font-mono text-[11px]">{result.timestamp}</p>
          </div>
        </div>

        {/* Patient & User Demographics Header */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">PATIENT INFORMATION</p>
            <p className="font-bold text-sm text-slate-900">{result.patientName}</p>
            <p className="text-slate-600">ID: {result.patientId} • {result.patientAge} Yrs ({result.patientGender})</p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">ANALYSIS BY USER</p>
            <p className="font-bold text-sm text-slate-900">{auth.currentUser?.displayName || clinician.name || 'PharmAI Account'}</p>
            <p className="text-slate-600">{auth.currentUser?.email || clinician.title}</p>
          </div>
        </div>

        {/* Risk Level Highlight */}
        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl p-4">
          <div>
            <span className="text-xs font-bold text-[#1565C0] uppercase tracking-wider">Overall Risk Assessment</span>
            <p className="text-lg font-black text-slate-900 font-poppins">{result.overallRiskLevel} Risk Severity</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-600">ML Model Confidence</span>
            <p className="text-base font-extrabold text-[#1565C0] font-poppins">
              {(result.overallConfidenceScore * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Prescribed Medications (Deduplicated & Source Column Removed) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Prescribed Medications
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200">
            <thead className="bg-slate-100 font-semibold text-slate-700">
              <tr>
                <th className="p-2.5">Medication Name</th>
                <th className="p-2.5">Dosage</th>
                <th className="p-2.5">Frequency & Route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.detectedMedicines
                .filter((m, index, self) => index === self.findIndex(t => t.name.toLowerCase() === m.name.toLowerCase()))
                .map((m, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                    <td className="p-2.5">{m.dosage}</td>
                    <td className="p-2.5">{m.frequency} ({m.route})</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Identified Drug Interactions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Detected Pharmacological Interactions
          </h3>
          {result.drugInteractions.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hazardous interactions flagged.</p>
          ) : (
            result.drugInteractions.map((inter, i) => (
              <div key={i} className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{inter.med1} + {inter.med2}</span>
                  <span className="text-rose-600 uppercase text-[11px]">{inter.severity}</span>
                </div>
                <p className="text-slate-700">{inter.description}</p>
                <p className="text-slate-500 italic"><strong className="not-italic">Mechanism:</strong> {inter.mechanism}</p>
              </div>
            ))
          )}
        </div>

        {/* Doctor Recommendations */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
            Clinical Recommendations & Monitoring
          </h3>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-800">
            {result.clinicalRecommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
