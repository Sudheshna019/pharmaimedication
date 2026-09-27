import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Printer, 
  Lock, 
  ShieldCheck, 
  FileCheck, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  Trash2,
  X
} from 'lucide-react';
import { ClinicianUser, AnalysisResult, SeverityLevel } from '../types';

interface HistoryReportsProps {
  history: AnalysisResult[];
  clinician?: ClinicianUser;
  onSelectResult: (result: AnalysisResult) => void;
  onPrintReport: (result: AnalysisResult) => void;
  onDeleteResult?: (id: string) => void;
}

export const HistoryReports: React.FC<HistoryReportsProps> = ({
  history,
  clinician,
  onSelectResult,
  onPrintReport,
  onDeleteResult
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const isPatient = clinician?.accountType === 'patient';

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === 'All' || item.overallRiskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const getSeverityBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'Critical':
        return <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Critical Risk</span>;
      case 'High':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">High Risk</span>;
      case 'Medium':
        return <span className="bg-yellow-100 text-yellow-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Moderate Risk</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Low Risk</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1565C0] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-1">
            <History className="w-3.5 h-3.5" /> {isPatient ? 'Personal Medication History Vault' : 'Historical Search & Clinical Audit Trail'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-poppins">
            {isPatient ? 'My Personal Medication History' : 'Patient History & EHR Reports'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isPatient 
              ? 'Private encrypted history vault holding your previous prescription scans and interaction evaluations.'
              : 'Encrypted storage vault holding all clinical medication risk scans, interaction evaluations, and patient records.'}
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Patient Name, Analysis ID, or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0]"
            >
              <option value="All">All Risk Severities</option>
              <option value="Critical">Critical Risk Only</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Moderate Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4 pt-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-bold text-slate-800">No Historical Scans Found</p>
              <p className="text-xs">Try adjusting search query or risk filters.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">• {item.timestamp}</span>
                    {getSeverityBadge(item.overallRiskLevel)}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-poppins">
                      {item.patientName} <span className="text-slate-500 font-normal text-xs">({item.patientAge ? `${item.patientAge} Yrs` : 'Age not given'}, {item.patientGender})</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Prescribed Meds: <strong className="text-slate-800">{item.detectedMedicines.map((m) => m.name).join(', ')}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => onSelectResult(item)}
                    className="bg-blue-50 hover:bg-blue-100 text-[#1565C0] font-bold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Analysis
                  </button>

                  <button
                    onClick={() => onPrintReport(item)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                  </button>

                  {onDeleteResult && (
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Delete Report Record"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && onDeleteResult && (
        <div 
          onClick={() => setDeleteConfirmId(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4 relative cursor-default"
          >
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-poppins">
                Delete History Record?
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Report ID: <span className="font-bold text-slate-800">{deleteConfirmId}</span>
              </p>
              <p className="text-xs text-slate-600 pt-1">
                Are you sure you want to remove this record from your history vault? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  onDeleteResult(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
