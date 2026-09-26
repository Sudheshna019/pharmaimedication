import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { AnalyzePrescription } from './components/AnalyzePrescription';
import { ManualEntry } from './components/ManualEntry';
import { ResultsView } from './components/ResultsView';
import { DashboardView } from './components/DashboardView';
import { RealtimeVitalsEHR } from './components/RealtimeVitalsEHR';
import { HistoryReports } from './components/HistoryReports';
import { ReportPrintView } from './components/ReportPrintView';
import { AboutAI } from './components/AboutAI';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { auth, fetchUserAnalysesFromFirestore, syncAnalysisToFirestore, deleteAnalysisFromFirestore } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

import { INITIAL_CLINICIAN, SAMPLE_ANALYSES } from './data/mockData';
import { AnalysisResult, ClinicianUser } from './types';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function App() {
  // Read hash or saved tab for initial route
  const getInitialTab = (): string => {
    try {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['landing', 'analyze', 'manual', 'results', 'dashboard', 'vitals', 'reports', 'report-print', 'about'];
      if (hash && validTabs.includes(hash)) return hash;
      const saved = localStorage.getItem('rx_active_tab');
      if (saved && validTabs.includes(saved)) return saved;
    } catch (e) {
      // Storage error
    }
    return 'landing';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  const [clinician, setClinician] = useState<ClinicianUser>(() => {
    try {
      const saved = localStorage.getItem('rx_clinician_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Purge hardcoded demo name if found in saved state
          if (parsed.name === 'Alex Rivera') {
            const currentUser = auth.currentUser;
            if (currentUser?.email) {
              const emailName = currentUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              parsed.name = emailName;
            }
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load clinician from localStorage', e);
    }
    return INITIAL_CLINICIAN;
  });

  // Sync Firebase Auth user profile on page load / sign-in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const emailName = user.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'User';
        const cleanName = (user.displayName && user.displayName.trim() !== '') 
          ? user.displayName 
          : emailName;

        setClinician((prev) => {
          if (!prev.authenticated || prev.name === 'Alex Rivera' || prev.name === 'Guest User' || prev.email !== user.email) {
            const updated: ClinicianUser = {
              id: user.uid,
              accountType: prev.accountType || 'patient',
              name: cleanName,
              email: user.email || '',
              role: prev.role && prev.role !== 'Unauthenticated Guest' ? prev.role : 'Personal Home User',
              hospital: prev.hospital && prev.hospital !== 'Unauthenticated Session' ? prev.hospital : 'Personal Health Vault',
              department: 'Outpatient Wellness',
              patientAge: prev.patientAge || 45,
              healthGoals: prev.healthGoals || 'Checking family prescriptions & daily safety',
              title: prev.accountType === 'doctor' ? `Attending Physician` : `Home User (${prev.patientAge || 45} Yrs) • Personal Medicine Safety`,
              authenticated: true
            };
            try {
              localStorage.setItem('rx_clinician_user', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rx_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // User-Isolated History Records State
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  // Load User-Isolated History from localStorage & Firestore whenever clinician profile changes
  useEffect(() => {
    let isMounted = true;
    const userId = clinician.authenticated ? clinician.id : 'guest';
    const storageKey = `rx_user_history_${userId}`;

    // 1. Load local cached history for this specific user
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } else {
        // If unauthenticated or no records yet
        setHistory(clinician.authenticated ? [] : []);
      }
    } catch (e) {
      setHistory([]);
    }

    // 2. Fetch live analysis history from Firestore for authenticated user
    if (clinician.authenticated && clinician.id && clinician.id !== 'GUEST-001') {
      fetchUserAnalysesFromFirestore(clinician.id).then((remoteRecords) => {
        if (!isMounted || !remoteRecords || remoteRecords.length === 0) return;

        setHistory((prevLocal) => {
          // Merge local and remote records by unique analysis ID
          const recordMap = new Map<string, AnalysisResult>();
          prevLocal.forEach((item) => recordMap.set(item.id, item));
          remoteRecords.forEach((item) => recordMap.set(item.id, item));

          const merged = Array.from(recordMap.values());
          try {
            localStorage.setItem(storageKey, JSON.stringify(merged));
          } catch (err) {}
          return merged;
        });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [clinician.id, clinician.authenticated]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('rx_firebase_token');
      localStorage.removeItem('rx_user_uid');
      setClinician(INITIAL_CLINICIAN);
      setHistory([]);
      setIsProfileOpen(false);
      showToast('Signed out of session');
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleDeleteHistoryItem = async (analysisId: string) => {
    const userId = clinician.authenticated ? clinician.id : 'guest';
    const storageKey = `rx_user_history_${userId}`;

    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== analysisId);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (clinician.authenticated && clinician.id) {
      deleteAnalysisFromFirestore(clinician.id, analysisId);
    }

    showToast(`Report record ${analysisId} deleted`);
  };

  // Persisted Active Result
  const [activeResult, setActiveResult] = useState<AnalysisResult>(() => {
    try {
      const saved = localStorage.getItem('rx_active_result');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      // Fallback
    }
    return SAMPLE_ANALYSES[0];
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Unified Tab Switcher syncing browser URL & storage
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem('rx_active_tab', newTab);
      if (window.location.hash !== `#${newTab}`) {
        window.history.pushState({ tab: newTab }, '', `#${newTab}`);
      }
    } catch (e) {
      // Ignore history/storage errors
    }
  };

  // Browser Back/Forward navigation listener
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['landing', 'analyze', 'manual', 'results', 'dashboard', 'vitals', 'reports', 'report-print', 'about'];
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Enforce Patient Role Guards (Restricted Doctor Views)
  useEffect(() => {
    const isPatient = clinician.accountType === 'patient';
    const restrictedDoctorTabs = ['dashboard', 'vitals'];
    if (isPatient && restrictedDoctorTabs.includes(activeTab)) {
      handleTabChange('landing');
      setToastMsg('Access restricted: Clinical Analytics & Vitals EHR are reserved for healthcare providers.');
      setTimeout(() => setToastMsg(null), 4000);
    }
  }, [clinician, activeTab]);

  // Sync theme to localStorage & document element
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('rx_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('rx_theme', 'light');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [isDarkMode]);

  // Sync activeResult to localStorage
  useEffect(() => {
    try {
      if (activeResult) {
        localStorage.setItem('rx_active_result', JSON.stringify(activeResult));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [activeResult]);

  // Sync clinician auth state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rx_clinician_user', JSON.stringify(clinician));
    } catch (e) {
      // Ignore storage errors
    }
  }, [clinician]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    if (!clinician.authenticated) {
      setIsAuthOpen(true);
      showToast('Authentication required. Please sign in or create an account.');
      return;
    }
    
    // Ensure patient name matches logged-in user if patient persona
    if (clinician.accountType === 'patient' && clinician.name) {
      result.patientName = clinician.name;
    }

    setHistory((prev) => {
      const filtered = prev.filter(item => item.id !== result.id);
      const updated = [result, ...filtered];
      const userId = clinician.id || 'guest';
      try {
        localStorage.setItem(`rx_user_history_${userId}`, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    syncAnalysisToFirestore(clinician.id, result);
    setActiveResult(result);
    handleTabChange('results');
    showToast(`Analysis completed for ${result.patientName}. Risk level: ${result.overallRiskLevel}`);
  };

  const handleRunDemo = () => {
    if (!clinician.authenticated) {
      setIsAuthOpen(true);
      showToast('Authentication required. Please sign in or create an account to view prescription predictions.');
      return;
    }
    const demoResult = SAMPLE_ANALYSES[0];
    setActiveResult(demoResult);
    handleTabChange('results');
    showToast(`Loaded Polypharmacy Demo Prescription (${demoResult.patientName})`);
  };

  const handleSelectHistoryResult = (result: AnalysisResult) => {
    if (!clinician.authenticated) {
      setIsAuthOpen(true);
      showToast('Authentication required. Please sign in or create an account to view full AI prediction reports.');
      return;
    }
    setActiveResult(result);
    handleTabChange('results');
  };

  const handlePrintReport = (result?: AnalysisResult) => {
    if (!clinician.authenticated) {
      setIsAuthOpen(true);
      showToast('Authentication required. Please sign in or create an account to view printable clinical reports.');
      return;
    }
    if (result) setActiveResult(result);
    handleTabChange('report-print');
  };

  const handleSaveToEHR = () => {
    const recordId = currentResult.id;
    if (clinician.accountType === 'patient') {
      showToast(`Record ${recordId} saved to your personal medication history vault.`);
    } else {
      showToast(`Record ${recordId} encrypted & appended to EHR Patient MRN-9023411`);
    }
  };

  // Safe fallback result to ensure results and report-print views never render blank
  const currentResult = activeResult || history[0] || SAMPLE_ANALYSES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#1565C0] transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header & Navigation */}
      {activeTab !== 'report-print' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          clinician={clinician}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      )}

      {/* Main View Area */}
      <main className={`flex-1 w-full ${activeTab === 'landing' ? '' : 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'}`}>
        {activeTab === 'landing' && (
          <LandingPage
            setActiveTab={handleTabChange}
            onRunDemo={handleRunDemo}
          />
        )}

        {activeTab === 'analyze' && (
          <AnalyzePrescription
            onAnalysisComplete={handleAnalysisComplete}
            onRunDemo={handleRunDemo}
            clinician={clinician}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'manual' && (
          <ManualEntry
            onAnalysisComplete={handleAnalysisComplete}
            clinician={clinician}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'results' && (
          <ResultsView
            result={currentResult}
            clinician={clinician}
            onPrintReport={() => handlePrintReport(currentResult)}
            onSaveToEHR={handleSaveToEHR}
          />
        )}

        {activeTab === 'dashboard' && clinician.accountType === 'doctor' && (
          <DashboardView
            history={history}
            onSelectResult={handleSelectHistoryResult}
            onNavigateToAnalyze={() => handleTabChange('analyze')}
          />
        )}

        {activeTab === 'vitals' && clinician.accountType === 'doctor' && <RealtimeVitalsEHR />}

        {activeTab === 'reports' && (
          <HistoryReports
            history={history}
            clinician={clinician}
            onSelectResult={handleSelectHistoryResult}
            onPrintReport={handlePrintReport}
            onDeleteResult={handleDeleteHistoryItem}
          />
        )}

        {activeTab === 'report-print' && (
          <ReportPrintView
            result={currentResult}
            clinician={clinician}
            onBack={() => handleTabChange('results')}
          />
        )}

        {activeTab === 'about' && <AboutAI />}
      </main>

      {/* Footer */}
      {activeTab !== 'report-print' && <Footer setActiveTab={handleTabChange} />}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        clinician={clinician}
        onUpdateClinician={(updated) => {
          setClinician(updated);
          showToast(`Authenticated as ${updated.name} (${updated.role})`);
        }}
      />

      {/* User Profile Details Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        clinician={clinician}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
