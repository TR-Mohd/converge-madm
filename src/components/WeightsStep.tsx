import React from "react";
import { Criterion, AHPResult } from "../types";
import { ArrowRight, BarChart3, ShieldCheck, Info } from "lucide-react";
import { motion } from "motion/react";

interface WeightsStepProps {
  criteria: Criterion[];
  ahpResult: AHPResult;
  onNext: () => void;
  onBack: () => void;
}

export default function WeightsStep({ criteria, ahpResult, onNext, onBack }: WeightsStepProps) {
  const { weights, cr, ci, lambdaMax } = ahpResult;

  // Pair criteria with their priority weights for sorting
  const weightedCriteria = criteria.map((crit, idx) => ({
    name: crit.name,
    type: crit.type,
    weight: weights[idx] ?? 0,
    index: idx,
  })).sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-8" id="weights-step-container">
      <div className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] rounded-none p-6 space-y-6" id="weights-visualizer-card">
        <div className="flex items-center gap-2" id="weights-header">
          <BarChart3 className="w-5 h-5 text-[#121212] dark:text-white" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">Logic Model (AHP Weights)</h3>
        </div>

        <p className="text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed font-serif italic">
          Based on your pairwise judgments, the Analytic Hierarchy Process (AHP) has calculated the relative importance of each factor. These weights will configure the TOPSIS evaluation in the next stage.
        </p>

        {/* Visual Priority Bars */}
        <div className="space-y-6" id="priority-bars-container">
          {weightedCriteria.map((item, idx) => {
            const percentage = (item.weight * 100).toFixed(1);
            return (
              <div key={idx} className="space-y-2" id={`priority-row-${idx}`}>
                <div className="flex justify-between text-xs uppercase tracking-wider text-[#121212] dark:text-[#F3F4F6] font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="font-serif italic text-sm text-gray-400 dark:text-[#9CA3AF]">
                      0{idx + 1}
                    </span>
                    {item.name}
                    <span className="font-mono text-[9px] font-normal text-gray-400 dark:text-[#4B5563] capitalize">
                      ({item.type})
                    </span>
                  </span>
                  <span className="font-mono">{percentage}%</span>
                </div>

                <div className="w-full bg-gray-100 dark:bg-[#2C323E] h-1.5 rounded-none overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.weight * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-[#121212] dark:bg-[#FBBF24] rounded-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AHP Engine Math Insights Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="math-insights-grid">
        <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-5 space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 dark:text-[#9CA3AF]">Consistency Ratio (CR)</p>
          <p className="text-2xl font-serif italic font-bold text-[#121212] dark:text-white">{(cr * 100).toFixed(1)}%</p>
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-emerald-800 dark:text-[#6EE7B7] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-none w-fit">
            <ShieldCheck className="w-3 h-3" /> Valid Index
          </div>
        </div>

        <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-5 space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 dark:text-[#9CA3AF]">Consistency Index (CI)</p>
          <p className="text-2xl font-serif italic font-bold text-[#121212] dark:text-white">{ci.toFixed(4)}</p>
          <p className="text-[9px] text-gray-400 dark:text-[#4B5563] uppercase tracking-wider">Variance Score</p>
        </div>

        <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-5 space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 dark:text-[#9CA3AF]">Principal Eigenvalue (λ)</p>
          <p className="text-2xl font-serif italic font-bold text-[#121212] dark:text-white">{lambdaMax.toFixed(3)}</p>
          <p className="text-[9px] text-gray-400 dark:text-[#4B5563] uppercase tracking-wider">Factors: n = {criteria.length}</p>
        </div>
      </div>

      {/* Info card describing weights translation */}
      <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border-l-4 border-[#121212] dark:border-[#F59E0B] rounded-none p-6 flex gap-4 text-xs text-gray-700 dark:text-[#F3F4F6] leading-relaxed" id="weights-info-card">
        <Info className="w-5 h-5 shrink-0 text-[#121212] dark:text-[#F59E0B] mt-0.5" />
        <p className="font-serif italic">
          The factor <strong className="text-[#121212] dark:text-white not-italic">{weightedCriteria[0]?.name}</strong> carries your highest priority of <strong className="text-[#121212] dark:text-[#FBBF24] not-italic">{(weightedCriteria[0]?.weight * 100).toFixed(1)}%</strong>.
          {weightedCriteria.length > 1 && (
            <span>
              {" "}This is <strong className="text-[#121212] dark:text-[#FBBF24] not-italic">{(weightedCriteria[0]?.weight / (weightedCriteria[weightedCriteria.length - 1]?.weight || 1)).toFixed(1)}x</strong> more important than your lowest-priority factor, <strong className="text-[#121212] dark:text-white not-italic">{weightedCriteria[weightedCriteria.length - 1]?.name}</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-[#262A33]" id="weights-navigation">
        <button
          onClick={onBack}
          className="px-5 py-3 text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-[#9CA3AF] hover:text-[#121212] dark:hover:text-white transition cursor-pointer"
          id="btn-weights-back"
        >
          ← Adjust Comparisons
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black text-[11px] uppercase tracking-widest font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          id="btn-weights-next"
        >
          Enter Performance Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
