import React from "react";
import { WizardSession } from "../hooks/useSessionPersistence";
import { History, Play, RotateCcw, Clock, Target } from "lucide-react";

interface ResumeSessionBannerProps {
  session: WizardSession;
  onResume: () => void;
  onDiscard: () => void;
}

const stepNames: Record<number, string> = {
  1: "Decision Target & Criteria",
  2: "Pairwise Comparison (AHP)",
  3: "Criteria Weighting Review",
  4: "Performance Data Matrix",
  5: "Final Decision & TOPSIS Ranking",
};

export default function ResumeSessionBanner({
  session,
  onResume,
  onDiscard,
}: ResumeSessionBannerProps) {
  const formattedDate = React.useMemo(() => {
    try {
      if (!session.savedAt) return null;
      const date = new Date(session.savedAt);
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return null;
    }
  }, [session.savedAt]);

  const goalText =
    session.decisionData?.decision_goal || session.userPrompt || "In-Progress Evaluation";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      id="resume-session-modal-overlay"
    >
      <div
        className="bg-white dark:bg-[#15181E] border border-[#121212] dark:border-[#2C323E] rounded-none max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-6"
        id="resume-session-modal-card"
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#121212] dark:text-[#F59E0B] text-[10px] uppercase tracking-widest font-bold font-mono">
            <History className="w-4 h-4 text-[#121212] dark:text-[#F59E0B]" />
            Saved Session Detected
          </div>
          <h2 className="text-2xl font-serif italic font-bold tracking-tight text-[#121212] dark:text-white">
            Resume your previous session?
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed font-sans">
            We found an unfinished evaluation in your browser storage. You can restore your progress or discard it to start fresh.
          </p>
        </div>

        {/* Session Snapshot Summary Card */}
        <div className="bg-[#FBF9F7] dark:bg-[#1A1E27] border border-[#E5E1DA] dark:border-[#262A33] p-4 rounded-none space-y-3">
          <div className="flex items-start gap-2.5">
            <Target className="w-4 h-4 text-gray-500 dark:text-[#9CA3AF] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="block text-[9px] uppercase tracking-widest text-gray-400 dark:text-[#6B7280] font-mono font-bold">
                Decision Goal
              </span>
              <p className="text-xs font-serif italic font-semibold text-[#121212] dark:text-white truncate">
                {goalText}
              </p>
            </div>
          </div>

          <div className="border-t border-[#E5E1DA] dark:border-[#2C323E] pt-2.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#D1D5DB]">
              <span className="font-bold text-[#121212] dark:text-[#FBBF24]">
                Step {session.currentStep} of 5
              </span>
              <span className="text-gray-400 dark:text-[#6B7280]">·</span>
              <span className="text-[11px] text-gray-500 dark:text-[#9CA3AF]">
                {stepNames[session.currentStep] || `Step ${session.currentStep}`}
              </span>
            </div>
          </div>

          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-[#6B7280] font-mono">
              <Clock className="w-3 h-3" />
              <span>Last saved: {formattedDate}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2" id="resume-modal-actions">
          <button
            onClick={onResume}
            className="flex-1 px-5 py-3.5 bg-[#121212] hover:bg-neutral-800 text-white dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] dark:text-black font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 rounded-none cursor-pointer shadow-sm"
            id="btn-resume-session"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Resume
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-5 py-3.5 bg-white text-[#121212] border border-[#E5E1DA] dark:bg-[#1E222A] dark:text-gray-300 dark:border-[#2C323E] hover:bg-gray-100 dark:hover:bg-[#262A33] font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 rounded-none cursor-pointer"
            id="btn-discard-session"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
