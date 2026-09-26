import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  HeartPulse, 
  Thermometer, 
  Search, 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  UserCheck, 
  FileCheck, 
  Database,
  Radio,
  Pill,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { MOCK_PATIENTS } from '../data/mockData';
import { PatientRecord, VitalsPoint } from '../types';

export const RealtimeVitalsEHR: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord>(MOCK_PATIENTS[0]);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsPoint[]>([]);
  const [currentHR, setCurrentHR] = useState<number>(78);
  const [currentSpO2, setCurrentSpO2] = useState<number>(98);
  const [currentBP, setCurrentBP] = useState<string>('134/84');
  const [currentTemp, setCurrentTemp] = useState<number>(36.8);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Simulate real-time streaming vitals update every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const hrDelta = Math.floor(Math.random() * 5) - 2;
      const spo2Delta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;

      const newHR = Math.max(55, Math.min(110, currentHR + hrDelta));
      const newSpO2 = Math.max(92, Math.min(100, currentSpO2 + spo2Delta));

      setCurrentHR(newHR);
      setCurrentSpO2(newSpO2);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setVitalsHistory((prev) => [
        ...prev.slice(-15),
        { time: nowStr, hr: newHR, spo2: newSpO2, sysBP: 134, diaBP: 84, rr: 16 }
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, [currentHR, currentSpO2]);

  const filteredPatients = MOCK_PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
            FHIR v4 EHR Integration & Live Telemetry Stream
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-poppins">
            Real-Time Patient Vitals & EHR Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bedside telemetry synced with active prescription interaction alerts for inpatient & ICU clinical oversight.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-slate-800">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Encrypted FHIR EHR Storage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Patient Selection Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 font-poppins flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1565C0]" /> EHR Patient Directory
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">HIPAA Vault</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by MRN or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="space-y-3">
            {filteredPatients.map((pat) => (
              <div
                key={pat.id}
                onClick={() => setSelectedPatient(pat)}
                className={`p-4 rounded-xl border text-xs transition-all cursor-pointer space-y-1.5 ${
                  selectedPatient.id === pat.id
                    ? 'bg-blue-50/80 border-[#1565C0] text-slate-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="font-poppins text-slate-900">{pat.name}</span>
                  <span className="font-mono text-[10px] text-[#1565C0]">{pat.mrn}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {pat.age} Yrs • {pat.gender} • Blood Type: {pat.bloodType}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {pat.chronicConditions.slice(0, 2).map((c, i) => (
                    <span key={i} className="bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-md">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Vitals Monitor & EHR Profile */}
        <div className="lg:col-span-8 space-y-6">
          {/* Vitals Telemetry Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                <div>
                  <h3 className="text-base font-bold font-poppins text-white">{selectedPatient.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Bedside Telemetry Stream • {selectedPatient.mrn}</p>
                </div>
              </div>

              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-full font-mono">
                TELEMETRY ONLINE
              </span>
            </div>

            {/* Vitals Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Heart Rate */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <HeartPulse className="w-4 h-4 text-rose-500 animate-bounce" /> Heart Rate
                  </span>
                  <span>BPM</span>
                </div>
                <p className="text-3xl font-extrabold text-white font-mono">{currentHR}</p>
                <span className="text-[10px] text-emerald-400">Sinus Rhythm</span>
              </div>

              {/* SpO2 Oxygen */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4 text-sky-400" /> SpO2
                  </span>
                  <span>%</span>
                </div>
                <p className="text-3xl font-extrabold text-white font-mono">{currentSpO2}</p>
                <span className="text-[10px] text-sky-400">Room Air</span>
              </div>

              {/* Blood Pressure */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Blood Pressure</span>
                  <span>mmHg</span>
                </div>
                <p className="text-3xl font-extrabold text-white font-mono">{selectedPatient.currentVitals.bp}</p>
                <span className="text-[10px] text-amber-400">Pre-hypertension</span>
              </div>

              {/* Temperature */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-4 h-4 text-amber-400" /> Temperature
                  </span>
                  <span>°C</span>
                </div>
                <p className="text-3xl font-extrabold text-white font-mono">{selectedPatient.currentVitals.temp}</p>
                <span className="text-[10px] text-emerald-400">Afebrile</span>
              </div>
            </div>

            {/* Simulated ECG Waveform Canvas */}
            <div className="bg-black/60 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Lead II Real-time Waveform</span>
                <span className="text-emerald-400 font-bold">25 mm/s • 10 mm/mV</span>
              </div>
              <div className="h-16 w-full flex items-center justify-center overflow-hidden relative">
                <svg className="w-full h-full text-emerald-400 opacity-90 stroke-current fill-none" viewBox="0 0 500 50">
                  <path
                    d="M 0 25 L 50 25 L 60 10 L 70 40 L 80 5 L 90 45 L 100 25 L 150 25 L 160 10 L 170 40 L 180 5 L 190 45 L 200 25 L 250 25 L 260 10 L 270 40 L 280 5 L 290 45 L 300 25 L 350 25 L 360 10 L 370 40 L 380 5 L 390 45 L 400 25 L 450 25 L 460 10 L 470 40 L 480 5 L 490 45 L 500 25"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Medication Alert Synchronization */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-poppins flex items-center gap-2 border-b border-slate-100 pb-3">
              <Pill className="w-4 h-4 text-[#1565C0]" /> Active EHR Prescriptions & Cross-Vitals Alerts
            </h3>

            <div className="space-y-3 text-xs">
              {selectedPatient.activePrescriptions.map((rx, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{rx}</p>
                    <p className="text-[11px] text-slate-500">Verified EHR Active Order • Auto-Synced</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-1 rounded-full">
                    Therapeutic Range
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
