import React, { useState, useEffect } from "react";
import StepProgressBar from "./components/StepProgressBar";
import NaturalLanguageStep from "./components/NaturalLanguageStep";
import AhpComparisonStep from "./components/AhpComparisonStep";
import WeightsStep from "./components/WeightsStep";
import DataGridStep from "./components/DataGridStep";
import ResultsStep from "./components/ResultsStep";
import { DecisionData, PairwiseComparison, AHPResult, TopsisResult } from "./types";
import { calculateTOPSIS } from "./utils/math";
import { BrainCircuit, RotateCcw, Sun, Moon } from "lucide-react";

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userPrompt, setUserPrompt] = useState<string>("");
  
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
  
  // Phase 1 State
  const [decisionData, setDecisionData] = useState<DecisionData | null>(null);

  // Phase 2 State
  const [comparisons, setComparisons] = useState<PairwiseComparison[] | null>(null);
  const [ahpResult, setAhpResult] = useState<AHPResult | null>(null);

  // Phase 4 State
  const [rawData, setRawData] = useState<string[][] | null>(null);

  // Phase 5 State
  const [rankings, setRankings] = useState<TopsisResult[] | null>(null);

  const totalSteps = 5;

  const handleStep1Submit = (extracted: DecisionData, prompt: string) => {
    setDecisionData(extracted);
    setUserPrompt(prompt);
    
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
      } catch (err) {
        // Re-throw so DataGridStep catches it, remains on Step 4, and highlights invalid cells
        throw err;
      }
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setUserPrompt("");
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
          />
        );
      case 2:
        return (
          <AhpComparisonStep
            criteria={decisionData?.criteria ?? []}
            onNext={handleStep2Submit}
            onBack={() => setCurrentStep(1)}
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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-body)] font-sans flex flex-col antialiased pb-12 transition-colors duration-200" id="app-root">
      {/* Premium Elegant Navigation Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] sticky top-0 z-50 py-5 px-8 transition-colors duration-200" id="app-header">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset} id="logo-block">
            <div className="w-10 h-10 rounded-sm bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-app)] shadow-sm">
              <BrainCircuit className="w-5.5 h-5.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif italic font-bold tracking-tight text-[var(--text-heading)]">Converge</span>
              <span className="hidden md:inline text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-muted)]">Decision Support Engine</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3" id="header-actions">
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--text-heading)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-none flex items-center justify-center transition cursor-pointer"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
              id="btn-toggle-theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {(decisionData || userPrompt) && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-[var(--text-heading)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-medium)] rounded-none flex items-center gap-1.5 transition cursor-pointer"
                id="btn-restart-app"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-8 flex-grow flex flex-col space-y-8" id="app-main">
        {/* Dynamic Goal Badge if active */}
        {decisionData?.decision_goal && currentStep > 1 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-none p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 animate-fade-in transition-colors duration-200" id="active-goal-banner">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] font-sans">Current Decision Target</span>
              <h2 className="text-xl font-serif italic font-semibold text-[var(--text-heading)] mt-1">{decisionData.decision_goal}</h2>
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-none self-start md:self-auto border border-[var(--border-subtle)]">
              {decisionData.alternatives.length} Options · {decisionData.criteria.length} Factors
            </span>
          </div>
        )}

        {/* Wizard Progress Bar */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-none p-5 shadow-2xs transition-colors duration-200" id="progress-bar-card">
          <StepProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        {/* Dynamic Wizard Step Canvas */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-none p-6 md:p-10 shadow-xs grow transition-colors duration-200" id="wizard-step-canvas">
          {renderStepContent()}
        </div>
      </main>

      {/* Technical Methodology Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-12 px-4" id="app-footer">
        Converge MADM Engine · Analytic Hierarchy Process (AHP) & TOPSIS Multi-Criteria Normalization · Secure Server-Side Gemini Extraction
      </footer>
    </div>
  );
}
