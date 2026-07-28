import React, { useState, useEffect, useRef } from "react";
import { Criterion, PairwiseComparison, AHPResult } from "../types";
import { getSaatyValue } from "../utils/math";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  ListFilter,
  Eye,
  Edit3,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileComparisonCarouselProps {
  criteria: Criterion[];
  comparisons: PairwiseComparison[];
  onSelect: (index: number, val: number) => void;
  inconsistencyInfo: {
    index: number;
    deviation: number;
    suggestedValue: number;
  }[];
  thresholdDeviation: number;
  ahpResult: AHPResult | null;
  onReset: () => void;
  onSmartAdjust: () => void;
  onSubmit: () => void;
  onBack: () => void;
  triedSubmit: boolean;
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

const AHP_BUTTONS = [
  { label: "9", value: -8, side: "A" as const, title: "Extremely favor A" },
  { label: "7", value: -6, side: "A" as const, title: "Very strongly favor A" },
  { label: "5", value: -4, side: "A" as const, title: "Strongly favor A" },
  { label: "3", value: -2, side: "A" as const, title: "Moderately favor A" },
  { label: "1", value: 0, side: "EQUAL" as const, subLabel: "Equal", title: "Equal importance" },
  { label: "3", value: 2, side: "B" as const, title: "Moderately favor B" },
  { label: "5", value: 4, side: "B" as const, title: "Strongly favor B" },
  { label: "7", value: 6, side: "B" as const, title: "Very strongly favor B" },
  { label: "9", value: 8, side: "B" as const, title: "Extremely favor B" },
];

export default function MobileComparisonCarousel({
  criteria,
  comparisons,
  onSelect,
  inconsistencyInfo,
  thresholdDeviation,
  ahpResult,
  onReset,
  onSmartAdjust,
  onSubmit,
  onBack,
  triedSubmit,
}: MobileComparisonCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "summary">("carousel");
  const [justSelectedValue, setJustSelectedValue] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  if (!comparisons || comparisons.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), comparisons.length - 1);
  const currentComp = comparisons[safeIndex];
  const critA = criteria[currentComp.criterionAIndex];
  const critB = criteria[currentComp.criterionBIndex];

  const sliderInconsistency = inconsistencyInfo.find((item) => item.index === safeIndex);
  const isMajorContradiction =
    sliderInconsistency &&
    sliderInconsistency.deviation > 1.0 &&
    sliderInconsistency.deviation >= thresholdDeviation;

  const handleButtonTap = (btnValue: number) => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    onSelect(safeIndex, btnValue);
    setJustSelectedValue(btnValue);
    setSlideDirection("right");

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setJustSelectedValue(null);
      if (safeIndex < comparisons.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setViewMode("summary");
      }
    }, 180);
  };

  const handlePrev = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setJustSelectedValue(null);
    if (safeIndex > 0) {
      setSlideDirection("left");
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setJustSelectedValue(null);
    if (safeIndex < comparisons.length - 1) {
      setSlideDirection("right");
      setCurrentIndex((prev) => prev + 1);
    } else {
      setViewMode("summary");
    }
  };

  const jumpToCard = (index: number) => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setJustSelectedValue(null);
    setSlideDirection(index > safeIndex ? "right" : "left");
    setCurrentIndex(index);
    setViewMode("carousel");
  };

  const getComparisonLabel = (val: number, nameA: string, nameB: string) => {
    const absVal = Math.abs(val);
    const label = SAATY_LABELS[absVal] || "More important";

    if (val < 0) {
      return (
        <span className="text-gray-700 dark:text-[#E5E7EB] text-xs">
          <strong className="text-[#121212] dark:text-[#FFB900] font-serif italic font-bold">
            {nameA}
          </strong>{" "}
          is{" "}
          <span className="text-[#121212] dark:text-white underline decoration-[#121212] dark:decoration-[#FE9A00] decoration-1 font-bold">
            {label.toLowerCase()}
          </span>{" "}
          than{" "}
          <strong className="text-[#121212] dark:text-[#FFB900] font-serif italic font-bold">
            {nameB}
          </strong>
          . (Scale: {getSaatyValue(val)})
        </span>
      );
    } else if (val > 0) {
      return (
        <span className="text-gray-700 dark:text-[#E5E7EB] text-xs">
          <strong className="text-[#121212] dark:text-[#FFB900] font-serif italic font-bold">
            {nameB}
          </strong>{" "}
          is{" "}
          <span className="text-[#121212] dark:text-white underline decoration-[#121212] dark:decoration-[#FE9A00] decoration-1 font-bold">
            {label.toLowerCase()}
          </span>{" "}
          than{" "}
          <strong className="text-[#121212] dark:text-[#FFB900] font-serif italic font-bold">
            {nameA}
          </strong>
          . (Scale: {getSaatyValue(val)})
        </span>
      );
    } else {
      return (
        <span className="text-gray-700 dark:text-[#E5E7EB] font-medium text-xs">
          Both are{" "}
          <span className="font-bold text-[#121212] dark:text-[#FFB900]">
            equally important
          </span>
          . (Scale: 1)
        </span>
      );
    }
  };

  return (
    <div className="block md:hidden space-y-6" id="mobile-ahp-carousel-container">
      {/* Top Bar / Progress Header */}
      <div className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">
              {viewMode === "carousel"
                ? `Comparison ${safeIndex + 1} of ${comparisons.length}`
                : "Comparison Review"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 dark:bg-[#1F232D] text-gray-600 dark:text-[#9CA3AF] rounded-none font-semibold">
              {Math.round(((safeIndex + 1) / comparisons.length) * 100)}%
            </span>
          </div>

          <button
            onClick={() =>
              setViewMode((prev) => (prev === "carousel" ? "summary" : "carousel"))
            }
            className="text-[11px] uppercase tracking-wider font-bold text-[#121212] dark:text-[#F59E0B] hover:opacity-80 transition flex items-center gap-1 cursor-pointer"
            id="btn-mobile-toggle-view"
          >
            {viewMode === "carousel" ? (
              <>
                <ListFilter className="w-3.5 h-3.5" /> Review ({comparisons.length})
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Carousel View
              </>
            )}
          </button>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-[#262A33] overflow-hidden">
          <motion.div
            className="h-full bg-[#121212] dark:bg-[#F59E0B]"
            initial={{ width: 0 }}
            animate={{
              width: `${((safeIndex + 1) / comparisons.length) * 100}%`,
            }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </div>

      {/* Main Content Area: Carousel Card vs Summary Review */}
      {viewMode === "carousel" ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={safeIndex}
            initial={{ opacity: 0, x: slideDirection === "right" ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === "right" ? -30 : 30 }}
            transition={{ duration: 0.18 }}
            className={`border bg-white dark:bg-[#15181E] p-5 space-y-6 ${
              isMajorContradiction
                ? "border-amber-400 dark:border-amber-500 bg-amber-50/10 dark:bg-amber-950/20"
                : "border-[#E5E1DA] dark:border-[#262A33]"
            }`}
            id={`mobile-comparison-card-${safeIndex}`}
          >
            {/* Prominent Criteria Comparison Cards ([ Criteria A ] vs [ Criteria B ]) */}
            <div className="grid grid-cols-11 gap-2 items-center">
              {/* Criterion A Box */}
              <div
                className={`col-span-5 p-3.5 border transition-all ${
                  currentComp.value < 0
                    ? "border-[#121212] dark:border-[#F59E0B] bg-[#FBF9F7] dark:bg-[#1A1E27] shadow-xs"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15181E]"
                }`}
              >
                <div className="space-y-1">
                  <span className="block text-[9px] font-mono text-gray-400 dark:text-[#9CA3AF] uppercase tracking-wider">
                    Criterion A • {critA.type}
                  </span>
                  <h4 className="text-sm font-bold text-[#121212] dark:text-white leading-tight">
                    {critA.name}
                  </h4>
                </div>
              </div>

              {/* VS Badge */}
              <div className="col-span-1 flex justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#6B7280]">
                  VS
                </span>
              </div>

              {/* Criterion B Box */}
              <div
                className={`col-span-5 p-3.5 border transition-all ${
                  currentComp.value > 0
                    ? "border-[#121212] dark:border-[#F59E0B] bg-[#FBF9F7] dark:bg-[#1A1E27] shadow-xs"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15181E]"
                }`}
              >
                <div className="space-y-1">
                  <span className="block text-[9px] font-mono text-gray-400 dark:text-[#9CA3AF] uppercase tracking-wider">
                    Criterion B • {critB.type}
                  </span>
                  <h4 className="text-sm font-bold text-[#121212] dark:text-white leading-tight">
                    {critB.name}
                  </h4>
                </div>
              </div>
            </div>

            {/* Current choice textual description */}
            <div className="text-center bg-[#F9F7F4] dark:bg-[#1A1E27] py-3 px-4 border border-gray-100 dark:border-gray-800">
              {getComparisonLabel(currentComp.value, critA.name, critB.name)}
            </div>

            {/* Direct Selection Scale (AHP numeric scale tap targets) */}
            <div className="space-y-3" id={`mobile-scale-container-${safeIndex}`}>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] px-1">
                <span>← Favor {critA.name}</span>
                <span className="text-gray-400">Equal</span>
                <span>Favor {critB.name} →</span>
              </div>

              {/* 9 tap target buttons */}
              <div className="grid grid-cols-9 gap-1.5">
                {AHP_BUTTONS.map((btn) => {
                  const isSelected = currentComp.value === btn.value;
                  const isJustSelected = justSelectedValue === btn.value;

                  return (
                    <button
                      key={`${btn.side}-${btn.label}-${btn.value}`}
                      type="button"
                      onClick={() => handleButtonTap(btn.value)}
                      className={`h-12 flex flex-col items-center justify-center border text-xs font-bold font-mono transition-all cursor-pointer relative select-none ${
                        isSelected
                          ? "bg-[#121212] dark:bg-[#F59E0B] text-white dark:text-black border-[#121212] dark:border-[#F59E0B] shadow-sm scale-105 z-10"
                          : "bg-white dark:bg-[#1A1E27] text-gray-700 dark:text-[#E5E7EB] border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      title={btn.title}
                    >
                      <span className="text-sm">{btn.label}</span>
                      {btn.subLabel && (
                        <span className="text-[7px] tracking-tighter uppercase font-sans -mt-0.5 opacity-80">
                          {btn.subLabel}
                        </span>
                      )}

                      {/* Confirmation Check Badge on Tap */}
                      {isJustSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contradiction Spotlight on Mobile */}
            {isMajorContradiction && sliderInconsistency && (
              <div
                className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2.5"
                id={`mobile-contradiction-${safeIndex}`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                    Contradiction Spotlight
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-serif italic">
                  This choice conflicts with your other judgements.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleButtonTap(sliderInconsistency.suggestedValue)
                  }
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-black text-[11px] uppercase tracking-wider font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Apply Suggested Balance (Scale:{" "}
                  {getSaatyValue(sliderInconsistency.suggestedValue)})
                </button>
              </div>
            )}

            {/* Card Navigation Controls (Previous / Next) */}
            <div
              className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-[#262A33]"
              id={`mobile-card-nav-${safeIndex}`}
            >
              <button
                type="button"
                onClick={handlePrev}
                disabled={safeIndex === 0}
                className={`px-4 py-2.5 text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 ${
                  safeIndex === 0
                    ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    : "text-gray-600 dark:text-[#E5E7EB] hover:text-[#121212] dark:hover:text-white cursor-pointer"
                }`}
                id="btn-mobile-prev"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black text-xs uppercase tracking-wider font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                id="btn-mobile-next"
              >
                {safeIndex === comparisons.length - 1 ? (
                  <>
                    Summary <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Summary / Review View */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#E5E1DA] dark:border-[#262A33] bg-white dark:bg-[#15181E] p-5 space-y-6"
          id="mobile-summary-container"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#121212] dark:text-white">
              All Comparisons Completed
            </h3>
            <p className="text-xs text-gray-600 dark:text-[#9CA3AF]">
              Review your pairwise judgements below. Tap any comparison to edit it.
            </p>
          </div>

          {/* Consistency Ratio Card */}
          {ahpResult && (
            <div
              className={`p-4 border ${
                ahpResult.isConsistent
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {ahpResult.isConsistent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        ahpResult.isConsistent
                          ? "text-emerald-900 dark:text-emerald-300"
                          : "text-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {ahpResult.isConsistent ? "Consistent" : "Inconsistent"} (CR ={" "}
                      {(ahpResult.cr * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    {ahpResult.isConsistent
                      ? "Your judgments are logically sound (CR < 10%)."
                      : "Your judgments exceed the 10% inconsistency limit. Use Smart Adjust to align automatically."}
                  </p>
                </div>

                {!ahpResult.isConsistent && (
                  <button
                    type="button"
                    onClick={onSmartAdjust}
                    className="shrink-0 px-3 py-2 text-[10px] uppercase tracking-wider font-bold bg-[#121212] text-white dark:bg-[#F59E0B] dark:text-black hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Smart Adjust
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of all comparisons with tap-to-edit */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {comparisons.map((comp, idx) => {
              const nameA = criteria[comp.criterionAIndex]?.name;
              const nameB = criteria[comp.criterionBIndex]?.name;
              const inconsistency = inconsistencyInfo.find((i) => i.index === idx);
              const isMajor =
                inconsistency &&
                inconsistency.deviation > 1.0 &&
                inconsistency.deviation >= thresholdDeviation;

              return (
                <div
                  key={idx}
                  onClick={() => jumpToCard(idx)}
                  className={`p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isMajor
                      ? "border-amber-400 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                      : "border-gray-200 dark:border-gray-800 hover:border-[#121212] dark:hover:border-[#F59E0B] bg-white dark:bg-[#1A1E27]"
                  }`}
                >
                  <div className="space-y-1 grow min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#121212] dark:text-white truncate">
                      <span className={comp.value < 0 ? "text-[#121212] dark:text-[#FBBF24]" : ""}>
                        {nameA}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">vs</span>
                      <span className={comp.value > 0 ? "text-[#121212] dark:text-[#FBBF24]" : ""}>
                        {nameB}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      {getComparisonLabel(comp.value, nameA, nameB)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 p-1.5 text-gray-400 hover:text-[#121212] dark:hover:text-white"
                    title="Edit comparison"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Actions in Summary */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#262A33] flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onSubmit}
              className="w-full py-3 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black font-bold text-xs uppercase tracking-widest shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              id="btn-mobile-submit"
            >
              Calculate Weights <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                className="w-1/2 py-2.5 text-xs uppercase tracking-wider font-bold text-gray-700 dark:text-[#E5E7EB] bg-gray-100 dark:bg-[#1F232D] hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                ← Back to Carousel
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-1/2 py-2.5 text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-[#9CA3AF] hover:text-[#121212] dark:hover:text-white transition cursor-pointer"
              >
                ← Back to Define
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
