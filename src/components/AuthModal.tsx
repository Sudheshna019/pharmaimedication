import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  KeyRound, 
  X, 
  BadgeCheck, 
  Stethoscope, 
  Home, 
  Building2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  LogOut,
  Sparkles,
  Loader2
} from 'lucide-react';
import { ClinicianUser } from '../types';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinician: ClinicianUser;
  onUpdateClinician: (updated: ClinicianUser) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  npiNumber?: string;
  hospital?: string;
  patientAge?: string;
  firebaseError?: string;
}

const PREDEFINED_GOALS = [
  'Just checking',
  'Checking daily side effects',
  'Family prescription safety',
  'Preventing drug interactions',
  'Chronic medicine tracking'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  clinician,
  onUpdateClinician
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(
    clinician.authenticated ? 'signin' : 'signup'
  );
  
  const [accountType, setAccountType] = useState<'doctor' | 'patient'>(
    clinician.accountType || 'doctor'
  );

  // Form Fields
  const [name, setName] = useState(clinician.authenticated ? clinician.name : '');
  const [email, setEmail] = useState(clinician.authenticated ? clinician.email : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Doctor fields
  const [doctorRole, setDoctorRole] = useState(clinician.role && clinician.role !== 'Unauthenticated Guest' ? clinician.role : 'Attending Physician');
  const [hospital, setHospital] = useState(clinician.hospital && clinician.hospital !== 'Unauthenticated Session' ? clinician.hospital : 'St. Jude Academic Medical Center');
  const [npiNumber, setNpiNumber] = useState(clinician.npiNumber || '1942083109');
  
  // Patient fields
  const [patientAge, setPatientAge] = useState<number | string>(clinician.patientAge || 45);
  const [healthGoals, setHealthGoals] = useState(clinician.healthGoals || 'Just checking');
  const [isCustomGoal, setIsCustomGoal] = useState<boolean>(
    Boolean(clinician.healthGoals && !PREDEFINED_GOALS.includes(clinician.healthGoals))
  );

  // Validation & UI State
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitAttempted(false);
      setPassword('');
      setConfirmPassword('');
      if (!clinician.authenticated) {
        setMode('signup');
      }
    }
  }, [isOpen, clinician.authenticated]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email || email.trim() === '') {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'signup') {
      if (!name || name.trim() === '') {
        newErrors.name = 'Full name is required.';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }

      if (accountType === 'doctor') {
        if (!npiNumber || npiNumber.trim() === '') newErrors.npiNumber = 'NPI is required.';
        if (!hospital || hospital.trim() === '') newErrors.hospital = 'Hospital is required.';
      }

      if (accountType === 'patient') {
        const numAge = typeof patientAge === 'number' ? patientAge : parseInt(patientAge, 10);
        if (patientAge === '' || isNaN(numAge) || numAge < 18) {
          newErrors.patientAge = 'Minimum age required is 18.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let userCredential;
      
      // REAL FIREBASE LOGIC
      if (mode === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Store in localStorage for API client interceptor & Firestore sync
      localStorage.setItem('rx_firebase_token', idToken);
      localStorage.setItem('rx_user_uid', user.uid);
      
      // Dynamic Name Resolution (No hardcoded demo fallbacks)
      const rawEmailName = email.includes('@') 
        ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
        : 'User';
      
      const computedName = (name && name.trim() !== '') 
        ? name.trim() 
        : (user.displayName && user.displayName.trim() !== '') 
        ? user.displayName.trim() 
        : rawEmailName;

      if (accountType === 'doctor') {
        const formattedName = computedName.toLowerCase().startsWith('dr.') 
          ? computedName 
          : `Dr. ${computedName}`;
        
        onUpdateClinician({
          id: user.uid,
          accountType: 'doctor',
          name: formattedName,
          email: user.email || email.trim(),
          role: doctorRole,
          hospital: hospital.trim(),
          npiNumber: npiNumber.trim(),
          department: 'Division of Clinical Pharmacology',
          title: `${doctorRole} • ${hospital.trim()}`,
          authenticated: true,
          token: idToken
        });
      } else {
        const numericAge = typeof patientAge === 'number' ? patientAge : (parseInt(patientAge as string, 10) || 45);
        onUpdateClinician({
          id: user.uid,
          accountType: 'patient',
          name: computedName,
          email: user.email || email.trim(),
          role: 'Personal Home User',
          hospital: 'Personal Health Vault',
          department: 'Outpatient Wellness',
          patientAge: numericAge,
          healthGoals,
          title: `Home User (${numericAge} Yrs) • Personal Medicine Safety`,
          authenticated: true,
          token: idToken
        });
      }

      onClose();
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      let errorMsg = "Authentication failed. Please check your credentials.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "An account with this email already exists. Please Sign In.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMsg = "Invalid email or password.";
      }
      
      setErrors(prev => ({ ...prev, firebaseError: errorMsg }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('rx_firebase_token');
      localStorage.removeItem('rx_user_uid');
      onUpdateClinician({
        id: 'GUEST-001',
        name: 'Guest User',
        title: 'Guest Session • Not Logged In',
        department: 'General Public',
        hospital: 'Unauthenticated Session',
        email: '',
        role: 'Unauthenticated Guest',
        npiNumber: '',
        accountType: 'patient',
        authenticated: false
      });
      onClose();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const fillDemoAccount = (type: 'doctor' | 'patient') => {
    setErrors({});
    setAccountType(type);
    if (type === 'doctor') {
      setName('Sarah Lin');
      setEmail('s.lin@stjudemedical.org');
      setPassword('PharmAI2026!');
      setConfirmPassword('PharmAI2026!');
      setNpiNumber('1942083109');
      setHospital('St. Jude Academic Medical Center');
      setDoctorRole('Attending Physician');
    } else {
      setName('Alex Rivera');
      setEmail('alex.rivera@gmail.com');
      setPassword('SafetyHome2026!');
      setConfirmPassword('SafetyHome2026!');
      setPatientAge(45);
      setHealthGoals('Checking daily side effects');
      setIsCustomGoal(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden relative my-auto cursor-default"
      >
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1565C0] via-blue-800 to-indigo-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-poppins text-white tracking-tight">
                  PharmAI Account Authentication
                </h2>
                {clinician.authenticated && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Active Session
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Sign in or create an account to unlock prescription PDF uploads & clinical analysis
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-5 bg-black/20 p-1 rounded-2xl border border-white/10 grid grid-cols-2 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrors({});
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-[#1565C0] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrors({});
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-[#1565C0] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleAuthSubmit} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">

          {/* Firebase Server Error Alert */}
          {errors.firebaseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3.5 text-xs flex items-center gap-3 animate-headShake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="font-bold">{errors.firebaseError}</p>
            </div>
          )}

          {/* Persona Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                1. Account Type / Persona
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('doctor')}
                  className="text-[10px] text-[#1565C0] hover:underline font-bold cursor-pointer"
                >
                  Fill Doctor Demo
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('patient')}
                  className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  Fill Patient Demo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAccountType('doctor');
                  if (submitAttempted) validateForm();
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  accountType === 'doctor'
                    ? 'border-[#1565C0] bg-blue-50/70 text-[#1565C0] ring-2 ring-[#1565C0]/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${accountType === 'doctor' ? 'bg-[#1565C0] text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  {accountType === 'doctor' && <CheckCircle2 className="w-4 h-4 text-[#1565C0]" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold font-poppins">Doctor / Clinician</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Hospitals, physicians & clinical EHR review
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType('patient');
                  if (submitAttempted) validateForm();
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  accountType === 'patient'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${accountType === 'patient' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Home className="w-4 h-4" />
                  </div>
                  {accountType === 'patient' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold font-poppins">Patient / Home User</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Personal medication safety & family checks
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-4">
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
              2. Credentials & Account Details
            </label>

            {/* Name Input (Only for Sign Up) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (submitAttempted) validateForm();
                    }}
                    placeholder={accountType === 'doctor' ? "Dr. Sarah Lin" : "Alex Rivera"}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                      errors.name 
                        ? 'bg-rose-50/50 border-rose-500 focus:border-rose-600' 
                        : 'bg-slate-50 border-slate-200 focus:border-[#1565C0]'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.name}
                  </p>
                )}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (submitAttempted) validateForm();
                  }}
                  placeholder="name@organization.com"
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                    errors.email 
                      ? 'bg-rose-50/50 border-rose-500 focus:border-rose-600' 
                      : 'bg-slate-50 border-slate-200 focus:border-[#1565C0]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (submitAttempted) validateForm();
                  }}
                  placeholder="••••••••••••"
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                    errors.password 
                      ? 'bg-rose-50/50 border-rose-500 focus:border-rose-600' 
                      : 'bg-slate-50 border-slate-200 focus:border-[#1565C0]'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password (Sign Up Mode) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (submitAttempted) validateForm();
                    }}
                    placeholder="••••••••••••"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                      errors.confirmPassword 
                        ? 'bg-rose-50/50 border-rose-500 focus:border-rose-600' 
                        : 'bg-slate-50 border-slate-200 focus:border-[#1565C0]'
                    }`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Role-Specific Additional Fields (Sign Up) */}
            {mode === 'signup' && (
              accountType === 'doctor' ? (
                <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Clinical Role
                      </label>
                      <select
                        value={doctorRole}
                        onChange={(e) => setDoctorRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#1565C0] font-medium cursor-pointer"
                      >
                        <option value="Attending Physician">Attending Physician</option>
                        <option value="Clinical Pharmacist">Clinical Pharmacist</option>
                        <option value="Nurse Practitioner">Nurse Practitioner</option>
                        <option value="EHR Administrator">EHR Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        NPI / License # <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={npiNumber}
                        onChange={(e) => {
                          setNpiNumber(e.target.value);
                          if (submitAttempted) validateForm();
                        }}
                        placeholder="1942083109"
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-medium ${
                          errors.npiNumber ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#1565C0]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Hospital / Clinic Affiliation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hospital}
                      onChange={(e) => {
                        setHospital(e.target.value);
                        if (submitAttempted) validateForm();
                      }}
                      placeholder="St. Jude Academic Medical Center"
                      className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-medium ${
                        errors.hospital ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#1565C0]'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Your Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="18"
                        placeholder="45"
                        value={patientAge}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setPatientAge('');
                            if (submitAttempted) validateForm();
                            return;
                          }
                          // Strip non-digits and limit length to max 3 digits
                          const cleanDigits = raw.replace(/\D/g, '').slice(0, 3);
                          if (cleanDigits === '') {
                            setPatientAge('');
                          } else {
                            setPatientAge(parseInt(cleanDigits, 10));
                          }
                          if (submitAttempted) validateForm();
                        }}
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onBlur={() => {
                          if (patientAge === '' || Number(patientAge) < 18) {
                            setPatientAge(45);
                          }
                        }}
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-medium ${
                          errors.patientAge ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-600'
                        }`}
                      />
                      {errors.patientAge && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1">
                          {errors.patientAge}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Primary Health Goal
                        </label>
                        {isCustomGoal && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {healthGoals.length}/100 letters
                          </span>
                        )}
                      </div>

                      <select
                        value={
                          isCustomGoal
                            ? 'other'
                            : PREDEFINED_GOALS.includes(healthGoals)
                            ? healthGoals
                            : 'other'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'other') {
                            setIsCustomGoal(true);
                            setHealthGoals('');
                          } else {
                            setIsCustomGoal(false);
                            setHealthGoals(val);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium cursor-pointer"
                      >
                        <option value="Just checking">Just checking</option>
                        <option value="Checking daily side effects">Checking daily side effects</option>
                        <option value="Family prescription safety">Family prescription safety</option>
                        <option value="Preventing drug interactions">Preventing drug interactions</option>
                        <option value="Chronic medicine tracking">Chronic medicine tracking</option>
                        <option value="other">✍️ Other (Type custom goal...)</option>
                      </select>

                      {isCustomGoal && (
                        <input
                          type="text"
                          maxLength={100}
                          autoFocus
                          value={healthGoals}
                          onChange={(e) => setHealthGoals(e.target.value.slice(0, 100))}
                          placeholder="Type your custom health goal..."
                          className="w-full bg-white border border-emerald-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium mt-1 animate-fade-in"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-bold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50 text-white ${
                accountType === 'doctor'
                  ? 'bg-[#1565C0] hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...</>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4 text-white" />
                  Sign In as {accountType === 'doctor' ? 'Clinician' : 'Home User'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-white" />
                  Create Account & Start Session
                </>
              )}
            </button>

            {/* Mode Toggle Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center mt-2">
              {mode === 'signin' ? (
                <p className="text-xs text-slate-600 font-medium">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrors({});
                    }}
                    className="font-extrabold text-[#1565C0] hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
                  >
                    Create a new account (Sign Up) →
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-600 font-medium">
                  Already registered / Have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrors({});
                    }}
                    className="font-extrabold text-[#1565C0] hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
                  >
                    Sign In to Existing Account →
                  </button>
                </p>
              )}
            </div>

            {/* Sign Out Button if active session exists */}
            {clinician.authenticated && (
              <div className="border-t border-slate-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Sign Out ({clinician.name})
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};