import React from "react";

interface Step {
  number: number;
  label: string;
}

interface StepProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const steps: Step[] = [
  { number: 1, label: "Define & Extract" },
  { number: 2, label: "AHP Comparisons" },
  { number: 3, label: "Weights Chart" },
  { number: 4, label: "Raw Performance" },
  { number: 5, label: "Final Decision" },
];

export default function StepProgressBar({ currentStep, totalSteps }: StepProgressBarProps) {
  return (
    <div className="w-full py-2 px-1" id="step-progress-bar-container">
      {/* Mobile view */}
      <div className="md:hidden text-center" id="mobile-step-indicator">
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-sm font-bold text-[#121212] mt-1 font-serif italic">
          {steps[currentStep - 1]?.label}
        </p>
        <div className="w-full bg-gray-200 h-[2px] mt-3 overflow-hidden">
          <div
            className="bg-[#121212] h-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between relative" id="desktop-step-indicator">
        {/* Line behind steps */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-gray-200 -z-10" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-[#121212] -z-10 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div
              key={step.number}
              className="flex flex-col items-center bg-white px-5 z-10"
              id={`step-marker-${step.number}`}
            >
              <div
                className={`w-9 h-9 rounded-none flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#121212] border-[#121212] text-white"
                    : isActive
                    ? "bg-white border-[#121212] text-[#121212] font-semibold shadow-xs"
                    : "bg-white border-gray-200 text-gray-300"
                }`}
              >
                {isCompleted ? "✓" : `0${step.number}`}
              </div>
              <span
                className={`text-[10px] uppercase tracking-widest mt-2.5 transition-all duration-300 font-bold ${
                  isActive ? "text-[#121212]" : isCompleted ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
