import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';
import { apiService } from '../api/client';
import { 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Brain, 
  User, 
  Activity, 
  AlertTriangle, 
  Pill,
  CheckCircle2,
  Loader2,
  Lock,
  UserCheck,
  Info
} from 'lucide-react';
import { knownMedicineNames } from '../utils/prescriptionParser';

const COMMON_MEDICATIONS = knownMedicineNames();
import { AnalysisResult, MedicineItem, SeverityLevel, ClinicianUser } from '../types';
import { enrichAnalysisWithDetails } from '../utils/pharmacology';

import { syncAnalysisToFirestore, auth } from '../firebase';

interface ManualEntryProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  clinician: ClinicianUser;
  onOpenAuth: () => void;
}

interface PatientFormInputs {
  patientAge: number;
  patientGender: string;
  egfr: number;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ 
  onAnalysisComplete,
  clinician,
  onOpenAuth 
}) => {
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { id: '1', name: 'Warfarin Sodium', dosage: '5 mg', frequency: 'Once daily', route: 'Oral' },
    { id: '2', name: 'Aspirin (Acetylsalicylic Acid)', dosage: '81 mg', frequency: 'Once daily', route: 'Oral' }
  ]);

  const { control, watch, setValue } = useForm<PatientFormInputs>({
    defaultValues: {
      patientAge: 72,
      patientGender: 'Female',
      egfr: 58
    }
  });

  const patientAge = watch('patientAge');
  const patientGender = watch('patientGender');
  const egfr = watch('egfr');

  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

  const handleAddMedicine = () => {
    const newItem: MedicineItem = {
      id: Date.now().toString(),
      name: '',
      dosage: '10 mg',
      frequency: 'Once daily',
      route: 'Oral'
    };
    setMedicines([...medicines, newItem]);
  };

  const handleRemoveMedicine = (id: string) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: string) => {
    setMedicines(
      medicines.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSelectSuggestion = (id: string, name: string) => {
    handleUpdateMedicine(id, 'name', name);
    setActiveSuggestionIndex(null);
  };

  const handlePredict = async () => {
    if (!clinician.authenticated) {
      onOpenAuth();
      return;
    }

    // Validate medicine names
    const validMeds = medicines.filter((m) => m.name.trim() !== '');
    if (validMeds.length === 0) {
      alert('Please enter at least one medication name.');
      return;
    }

    setIsPredicting(true);

    try {
      // 1. Format the data to match what the FastAPI backend expects
      const formattedMeds = validMeds.map((med, index) => ({
        id: `med-${index}`,
        name: med.name.trim(),
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route || "Oral"
      }));

      // 2. Call the real FastAPI Backend!
      const mlResponse = await apiService.predictInteraction(
        { age: patientAge, gender: patientGender, egfr: egfr },
        formattedMeds,
        clinician.id
      );

      // 3. Map the backend response to UI
      if (mlResponse.success) {
        const currentUser = auth.currentUser;
        const dynamicPatientName = (currentUser?.displayName && currentUser.displayName.trim() !== '')
          ? currentUser.displayName
          : (clinician.name && clinician.name !== 'Guest User')
          ? clinician.name
          : 'Manual Patient Entry';

        const resultData: AnalysisResult = {
          id: mlResponse.data?.id || `MANUAL-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
          patientId: 'PAT-MANUAL',
          patientName: dynamicPatientName,
          patientAge,
          patientGender,
          status: 'Completed',
          ...mlResponse.data 
        };
        const enriched = enrichAnalysisWithDetails(resultData);
        syncAnalysisToFirestore(clinician.id, enriched);
        onAnalysisComplete(enriched);
      }
    } catch (err: any) {
      console.error('Manual Analysis failed:', err);
      alert(err.message || "Failed to connect to the ML pipeline. Is your FastAPI server running?");
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#1565C0] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">
          <Pill className="w-3.5 h-3.5" /> Dynamic Pharmaceutical Builder
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
          Manual Medication Entry & Risk Simulation
        </h1>
        <p className="text-slate-500 text-xs font-medium">
          Enter custom drug combinations, dosages, and patient clinical parameters (age, gender, renal function) to run AI interaction predictions.
        </p>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Medication Builder */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 font-poppins flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#1565C0]" /> Prescribed Medications List ({medicines.length})
            </h2>

            <button
              onClick={handleAddMedicine}
              className="bg-blue-50 hover:bg-blue-100 text-[#1565C0] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>

          {/* Dynamic Inputs */}
          <div className="space-y-4">
            {medicines.map((med, index) => (
              <div
                key={med.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative transition-all hover:border-blue-300"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>Medication #{index + 1}</span>
                  {medicines.length > 1 && (
                    <button
                      onClick={() => handleRemoveMedicine(med.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Medicine Name with Autocomplete */}
                  <div className="sm:col-span-5 relative">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Drug Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Warfarin, Metformin..."
                      value={med.name}
                      onFocus={() => setActiveSuggestionIndex(index)}
                      onChange={(e) => handleUpdateMedicine(med.id, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1565C0] font-medium"
                    />

                    {/* Autocomplete Dropdown */}
                    {activeSuggestionIndex === index && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {COMMON_MEDICATIONS.filter((item) =>
                          item.toLowerCase().includes(med.name.toLowerCase())
                        ).map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectSuggestion(med.id, item)}
                            className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#1565C0] cursor-pointer font-medium"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dosage */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5mg, 500mg"
                      value={med.dosage}
                      onChange={(e) => handleUpdateMedicine(med.id, 'dosage', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1565C0]"
                    />
                  </div>

                  {/* Frequency */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Frequency & Route
                    </label>
                    <select
                      value={med.frequency}
                      onChange={(e) => handleUpdateMedicine(med.id, 'frequency', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1565C0]"
                    >
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily with meals">Twice daily with meals</option>
                      <option value="Three times daily">Three times daily</option>
                      <option value="Every 6 hours PRN">Every 6 hours PRN</option>
                      <option value="Bedtime">Bedtime</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddMedicine}
            className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-600 hover:text-[#1565C0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Another Medication
          </button>
        </div>

        {/* Right Column: Patient Clinical Parameters */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 font-poppins flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-[#1565C0]" /> Patient Clinical Profile
            </h3>

            {/* Age */}
            {/* Patient Demographics Form */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Age: <span className="font-bold text-[#1565C0]">{patientAge} Years</span>
              </label>
              <input
                type="range"
                min="18"
                max="95"
                value={patientAge}
                onChange={(e) => setValue('patientAge', Number(e.target.value))}
                className="w-full accent-[#1565C0] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>18 Yrs</span>
                <span>65 Yrs (Geriatric)</span>
                <span>95 Yrs</span>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biological Sex
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('patientGender', 'Female')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    patientGender === 'Female'
                      ? 'bg-[#1565C0] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setValue('patientGender', 'Male')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    patientGender === 'Male'
                      ? 'bg-[#1565C0] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Male
                </button>
              </div>
            </div>

            {/* Kidney Function (Renal eGFR) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700">
                  Kidney Function (eGFR)
                </label>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {egfr} mL/min
                </span>
              </div>

              <input
                type="range"
                min="15"
                max="120"
                value={egfr}
                onChange={(e) => setValue('egfr', Number(e.target.value))}
                className="w-full accent-[#1565C0] cursor-pointer"
              />

              {/* Status Badge */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                  egfr >= 90 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : egfr >= 60 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : egfr >= 30 
                    ? 'bg-orange-50 text-orange-800 border-orange-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {egfr >= 90 
                    ? '🟢 Healthy / Normal Kidneys (90+)' 
                    : egfr >= 60 
                    ? '🟡 Mildly Reduced (60-89)' 
                    : egfr >= 30 
                    ? '🟠 Stage 3 CKD Impairment (30-59)' 
                    : '🔴 Severe Impairment Stage 4-5 (< 30)'}
                </span>
              </div>

              {/* Friendly Everyday Explanation Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#1565C0] shrink-0" />
                  What is eGFR?
                </p>
                <p className="leading-relaxed">
                  eGFR measures how well your kidneys filter medications out of your body. <strong>90+ is normal and healthy</strong>. If you don't know your test results, keep it at <strong>90 (Normal)</strong>.
                </p>
              </div>
            </div>

            {/* Predict Button */}
            {!clinician.authenticated && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">Sign in or create an account to run AI side effect predictions.</span>
              </div>
            )}

            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className={`w-full font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 ${
                !clinician.authenticated
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-[#1565C0] hover:bg-blue-700 text-white'
              }`}
            >
              {isPredicting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating Matrix & SHAP...
                </>
              ) : !clinician.authenticated ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  Sign In / Sign Up to Predict Side Effects
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-sky-200" />
                  Predict Side Effects & Interactions
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};