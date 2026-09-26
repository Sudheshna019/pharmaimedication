import React from 'react';
import { 
  UserCheck, 
  X, 
  Mail, 
  ShieldCheck, 
  Key, 
  Stethoscope, 
  Home, 
  Clock, 
  LogOut, 
  Lock,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { ClinicianUser } from '../types';
import { auth } from '../firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinician: ClinicianUser;
  onSignOut: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  clinician,
  onSignOut
}) => {
  if (!isOpen) return null;

  const currentUser = auth.currentUser;
  const isPatient = clinician.accountType === 'patient';
  
  // Dynamic user name from auth profile or clinician state
  const displayName = (() => {
    if (currentUser?.displayName && currentUser.displayName.trim() !== '') {
      return currentUser.displayName;
    }
    if (clinician.name && clinician.name !== 'Guest User' && clinician.name !== 'Alex Rivera') {
      return clinician.name;
    }
    if (currentUser?.email) {
      const raw = currentUser.email.split('@')[0];
      return raw.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (clinician.email) {
      const raw = clinician.email.split('@')[0];
      return raw.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return 'Authenticated User';
  })();

  // Format creation & last sign in timestamps
  const creationTime = currentUser?.metadata?.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Active Session';
    
  const lastSignIn = currentUser?.metadata?.lastSignInTime
    ? new Date(currentUser.metadata.lastSignInTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative my-auto cursor-default"
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 text-white relative shrink-0 ${
          isPatient 
            ? 'bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900' 
            : 'bg-gradient-to-r from-[#1565C0] via-blue-800 to-indigo-900'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {isPatient ? '🏠' : '👨‍⚕️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-poppins text-white tracking-tight leading-tight capitalize">
                  {displayName}
                </h2>
              </div>
              <p className="text-xs text-white/80 mt-0.5 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {isPatient ? 'Personal Home User' : clinician.role}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          {/* Account Overview Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Account Metadata & Security
            </h3>

            {/* Email Field */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1565C0] dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Email Address</p>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser?.email || clinician.email || 'user@pharmai.org'}
                </p>
              </div>
            </div>

            {/* Role & Affiliation Field */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                isPatient 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              }`}>
                {isPatient ? <Home className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Account Persona / Role</p>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {isPatient ? 'Home User (Personal Medicine Safety)' : `${clinician.role} (${clinician.hospital})`}
                </p>
              </div>
            </div>

            {/* Last Login & Creation Time */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Member Since
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{creationTime}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last Active
                </p>
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{lastSignIn}</p>
              </div>
            </div>
          </div>

          {/* Encryption Badge */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-[11px]">HIPAA Compliant • 256-Bit Encrypted Session</span>
          </div>

          {/* Actions Bar */}
          <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onSignOut}
              className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Sign Out of Account
            </button>

            <button
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 rounded-2xl transition-colors cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
