import React, { useEffect, useState } from "react";
import { Criterion, TopsisResult } from "../types";
import { Award, RefreshCw, Trophy, Sparkles, AlertCircle, FileText, BarChart2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";

interface ResultsStepProps {
  decision_goal: string;
  alternatives: string[];
  criteria: Criterion[];
  weights: number[];
  rankings: TopsisResult[];
  rawData: string[][];
  user_prompt: string;
  onReset: () => void;
}

export default function ResultsStep({
  decision_goal,
  alternatives,
  criteria,
  weights,
  rankings,
  rawData,
  user_prompt,
  onReset,
}: ResultsStepProps) {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision_goal,
            alternatives,
            criteria,
            weights,
            rankings,
            user_prompt,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to load Gemini AI summary.");
        }

        const data = await response.json();
        setAiSummary(data.summary || "No explanation summary could be generated.");
      } catch (err: any) {
        console.error("Summary fetch error:", err);
        setError("Unable to retrieve AI analysis. You can still review the mathematical rankings below.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [decision_goal, alternatives, criteria, weights, rankings, user_prompt]);

  const winner = rankings[0];
  const winnerPercent = ((winner?.score ?? 0) * 100).toFixed(1);

  return (
    <div className="space-y-8" id="results-step-container">
      {/* Winner Hero Card */}
      <div className="bg-[#121212] dark:bg-[#15181E] text-white border border-[#121212] dark:border-[#2C323E] rounded-none p-8 relative overflow-hidden shadow-sm" id="winner-hero-card">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Trophy className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-[#F59E0B] text-[10px] uppercase tracking-widest font-bold font-mono">
            <Award className="w-4 h-4 text-[#F59E0B]" /> Optimal Selection
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-[#9CA3AF] font-mono">Ranked First</span>
            <h2 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-white mt-1">{winner?.alternative}</h2>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <span className="text-xs uppercase tracking-wider font-mono text-gray-400 dark:text-[#9CA3AF]">Relative Closeness (C_1):</span>
            <span className="text-xl font-mono font-bold text-[#FBBF24]">{winnerPercent}%</span>
          </div>
        </div>
      </div>

      {/* AI Decision Rationale Card */}
      <div className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] rounded-none p-6 md:p-8 space-y-4 shadow-none" id="ai-summary-card">
        <div className="flex items-center gap-2" id="ai-summary-header">
          <Sparkles className="w-5 h-5 text-[#121212] dark:text-[#F59E0B]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">Decision Rationale & Trade-offs</h3>
        </div>

        {loading ? (
          <div className="space-y-3 py-2 animate-pulse" id="ai-summary-loading-placeholder">
            <div className="h-3 bg-gray-100 dark:bg-[#2C323E] rounded-none w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-[#2C323E] rounded-none w-11/12" />
            <div className="h-3 bg-gray-100 dark:bg-[#2C323E] rounded-none w-5/6" />
          </div>
        ) : error ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-none p-4 flex gap-3 text-amber-800 dark:text-[#FBBF24] text-xs" id="ai-summary-error">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="markdown-body prose max-w-none text-xs leading-relaxed text-[#121212] dark:text-[#F3F4F6] font-serif italic space-y-3" id="ai-summary-markdown">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* TOPSIS Ranked List Card */}
      <div className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] rounded-none p-6 md:p-8 space-y-6 shadow-none" id="topsis-rankings-card">
        <div className="flex items-center gap-2" id="topsis-header">
          <BarChart2 className="w-5 h-5 text-[#121212] dark:text-[#F59E0B]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">Ranking Matrix (TOPSIS Closeness)</h3>
        </div>

        <p className="text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed font-serif italic">
          TOPSIS indexes options by identifying their closeness to the mathematically ideal best outcome (positive ideal) while staying furthest from the absolute worst case (anti-ideal).
        </p>

        <div className="space-y-4" id="rankings-scores-list">
          {rankings.map((item, idx) => {
            const scorePercent = (item.score * 100).toFixed(1);
            const isFirst = idx === 0;

            return (
              <div
                key={idx}
                className={`p-5 border flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-none ${
                  isFirst
                    ? "border-[#121212] dark:border-[#F59E0B] bg-[#FBF9F7] dark:bg-[#1A1E27]"
                    : "border-[#E5E1DA] dark:border-[#262A33] bg-white dark:bg-[#15181E]"
                }`}
                id={`ranking-item-${idx}`}
              >
                {/* Alternative Name & Badge */}
                <div className="flex items-center gap-4 md:w-64 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
                      isFirst
                        ? "bg-[#121212] text-white border border-[#121212] dark:bg-[#F59E0B] dark:text-black dark:border-[#F59E0B]"
                        : "bg-white text-gray-500 border border-[#E5E1DA] dark:bg-[#121419] dark:text-[#9CA3AF] dark:border-[#2C323E]"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#121212] dark:text-white truncate">{item.alternative}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-[#4B5563] font-mono mt-0.5">TOPSIS Index V_{idx + 1}</p>
                  </div>
                </div>

                {/* Score progress bar */}
                <div className="grow space-y-1.5" id={`score-bar-wrapper-${idx}`}>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] font-bold">
                    <span>Performance Proximity</span>
                    <span className="font-mono text-[#121212] dark:text-[#FBBF24]">{scorePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-[#2C323E] border border-gray-200/60 dark:border-[#2C323E] rounded-none overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score * 100}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className={`h-full rounded-none ${isFirst ? "bg-[#121212] dark:bg-[#F59E0B]" : "bg-gray-500 dark:bg-[#4B5563]"}`}
                    />
                  </div>
                </div>

                {/* score badge */}
                <div className="text-right shrink-0 md:w-28" id={`score-badge-${idx}`}>
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-[#9CA3AF] font-bold mb-1">Closeness C_i</div>
                  <span className={`font-mono text-xs font-bold border py-1 px-3 inline-block bg-white dark:bg-[#121419] text-[#121212] dark:text-[#FBBF24] rounded-none ${
                    isFirst ? "border-[#121212] dark:border-[#F59E0B] shadow-sm" : "border-[#E5E1DA] dark:border-[#2C323E]"
                  }`}>
                    {item.score.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw performance overview card */}
      <div className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#262A33] rounded-none p-6 md:p-8 space-y-4 shadow-none" id="raw-data-review-card">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#121212] dark:text-[#F59E0B]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212] dark:text-white">Performance Matrix Reference</h3>
        </div>

        <div className="overflow-x-auto border border-[#E5E1DA] dark:border-[#262A33] rounded-none" id="summary-table-container">
          <table className="w-full text-left text-xs border-collapse" id="performance-summary-table">
            <thead>
              <tr className="bg-[#FBF9F7] dark:bg-[#1A1E27] border-b border-[#E5E1DA] dark:border-[#2C323E]">
                <th className="p-3.5 text-[10px] uppercase tracking-wider font-bold text-[#121212] dark:text-white">Alternative</th>
                {criteria.map((crit, idx) => (
                  <th key={idx} className="p-3.5 border-l border-[#E5E1DA] dark:border-[#2C323E] text-[10px] uppercase tracking-wider font-bold text-[#121212] dark:text-white">
                    {crit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt, rIdx) => (
                <tr key={rIdx} className="border-b border-[#E5E1DA] dark:border-[#2C323E] last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1C2028]/50">
                  <td className="p-3.5 font-bold text-[#121212] dark:text-white bg-[#FBF9F7]/20 dark:bg-[#1A1E27]/20">{alt}</td>
                  {criteria.map((_, cIdx) => (
                    <td key={cIdx} className="p-3.5 border-l border-[#E5E1DA] dark:border-[#2C323E] text-gray-600 dark:text-[#F3F4F6] font-mono">
                      {rawData[rIdx]?.[cIdx] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-center pt-4" id="results-navigation">
        <button
          onClick={onReset}
          className="max-[639px]:w-full min-[640px]:w-auto px-8 py-3 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black font-bold text-[11px] uppercase tracking-widest shadow-sm transition flex items-center justify-center gap-2 cursor-pointer rounded-none"
          id="btn-results-reset"
        >
          <RefreshCw className="w-4 h-4 shrink-0" /> Start New Evaluation
        </button>
      </div>
    </div>
  );
}
