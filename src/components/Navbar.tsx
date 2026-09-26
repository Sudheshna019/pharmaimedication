import React from 'react';
import { 
  ShieldCheck, 
  FileText, 
  PlusCircle, 
  LayoutDashboard, 
  Activity, 
  History, 
  BrainCircuit, 
  UserCheck, 
  Home,
  Lock,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { ClinicianUser } from '../types';
import { auth } from '../firebase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clinician: ClinicianUser;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  clinician,
  onOpenAuth,
  onOpenProfile,
  isDarkMode,
  setIsDarkMode
}) => {
  const currentUser = auth.currentUser;
  
  const getDisplayName = () => {
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
  };
  const isDoctor = clinician.authenticated && clinician.accountType === 'doctor';
  
  const navItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'analyze', label: 'Analyze Prescription', icon: FileText, highlight: true },
    { id: 'manual', label: 'Manual Entry', icon: PlusCircle },
    ...(isDoctor ? [
      { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard },
      { id: 'vitals', label: 'Vitals EHR', icon: Activity }
    ] : []),
    { id: 'reports', label: isDoctor ? 'History' : 'My History', icon: History }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200 print:hidden">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1565C0] text-white flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-poppins">
                  Pharm<span className="text-[#1565C0] dark:text-blue-400">AI</span>
                </h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold hidden sm:block">
                Decision Support Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 py-1 text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#1565C0] dark:text-blue-400 border-b-2 border-[#1565C0] dark:border-blue-400 pb-1'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1565C0] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {item.label}
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0] dark:bg-blue-400"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Clinician Profile / Theme Toggle / Auth Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {clinician.authenticated ? (
              <button
                onClick={onOpenProfile || onOpenAuth}
                className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs cursor-pointer"
                title="View User Profile Details"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  clinician.accountType === 'patient'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-950 text-[#1565C0] dark:text-blue-300'
                }`}>
                  {clinician.accountType === 'patient' ? '🏠' : '👨‍⚕️'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold text-slate-900 dark:text-white leading-tight">{getDisplayName()}</p>
                  <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 leading-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {clinician.accountType === 'patient' ? 'Home User' : clinician.role}
                  </p>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-1" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-[#1565C0] hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-sky-200" />
                <span>Sign In / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation for Mobile / Tablet */}
      <div className="lg:hidden bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 px-4 py-2 overflow-x-auto scrollbar-none flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#1565C0] dark:bg-blue-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
