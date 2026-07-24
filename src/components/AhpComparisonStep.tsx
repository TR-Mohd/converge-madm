import React, { useState, useEffect } from "react";
import { Criterion, PairwiseComparison, AHPResult } from "../types";
import { calculateAHP, getSaatyValue, analyzeComparisonsInconsistency, smartAdjustComparisons } from "../utils/math";
import { AlertTriangle, CheckCircle2, RefreshCw, ArrowRight, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface AhpComparisonStepProps {
  criteria: Criterion[];
  onNext: (ahpResult: AHPResult, comparisons: PairwiseComparison[]) => void;
  onBack: () => void;
  initialComparisons: PairwiseComparison[] | null;
}

const SAATY_LABELS: Record<number, string> = {
  0: "Both are equally important",
  1: "Slightly more important",
  2: "Moderately more important",
  3: "Moderately to strongly more important",
  4: "Strongly more important",
  5: "Strongly to very strongly more important",
  6: "Very strongly more important",
  7: "Very strongly to extremely more important",
  8: "Extremely more important",
};

export default function AhpComparisonStep({
  criteria,
  onNext,
  onBack,
  initialComparisons,
}: AhpComparisonStepProps) {
  const [comparisons, setComparisons] = useState<PairwiseComparison[]>([]);
  const [ahpResult, setAhpResult] = useState<AHPResult | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Initialize comparisons list if not already done
  useEffect(() => {
    if (initialComparisons && initialComparisons.length === (criteria.length * (criteria.length - 1)) / 2) {
      setComparisons(initialComparisons);
    } else {
      const list: PairwiseComparison[] = [];
      const n = criteria.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          list.push({
            criterionAIndex: i,
            criterionBIndex: j,
            value: 0, // Equal importance by default
          });
        }
      }
      setComparisons(list);
    }
  }, [criteria, initialComparisons]);

  const handleSliderChange = (index: number, val: number) => {
    const updated = [...comparisons];
    updated[index] = { ...updated[index], value: val };
    setComparisons(updated);
    setTriedSubmit(false); // Clear the submitted state & spotlight highlights while actively sliding
    
    // Automatically recalculate AHP in background to show real-time feedback!
    const result = calculateAHP(criteria.length, updated);
    setAhpResult(result);
  };

  // Run initial calculations
  useEffect(() => {
    if (comparisons.length > 0) {
      const result = calculateAHP(criteria.length, comparisons);
      setAhpResult(result);
    }
  }, [comparisons, criteria.length]);

  const handleReset = () => {
    const reset = comparisons.map((c) => ({ ...c, value: 0 }));
    setComparisons(reset);
    setTriedSubmit(false);
  };

  const handleSmartAdjust = () => {
    const adjusted = smartAdjustComparisons(criteria.length, comparisons);
    setComparisons(adjusted);
    const result = calculateAHP(criteria.length, adjusted);
    setAhpResult(result);
  };

  const handleSubmit = () => {
    setTriedSubmit(true);
    const result = calculateAHP(criteria.length, comparisons);
    setAhpResult(result);

    if (result.isConsistent) {
      onNext(result, comparisons);
    } else {
      // Scroll to top or highlight error
      document.getElementById("ahp-error-banner")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getComparisonLabel = (val: number, critA: string, critB: string) => {
    const absVal = Math.abs(val);
    const label = SAATY_LABELS[absVal] || "More important";
    
    if (val < 0) {
      return (
        <span>
          <strong className="text-[#121212] font-serif italic font-bold">{critA}</strong> is{" "}
          <span className="text-[#121212] underline decoration-[#121212] decoration-1 font-medium">{label.toLowerCase()}</span> than{" "}
          <strong className="text-gray-500">{critB}</strong>. (Scale: {getSaatyValue(val)})
        </span>
      );
    } else if (val > 0) {
      return (
        <span>
          <strong className="text-[#121212] font-serif italic font-bold">{critB}</strong> is{" "}
          <span className="text-[#121212] underline decoration-[#121212] decoration-1 font-medium">{label.toLowerCase()}</span> than{" "}
          <strong className="text-gray-500">{critA}</strong>. (Scale: {getSaatyValue(val)})
        </span>
      );
    } else {
      return (
        <span className="text-gray-500 font-medium">
          Both are <span className="font-bold text-[#121212] underline decoration-gray-300">equally important</span>. (Scale: 1)
        </span>
      );
    }
  };

  // Analyze inconsistency indicators if current ratio is high and user clicked calculate
  const inconsistencyInfo = (ahpResult && !ahpResult.isConsistent && triedSubmit)
    ? analyzeComparisonsInconsistency(criteria.length, comparisons)
    : [];

  const maxDeviation = inconsistencyInfo.length > 0
    ? Math.max(...inconsistencyInfo.map((item) => item.deviation))
    : 0;

  // Highlight any comparison with a significant share of contradiction (at least 70% of max deviation and > 1.0)
  const thresholdDeviation = Math.max(1.0, maxDeviation * 0.7);

  return (
    <div className="space-y-8" id="ahp-step-container">
      <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border-l-4 border-[#121212] dark:border-[#F59E0B] rounded-none p-6 flex gap-4 items-start" id="ahp-intro-card">
        <HelpCircle className="w-5 h-5 text-[#121212] dark:text-[#F59E0B] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">Pairwise Criteria Comparison</h3>
          <p className="text-xs text-gray-600 dark:text-[#F3F4F6] leading-relaxed font-serif italic">
            AHP compares every factor to every other factor one-on-one. Slide towards the factor that is more important to your decision. The further you drag, the stronger your logical preference.
          </p>
        </div>
      </div>

      {/* Logic Gate Banner for Consistency Ratio (CR) */}
      {ahpResult && triedSubmit && !ahpResult.isConsistent && (
        <div
          id="ahp-error-banner"
          className="bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 rounded-none p-6 flex flex-col md:flex-row gap-6 items-start justify-between"
        >
          <div className="flex gap-4 items-start grow">
            <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-2 grow">
              <h4 className="font-bold text-rose-900 dark:text-[#FDA4AF] text-xs uppercase tracking-wider">Comparisons are inconsistent (CR = {(ahpResult.cr * 100).toFixed(1)}%)</h4>
              <p className="text-xs text-rose-800 dark:text-[#FDA4AF] leading-relaxed">
                Your pairwise choices are contradictory (for example, you rated A &gt; B, B &gt; C, but also C &gt; A). AHP requires a Consistency Ratio of <strong>less than 10% (0.10)</strong> to proceed.
              </p>
              <p className="text-xs font-semibold text-rose-950 dark:text-white font-serif italic">
                You can manually adjust the highlighted sliders below, or click <strong className="font-sans not-italic uppercase tracking-wider text-[10px]">Smart Adjust</strong> to mathematically balance them with minimal changes.
              </p>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={handleSmartAdjust}
              className="grow md:grow-0 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold text-white dark:text-black bg-[#121212] hover:bg-neutral-800 dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] rounded-none transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              id="btn-ahp-smart-adjust"
            >
              <RefreshCw className="w-3 h-3" /> Smart Adjust
            </button>
            <button
              onClick={handleReset}
              className="grow md:grow-0 px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-rose-900 dark:text-[#FDA4AF] bg-white dark:bg-[#15181E] border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-none transition cursor-pointer"
              id="btn-ahp-reset"
            >
              Reset All
            </button>
          </div>
        </div>
      )}

      {/* Real-time CR indicator */}
      {ahpResult && (
        <div className="flex justify-between items-center bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] rounded-none p-4 px-5 shadow-2xs" id="cr-badge-indicator">
          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-[#9CA3AF]">Live Consistency Status:</span>
          {ahpResult.isConsistent ? (
            <span className="text-xs font-semibold text-emerald-800 dark:text-[#6EE7B7] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Consistent (CR = {(ahpResult.cr * 100).toFixed(1)}%)
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-800 dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Adjust Sliders (CR = {(ahpResult.cr * 100).toFixed(1)}%)
            </span>
          )}
        </div>
      )}

      {/* Comparison Sliders List */}
      <div className="space-y-6" id="comparisons-list-container">
        {comparisons.map((comp, idx) => {
          const critA = criteria[comp.criterionAIndex];
          const critB = criteria[comp.criterionBIndex];
          const isSelectedA = comp.value < 0;
          const isSelectedB = comp.value > 0;

          const sliderInconsistency = inconsistencyInfo.find((item) => item.index === idx);
          const isMajorContradiction = sliderInconsistency && sliderInconsistency.deviation > 1.0 && sliderInconsistency.deviation >= thresholdDeviation;

          return (
            <div
              key={idx}
              className={`border p-6 transition-all duration-200 rounded-none ${
                isMajorContradiction
                  ? "border-amber-400 dark:border-amber-500 bg-amber-50/10 dark:bg-amber-950/20 shadow-sm"
                  : isSelectedA || isSelectedB
                  ? "border-[#121212] dark:border-[#F59E0B] bg-[#FBF9F7] dark:bg-[#1A1E27]"
                  : "border-[#E5E1DA] dark:border-[#262A33] bg-white dark:bg-[#15181E]"
              }`}
              id={`comparison-card-${idx}`}
            >
              {/* Slider Header showing current choice description */}
              <div className="text-center pb-5 text-xs font-medium text-gray-700 dark:text-[#F3F4F6]" id={`comp-label-${idx}`}>
                {getComparisonLabel(comp.value, critA.name, critB.name)}
              </div>

              {/* Slider Track and Labels */}
              <div className="grid grid-cols-12 gap-4 items-center" id={`slider-grid-${idx}`}>
                {/* Criterion A Name */}
                <div
                  className={`col-span-3 text-right text-xs font-bold px-2 transition-all uppercase tracking-wider ${
                    isSelectedA ? "text-[#121212] dark:text-[#FBBF24]" : "text-gray-400 dark:text-[#9CA3AF]"
                  }`}
                >
                  {critA.name}
                  <span className="block font-mono text-[9px] font-normal text-gray-400 dark:text-[#4B5563] capitalize mt-0.5">
                    {critA.type}
                  </span>
                </div>

                {/* Slider Input */}
                <div className="col-span-6 px-1 relative" id={`slider-input-wrapper-${idx}`}>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="1"
                    value={comp.value}
                    onChange={(e) => handleSliderChange(idx, parseInt(e.target.value))}
                    className="w-full h-[2px] bg-gray-200 dark:bg-[#2C323E] appearance-none cursor-pointer accent-[#121212] dark:accent-[#F59E0B] focus:outline-none"
                    id={`slider-input-field-${idx}`}
                  />
                  {/* Slider notches for Saaty scale (1 to 9, left and right) */}
                  <div className="flex justify-between text-[9px] font-mono text-gray-400 dark:text-[#9CA3AF] px-1 pt-2 select-none">
                    <span>9</span>
                    <span>7</span>
                    <span>5</span>
                    <span>3</span>
                    <span className="font-bold text-[#121212] dark:text-[#FBBF24]">1</span>
                    <span>3</span>
                    <span>5</span>
                    <span>7</span>
                    <span>9</span>
                  </div>
                </div>

                {/* Criterion B Name */}
                <div
                  className={`col-span-3 text-left text-xs font-bold px-2 transition-all uppercase tracking-wider ${
                    isSelectedB ? "text-[#121212] dark:text-[#FBBF24]" : "text-gray-400 dark:text-[#9CA3AF]"
                  }`}
                >
                  {critB.name}
                  <span className="block font-mono text-[9px] font-normal text-gray-400 dark:text-[#4B5563] capitalize mt-0.5">
                    {critB.type}
                  </span>
                </div>
              </div>

              {isMajorContradiction && sliderInconsistency && (
                <div className="mt-5 pt-4 border-t border-amber-200/60 dark:border-amber-900/60 flex gap-2.5 items-start" id={`contradiction-msg-${idx}`}>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                      Contradiction Spotlight
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-serif italic">
                      This comparison conflicts with your other judgements. To restore mathematical balance, try sliding towards:{" "}
                      <span className="font-sans not-italic font-bold text-[#121212] dark:text-white underline decoration-amber-300">
                        {getComparisonLabel(sliderInconsistency.suggestedValue, critA.name, critB.name)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-[#262A33]" id="ahp-navigation">
        <button
          onClick={onBack}
          className="px-5 py-3 text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-[#9CA3AF] hover:text-[#121212] dark:hover:text-white transition cursor-pointer"
          id="btn-ahp-back"
        >
          ← Back to Define
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black font-bold text-[11px] uppercase tracking-widest shadow-sm transition flex items-center gap-2 cursor-pointer"
          id="btn-ahp-submit"
        >
          Calculate Weights <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
