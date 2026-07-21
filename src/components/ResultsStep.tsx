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

  return (
    <div className="space-y-8" id="results-step-container">
      {/* Winner Spotlight Banner */}
      <div className="relative bg-[#121212] rounded-none p-8 md:p-10 text-white shadow-none overflow-hidden" id="winner-spotlight">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4">
          <Trophy className="w-40 h-40" />
        </div>

        <div className="relative space-y-6 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 text-[10px] uppercase tracking-widest font-bold">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Optimal Selection
          </span>
          
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 tracking-widest uppercase font-mono">Ranked First</p>
            <h2 className="text-3xl md:text-4xl font-serif italic font-bold text-white tracking-tight">
              {winner?.alternative}
            </h2>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10 w-fit">
            <span className="text-[10px] uppercase tracking-wider text-gray-400">Relative Closeness (V_i):</span>
            <span className="font-mono text-sm font-bold text-amber-300">
              {((winner?.score ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      <div className="bg-white border border-[#E5E1DA] rounded-none p-6 md:p-8 space-y-6 shadow-none" id="ai-summary-card">
        <div className="flex items-center gap-2" id="ai-summary-header">
          <Sparkles className="w-5 h-5 text-[#121212]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Decision Rationale & Trade-offs</h3>
        </div>

        {loading ? (
          <div className="space-y-3 py-2 animate-pulse" id="ai-summary-loading-placeholder">
            <div className="h-3 bg-gray-100 rounded-none w-3/4" />
            <div className="h-3 bg-gray-100 rounded-none w-11/12" />
            <div className="h-3 bg-gray-100 rounded-none w-5/6" />
          </div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-none p-4 flex gap-3 text-amber-800 text-xs" id="ai-summary-error">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="markdown-body prose max-w-none text-xs leading-relaxed text-[#121212] font-serif italic space-y-3" id="ai-summary-markdown">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* TOPSIS Ranked List Card */}
      <div className="bg-white border border-[#E5E1DA] rounded-none p-6 md:p-8 space-y-6 shadow-none" id="topsis-rankings-card">
        <div className="flex items-center gap-2" id="topsis-header">
          <BarChart2 className="w-5 h-5 text-[#121212]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Ranking Matrix (TOPSIS Closeness)</h3>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
          TOPSIS indexes options by identifying their closeness to the mathematically ideal best outcome (positive ideal) while staying furthest from the absolute worst case (anti-ideal).
        </p>

        <div className="space-y-4" id="rankings-scores-list">
          {rankings.map((item, idx) => {
            const scorePercent = (item.score * 100).toFixed(1);
            const isFirst = idx === 0;

            return (
              <div
                key={idx}
                className={`p-5 border flex flex-col md:flex-row md:items-center justify-between gap-6 transition duration-200 rounded-none ${
                  isFirst
                    ? "border-[#121212] bg-[#FBF9F7]"
                    : "border-[#E5E1DA] bg-white"
                }`}
                id={`ranking-item-${idx}`}
              >
                {/* Alternative Name & Badge */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-none flex items-center justify-center font-bold text-xs ${
                      isFirst
                        ? "bg-[#121212] text-white border border-[#121212]"
                        : "bg-white text-gray-500 border border-[#E5E1DA]"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#121212]">{item.alternative}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">TOPSIS Index V_{idx + 1}</p>
                  </div>
                </div>

                {/* Score progress bar */}
                <div className="grow max-w-md space-y-1.5" id={`score-bar-wrapper-${idx}`}>
                  <div className="flex justify-between text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                    <span>Performance Proximity</span>
                    <span>{scorePercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-none overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score * 100}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className={`h-full rounded-none ${isFirst ? "bg-[#121212]" : "bg-gray-400"}`}
                    />
                  </div>
                </div>

                {/* score badge */}
                <div className="text-right shrink-0" id={`score-badge-${idx}`}>
                  <span className={`font-mono text-xs font-bold border p-1 px-2.5 bg-white text-[#121212] rounded-none ${
                    isFirst ? "border-[#121212]" : "border-[#E5E1DA]"
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
      <div className="bg-white border border-[#E5E1DA] rounded-none p-6 md:p-8 space-y-4 shadow-none" id="raw-data-review-card">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#121212]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Performance Matrix Reference</h3>
        </div>

        <div className="overflow-x-auto border border-[#E5E1DA] rounded-none" id="summary-table-container">
          <table className="w-full text-left text-xs border-collapse" id="performance-summary-table">
            <thead>
              <tr className="bg-[#FBF9F7] border-b border-[#E5E1DA]">
                <th className="p-3.5 text-[10px] uppercase tracking-wider font-bold text-[#121212]">Alternative</th>
                {criteria.map((crit, idx) => (
                  <th key={idx} className="p-3.5 border-l border-[#E5E1DA] text-[10px] uppercase tracking-wider font-bold text-[#121212]">
                    {crit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt, rIdx) => (
                <tr key={rIdx} className="border-b border-[#E5E1DA] last:border-0 hover:bg-gray-50/50">
                  <td className="p-3.5 font-bold text-[#121212] bg-[#FBF9F7]/20">{alt}</td>
                  {criteria.map((_, cIdx) => (
                    <td key={cIdx} className="p-3.5 border-l border-[#E5E1DA] text-gray-600 font-mono">
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
          className="px-8 py-3 bg-[#121212] hover:bg-neutral-800 text-white text-[11px] uppercase tracking-widest font-bold shadow-sm transition flex items-center gap-2 cursor-pointer rounded-none"
          id="btn-results-reset"
        >
          <RefreshCw className="w-4 h-4" /> Start New Evaluation
        </button>
      </div>
    </div>
  );
}
