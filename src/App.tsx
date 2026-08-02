import React, { useState, useEffect, useRef } from "react";
import StepProgressBar from "./components/StepProgressBar";
import NaturalLanguageStep from "./components/NaturalLanguageStep";
import AhpComparisonStep from "./components/AhpComparisonStep";
import WeightsStep from "./components/WeightsStep";
import DataGridStep from "./components/DataGridStep";
import ResultsStep from "./components/ResultsStep";
import { DecisionData, PairwiseComparison, AHPResult, TopsisResult } from "./types";
import { calculateTOPSIS } from "./utils/math";
import { BrainCircuit, RotateCcw, Sun, Moon, Github, Linkedin } from "lucide-react";
import { useSessionPersistence, WizardSession } from "./hooks/useSessionPersistence";
import ResumeSessionBanner from "./components/ResumeSessionBanner";
import AboutDeveloperModal from "./components/AboutDeveloperModal";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import LimitationsPage from "./components/LimitationsPage";
import MethodologyPage from "./components/MethodologyPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const handleLogoClick = () => {
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      handleReset();
    }
  };

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  
  // Theme State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("converge_theme") : null;
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("converge_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("converge_theme", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Auto-hide header on mobile scroll (< 768px) — declared before the
  // currentStep effect so setHeaderHidden is in scope there.
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  // Ensure every step transition starts at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Always show header when navigating to a new step
    setHeaderHidden(false);
  }, [currentStep]);

  useEffect(() => {
    const SCROLL_THRESHOLD = 10; // px from top where header is always visible

    const handleScroll = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;

      requestAnimationFrame(() => {
        // Only apply auto-hide behaviour on mobile (< 768px)
        if (window.innerWidth >= 768) {
          setHeaderHidden(false);
          lastScrollY.current = window.scrollY;
          scrollTicking.current = false;
          return;
        }

        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        if (currentY <= SCROLL_THRESHOLD) {
          // At or very near the top — always show
          setHeaderHidden(false);
        } else if (delta > 0) {
          // Scrolling down — hide
          setHeaderHidden(true);
        } else if (delta < 0) {
          // Scrolling up — show immediately
          setHeaderHidden(false);
        }

        lastScrollY.current = currentY;
        scrollTicking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Phase 1 State
  const [decisionData, setDecisionData] = useState<DecisionData | null>(null);

  // Phase 2 State
  const [comparisons, setComparisons] = useState<PairwiseComparison[] | null>(null);
  const [ahpResult, setAhpResult] = useState<AHPResult | null>(null);

  // Phase 4 State
  const [rawData, setRawData] = useState<string[][] | null>(null);

  // Phase 5 State
  const [rankings, setRankings] = useState<TopsisResult[] | null>(null);

  // Phase 1 Session Persistence State
  const { loadSession, saveSession, clearSession } = useSessionPersistence();
  const [savedSession, setSavedSession] = useState<WizardSession | null>(() =>
    loadSession()
  );
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(() => {
    const session = loadSession();
    return Boolean(session && session.currentStep > 1);
  });

  useEffect(() => {
    if (showResumeBanner) {
      return;
    }
    if (currentStep > 1 && currentStep < 5) {
      saveSession({
        currentStep,
        userPrompt,
        isManualEntry,
        decisionData,
        comparisons,
        ahpResult,
        rawData,
        rankings,
      });
    } else if (currentStep === 1 || currentStep === 5) {
      clearSession();
    }
  }, [
    currentStep,
    userPrompt,
    isManualEntry,
    decisionData,
    comparisons,
    ahpResult,
    rawData,
    rankings,
    showResumeBanner,
    saveSession,
    clearSession,
  ]);

  const handleResumeSession = () => {
    if (savedSession) {
      setCurrentStep(savedSession.currentStep || 1);
      setUserPrompt(savedSession.userPrompt || "");
      setIsManualEntry(Boolean(savedSession.isManualEntry));
      setDecisionData(savedSession.decisionData || null);
      setComparisons(savedSession.comparisons || null);
      setAhpResult(savedSession.ahpResult || null);
      setRawData(savedSession.rawData || null);
      setRankings(savedSession.rankings || null);
    }
    setShowResumeBanner(false);
  };

  const handleDiscardSession = () => {
    clearSession();
    setSavedSession(null);
    setShowResumeBanner(false);
  };

  const totalSteps = 5;

  const handleStep1Submit = (extracted: DecisionData, prompt: string, manualFlag?: boolean) => {
    setDecisionData(extracted);
    setUserPrompt(prompt);
    setIsManualEntry(Boolean(manualFlag));
    
    // Clear out comparisons if the number of criteria has changed
    if (comparisons && comparisons.length !== (extracted.criteria.length * (extracted.criteria.length - 1)) / 2) {
      setComparisons(null);
      setAhpResult(null);
    }
    
    setCurrentStep(2);
  };

  const handleStep2Submit = (result: AHPResult, comps: PairwiseComparison[]) => {
    setAhpResult(result);
    setComparisons(comps);
    setCurrentStep(3);
  };

  const handleStep3Submit = () => {
    setCurrentStep(4);
  };

  const handleStep4Submit = (gridMatrix: string[][]) => {
    setRawData(gridMatrix);
    
    if (decisionData && ahpResult) {
      try {
        // Calculate TOPSIS on the raw matrix
        const topsisRankings = calculateTOPSIS(
          decisionData.alternatives,
          decisionData.criteria,
          ahpResult.weights,
          gridMatrix
        );
        setRankings(topsisRankings);
        setCurrentStep(5);
        clearSession();
      } catch (err) {
        // Re-throw so DataGridStep catches it, remains on Step 4, and highlights invalid cells
        throw err;
      }
    }
  };

  const handleReset = () => {
    clearSession();
    setCurrentStep(1);
    setUserPrompt("");
    setIsManualEntry(false);
    setDecisionData(null);
    setComparisons(null);
    setAhpResult(null);
    setRawData(null);
    setRankings(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <NaturalLanguageStep
            onNext={handleStep1Submit}
            initialData={decisionData}
            initialUserPrompt={userPrompt}
            initialIsManualEntry={isManualEntry}
          />
        );
      case 2:
        return (
          <AhpComparisonStep
            criteria={decisionData?.criteria ?? []}
            onNext={handleStep2Submit}
            onBack={() => setCurrentStep(1)}
            onComparisonsChange={(updated) => setComparisons(updated)}
            initialComparisons={comparisons}
          />
        );
      case 3:
        if (!ahpResult || !decisionData) return null;
        return (
          <WeightsStep
            criteria={decisionData.criteria}
            ahpResult={ahpResult}
            onNext={handleStep3Submit}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        if (!decisionData || !ahpResult) return null;
        return (
          <DataGridStep
            decision_goal={decisionData.decision_goal}
            alternatives={decisionData.alternatives}
            criteria={decisionData.criteria}
            weights={ahpResult.weights}
            onNext={handleStep4Submit}
            onBack={() => setCurrentStep(3)}
            onGridDataChange={(updated) => setRawData(updated)}
            initialRawData={rawData}
          />
        );
      case 5:
        if (!decisionData || !ahpResult || !rankings || !rawData) return null;
        return (
          <ResultsStep
            decision_goal={decisionData.decision_goal}
            alternatives={decisionData.alternatives}
            criteria={decisionData.criteria}
            weights={ahpResult.weights}
            rankings={rankings}
            rawData={rawData}
            user_prompt={userPrompt}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F4] dark:bg-[#0D0F12] text-[#121212] dark:text-[#F3F4F6] font-sans flex flex-col antialiased" id="app-root">
      {showResumeBanner && savedSession && (
        <ResumeSessionBanner
          session={savedSession}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
        />
      )}

      <AboutDeveloperModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Premium Elegant Navigation Header */}
      <header
        className="bg-white border-b border-[#E5E1DA] dark:bg-[#15181E] dark:border-[#262A33] sticky top-0 z-50 max-[499px]:py-3.5 max-[499px]:px-4 min-[500px]:py-5 min-[500px]:px-8"
        id="app-header"
        style={{
          // Only apply translate on mobile; md+ always stays visible via no-op
          transform: headerHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-[500px]:gap-3 cursor-pointer shrink-0" onClick={handleLogoClick} id="logo-block">
            <div className="w-9 h-9 min-[500px]:w-10 min-[500px]:h-10 shrink-0 rounded-sm bg-[#121212] text-white dark:bg-[#FE9A00] dark:text-black flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-5 h-5 min-[500px]:w-5.5 min-[500px]:h-5.5" />
            </div>
            <div className="flex items-baseline gap-2 shrink-0">
              <span className="text-[20px] min-[500px]:text-2xl min-w-[95px] min-[500px]:min-w-0 shrink-0 font-serif italic font-bold tracking-tight text-[#121212] dark:text-white">Converge</span>
              <span className="hidden md:inline text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500 dark:text-[#9CA3AF]">Decision Support Engine</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 min-[500px]:gap-3 shrink-0" id="header-actions">
            <button
              onClick={toggleTheme}
              className="h-9 max-[639px]:w-9 max-[639px]:px-0 min-[640px]:px-3.5 text-[11px] uppercase font-mono font-bold tracking-wider bg-gray-100 text-[#121212] border border-[#E5E1DA] dark:bg-[#1E222A] dark:text-gray-200 dark:border-[#2C323E] hover:bg-gray-200 dark:hover:bg-[#262A33] rounded-none flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
              id="btn-toggle-theme"
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4 text-[#121212]" />
                  <span className="max-[639px]:hidden min-[640px]:inline">DARK</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#F59E0B]" />
                  <span className="max-[639px]:hidden min-[640px]:inline">LIGHT</span>
                </>
              )}
            </button>

            {location.pathname === "/" ? (
              (decisionData || userPrompt) && (
                <button
                  onClick={handleReset}
                  className="h-9 max-[639px]:w-9 max-[639px]:px-0 min-[640px]:px-3.5 text-[11px] uppercase tracking-wider font-bold bg-white text-[#121212] border border-[#121212] dark:bg-[#15181E] dark:text-[#F59E0B] dark:border-[#F59E0B] hover:bg-gray-50 dark:hover:bg-[#1A1E27] rounded-none flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Restart Application"
                  id="btn-restart-app"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="max-[639px]:hidden min-[640px]:inline">Restart</span>
                </button>
              )
            ) : (
              <Link
                to="/"
                className="h-9 max-[639px]:px-2.5 min-[640px]:px-3.5 text-[11px] uppercase tracking-wider font-bold bg-white text-[#121212] border border-[#121212] dark:bg-[#15181E] dark:text-[#F59E0B] dark:border-[#F59E0B] hover:bg-gray-50 dark:hover:bg-[#1A1E27] rounded-none flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                title="Return to Decision Application"
                id="btn-back-to-app"
              >
                <span>←</span>
                <span>Back to App</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-6 flex-grow flex flex-col space-y-4 md:space-y-6" id="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <>
                {/* Dynamic Goal Badge if active */}
                {decisionData?.decision_goal && currentStep > 1 && (
                  <div className="bg-white border border-[#E5E1DA] dark:bg-[#15181E] dark:border-[#262A33] rounded-none p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 animate-fade-in" id="active-goal-banner">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-[#9CA3AF] font-sans">Current Decision Target</span>
                      <h2 className="text-xl font-serif italic font-semibold text-[#121212] dark:text-white mt-1">{decisionData.decision_goal}</h2>
                    </div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-gray-600 dark:text-[#D1D5DB] bg-[#FBF9F7] dark:bg-[#1C2028] px-3 py-1.5 rounded-none self-start md:self-auto border border-[#E5E1DA] dark:border-[#2C323E]">
                      {decisionData.alternatives.length} Options · {decisionData.criteria.length} Factors
                    </span>
                  </div>
                )}

                {/* Wizard Progress Bar */}
                <div className="bg-white border border-[#E5E1DA] dark:bg-[#15181E] dark:border-[#262A33] rounded-none py-2.5 px-4 sm:py-3 sm:px-5 shadow-2xs" id="progress-bar-card">
                  <StepProgressBar currentStep={currentStep} totalSteps={totalSteps} />
                </div>

                {/* Dynamic Wizard Step Canvas */}
                <div className="bg-white dark:bg-[#15181E] rounded-none p-6 md:p-10 shadow-xs grow" id="wizard-step-canvas">
                  {renderStepContent()}
                </div>
              </>
            }
          />
          <Route path="/limitations" element={<LimitationsPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
        </Routes>
      </main>

      {/* Technical Methodology Footer */}
      <footer className="max-w-4xl mx-auto w-full px-4 mt-8 pb-6" id="app-footer">
        <div className="border-t border-[#E5E1DA] dark:border-[#262A33] max-[619px]:pt-4.5 min-[620px]:pt-6 text-center max-[619px]:space-y-2 min-[620px]:space-y-3">
          <div className="flex flex-wrap items-center justify-center max-[619px]:gap-1.5 min-[620px]:gap-3">
            <span className="max-[619px]:text-xs min-[620px]:text-sm font-medium text-gray-700 dark:text-[#D1D5DB]">
              Built and developed by{" "}
              <span
                onClick={() => setIsAboutModalOpen(true)}
                className="font-serif italic font-bold bg-[#FE9A00]/25 dark:bg-[#FE9A00] text-black max-[619px]:px-1.5 min-[620px]:px-2 py-0.5 rounded-xs cursor-pointer hover:opacity-90 hover:underline transition-all"
                title="Click to learn more about the developer"
                id="footer-author-name"
              >
                Mohammed Aatef
              </span>
            </span>
            <div className="flex items-center max-[619px]:gap-1.5 min-[620px]:gap-2">
              <a
                href="https://github.com/TR-Mohd"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
                className="max-[619px]:w-7 max-[619px]:h-7 min-[620px]:w-9 min-[620px]:h-9 rounded-full inline-flex items-center justify-center bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors duration-200 shadow-2xs"
              >
                <Github className="max-[619px]:w-4 max-[619px]:h-4 min-[620px]:w-5 min-[620px]:h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/mohammed-aatef-saleh/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="max-[619px]:w-7 max-[619px]:h-7 min-[620px]:w-9 min-[620px]:h-9 rounded-full inline-flex items-center justify-center bg-[#0A66C2]/10 text-[#0A66C2] dark:bg-[#0A66C2]/20 dark:text-[#38BDF8] hover:bg-[#0A66C2]/20 dark:hover:bg-[#0A66C2]/35 transition-colors duration-200 shadow-2xs"
              >
                <Linkedin className="max-[619px]:w-4 max-[619px]:h-4 min-[620px]:w-5 min-[620px]:h-5" />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] min-[620px]:text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-[#6B7280]">
            <Link
              to="/methodology"
              className="hover:text-[#121212] dark:hover:text-[#D1D5DB] hover:underline transition-colors duration-150"
              id="footer-link-methodology"
            >
              Methodology
            </Link>
            <span>·</span>
            <Link
              to="/limitations"
              className="hover:text-[#121212] dark:hover:text-[#D1D5DB] hover:underline transition-colors duration-150"
              id="footer-link-limitations"
            >
              Limitations
            </Link>
          </div>
          <div className="max-[619px]:text-[11px] min-[620px]:text-xs max-[619px]:tracking-tight min-[620px]:tracking-normal text-gray-500 dark:text-[#6B7280] max-[619px]:leading-normal min-[620px]:leading-relaxed max-[619px]:px-1 min-[620px]:px-0">
            Converge MADM engine · Analytic Hierarchy Process (AHP) & TOPSIS multi-criteria normalization · Secure server-side Gemini extraction
          </div>
        </div>
      </footer>
    </div>
  );
}
