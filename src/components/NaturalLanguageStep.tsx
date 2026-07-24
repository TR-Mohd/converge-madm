import React, { useState } from "react";
import { DecisionData, Criterion } from "../types";
import { Wand2, Sparkles, Plus, Trash2, ArrowRight, AlertCircle, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface NaturalLanguageStepProps {
  onNext: (data: DecisionData, userPrompt: string) => void;
  initialData: DecisionData | null;
  initialUserPrompt: string;
}

const PRESET_EXAMPLES = [
  {
    title: "Choosing a Programming Laptop",
    text: "I need a new laptop for software development. I'm choosing between a MacBook Pro 14, a Dell XPS 15, and a Lenovo ThinkPad X1. I care about high performance/RAM, long battery life, premium build quality, and keeping the price reasonable."
  },
  {
    title: "Selecting a New Apartment",
    text: "I'm looking to rent a new apartment. I have three options: Downtown Loft, Suburban Townhouse, and Riverside Condo. My main criteria are cheap monthly rent, short commute time to work, high neighborhood safety, and proximity to grocery stores."
  },
  {
    title: "Evaluating Job Offers",
    text: "I have job offers from Tech Corp, Finance Hub, and Green Startup. I want to compare them based on base salary, annual stock options, remote work flexibility, and career growth potential."
  }
];

export default function NaturalLanguageStep({ onNext, initialData, initialUserPrompt }: NaturalLanguageStepProps) {
  const [description, setDescription] = useState(initialUserPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Extracted but uncommitted state
  const [extractedData, setExtractedData] = useState<DecisionData | null>(initialData);
  const [goal, setGoal] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  const handlePresetClick = (text: string) => {
    setDescription(text);
    setError(null);
  };

  const handleExtract = async () => {
    const trimmed = description.trim();
    
    // Check if the prompt is a simple greeting, chitchat question, or lacks real decision context
    const chitchatRegex = /^(hi+|hello|hey+|greetings|good\s*(morning|afternoon|evening|day)|test|demo|howdy|what'?s?\s*up|yo|help|yes|no|how\s+are\s+you|who\s+are\s+you|what\s+is|tell\s+me)\b/i;
    if (!trimmed || trimmed.length < 15 || chitchatRegex.test(trimmed)) {
      setError("Please describe a real decision problem you are evaluating (e.g., 'Choosing between iPhone 16, Samsung S24, and Pixel 9 based on price, battery life, and camera quality'). General chatter or short questions do not contain options or evaluation factors.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to extract decision elements.");
      }

      const data: DecisionData = await response.json();
      const sanitizedCriteria = (data.criteria || []).map(c => {
        let u = (c.unit && c.unit.trim()) ? c.unit.trim() : "pts (1-10)";
        const uLower = u.toLowerCase();
        if (uLower === "points" || uLower === "pts" || uLower === "score") {
          u = "pts (1-10)";
        }
        return { ...c, unit: u };
      });
      setExtractedData({ ...data, criteria: sanitizedCriteria });
      setGoal(data.decision_goal);
      setAlternatives(data.alternatives);
      setCriteria(sanitizedCriteria);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlternative = () => {
    if (alternatives.length >= 6) {
      setError("You can have a maximum of 6 alternatives.");
      return;
    }
    setAlternatives([...alternatives, `Alternative ${alternatives.length + 1}`]);
    setError(null);
  };

  const handleRemoveAlternative = (index: number) => {
    if (alternatives.length <= 1) {
      setError("You must have at least 1 alternative.");
      return;
    }
    const updated = alternatives.filter((_, idx) => idx !== index);
    setAlternatives(updated);
  };

  const handleAlternativeChange = (index: number, val: string) => {
    const updated = [...alternatives];
    updated[index] = val;
    setAlternatives(updated);
  };

  const handleAddCriterion = () => {
    if (criteria.length >= 10) {
      setError("You can have a maximum of 10 factors/criteria.");
      return;
    }
    setCriteria([...criteria, { name: `Criterion ${criteria.length + 1}`, type: "benefit", unit: "pts (1-10)" }]);
    setError(null);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 2) {
      setError("At least 2 criteria are required for AHP Multi-Attribute decision making.");
      return;
    }
    const updated = criteria.filter((_, idx) => idx !== index);
    setCriteria(updated);
  };

  const handleCriterionChange = (index: number, field: keyof Criterion, val: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: val };
    setCriteria(updated);
  };

  const handleSubmit = () => {
    // Validation
    const cleanedGoal = goal.trim() || "My Decision Goal";
    const cleanedAlts = alternatives.map(a => a.trim()).filter(Boolean);
    const cleanedCrit = criteria.map(c => ({ name: c.name.trim(), type: c.type, unit: (c.unit || "points").trim() })).filter(c => c.name);

    if (cleanedAlts.length < 1) {
      setError("Please specify at least 1 option/alternative to compare.");
      return;
    }

    if (cleanedCrit.length < 2) {
      setError("At least 2 criteria are required for decision making.");
      return;
    }

    if (cleanedAlts.length > 6) {
      setError("A maximum of 6 alternatives is supported.");
      return;
    }

    onNext({
      decision_goal: cleanedGoal,
      alternatives: cleanedAlts,
      criteria: cleanedCrit
    }, description);
  };

  return (
    <div className="space-y-8" id="nl-step-container">
      {/* Description Inputs Section */}
      {!extractedData ? (
        <div className="space-y-8" id="input-prompt-section">
          <div className="bg-[#FBF9F7] border border-[#E5E1DA] rounded-none p-6" id="presets-card">
            <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1.5 mb-4">
              <Sparkles className="w-4 h-4 text-[#121212]" /> Presets & Quick Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="preset-buttons-grid">
              {PRESET_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(ex.text)}
                  className="text-left p-4 bg-white hover:bg-[#FBF9F7] border border-[#E5E1DA] hover:border-[#121212] rounded-none transition duration-200 flex flex-col justify-between group cursor-pointer"
                  id={`preset-${idx}`}
                >
                  <span className="font-bold text-xs text-[#121212] group-hover:underline mb-2 block">
                    {ex.title}
                  </span>
                  <span className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {ex.text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3" id="textarea-section">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-400" htmlFor="decision-description">
              Describe your decision in plain English
            </label>
            <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
              Detail what you are choosing between, what factors are important to you, and any constraints you might have.
            </p>
            <div className="relative">
              <textarea
                id="decision-description"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="I need to choose a laptop. I am comparing Apple MacBook, Dell XPS, and Lenovo ThinkPad. I care about battery life, RAM, weight, and low price..."
                className="w-full rounded-none border border-[#E5E1DA] p-4 focus:border-[#121212] focus:ring-0 text-sm placeholder-gray-400 bg-white font-serif italic resize-none min-h-[140px]"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 rounded-none p-4 flex gap-3 text-rose-700 text-xs" id="nl-error">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex justify-end" id="extraction-button-container">
            <button
              onClick={handleExtract}
              disabled={loading}
              className={`px-8 py-4 rounded-none font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2 shadow-sm transition duration-200 cursor-pointer ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#121212] hover:bg-neutral-800"
              }`}
              id="btn-extract"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing text...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Extract Decision Elements
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Editable extracted data step */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
          id="editable-extracted-section"
        >
          <div className="bg-[#FBF9F7] border-l-4 border-[#121212] rounded-none p-6 flex gap-4 items-start" id="nlp-success-banner">
            <Sparkles className="w-5 h-5 text-[#121212] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#121212]">Gemini AI Extraction Complete</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-serif italic">
                The decision matrix elements have been parsed below. Please review, edit, or adjust alternatives and factors to match your exact intentions before advancing.
              </p>
            </div>
          </div>

          <div className="space-y-3" id="edit-goal-section">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-400" htmlFor="decision-goal">
              Decision Title / Goal
            </label>
            <input
              type="text"
              id="decision-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-none border border-[#E5E1DA] px-4 py-3 focus:border-[#121212] focus:ring-0 text-sm font-semibold bg-white"
              placeholder="e.g., Selecting a Programming Laptop"
            />
          </div>

          <div className="flex flex-col gap-6" id="edit-lists-grid">
            {/* Alternatives (Max 6) */}
            <div className="bg-white border border-[#E5E1DA] rounded-none p-4 sm:p-6 space-y-4" id="edit-alternatives-card">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Alternatives</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Options you are evaluating (Max 6)</p>
                </div>
                <button
                  onClick={handleAddAlternative}
                  disabled={alternatives.length >= 6}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-[#121212] hover:bg-gray-50 border border-[#121212] rounded-none flex items-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="btn-add-alternative"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-3" id="alternatives-inputs">
                {alternatives.map((alt, idx) => (
                  <div key={idx} className="flex gap-2.5 items-center" id={`alt-input-wrapper-${idx}`}>
                    <span className="text-xs font-mono text-gray-400 w-5 text-right shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={alt}
                      onChange={(e) => handleAlternativeChange(idx, e.target.value)}
                      className="grow rounded-none border border-gray-200 px-3 py-2 text-xs focus:border-[#121212] focus:ring-0 bg-white"
                      placeholder={`Alternative name`}
                      id={`alt-input-${idx}`}
                    />
                    <button
                      onClick={() => handleRemoveAlternative(idx)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      id={`alt-delete-${idx}`}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Criteria / Factors (Min 2) */}
            <div className="bg-white border border-[#E5E1DA] rounded-none p-4 sm:p-6 space-y-4" id="edit-criteria-card">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Factors</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Criteria used to compare (Min 2, Max 10)</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    Qualitative factors default to a 1–10 scale (<span className="text-black font-semibold">pts (1-10)</span>). You can edit the Unit (UoM) for any factor.
                  </p>
                </div>
                <button
                  onClick={handleAddCriterion}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-[#121212] hover:bg-gray-50 border border-[#121212] rounded-none flex items-center gap-1 transition cursor-pointer"
                  id="btn-add-criterion"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-3" id="criteria-inputs">
                {criteria.map((crit, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50/60 md:bg-transparent border border-gray-200/80 md:border-0 p-3 md:p-0 space-y-2.5 md:space-y-0 flex flex-col md:flex-row md:items-center gap-2"
                    id={`crit-input-wrapper-${idx}`}
                  >
                    {/* Top row: Index, Factor Name input, and Delete button (on mobile) */}
                    <div className="flex gap-2 items-center grow min-w-0">
                      <span className="text-xs font-mono text-gray-400 w-5 text-right shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) => handleCriterionChange(idx, "name", e.target.value)}
                        className="grow min-w-0 rounded-none border border-gray-200 px-3 py-2 text-xs focus:border-[#121212] focus:ring-0 bg-white"
                        placeholder={`Factor / Criterion name`}
                        id={`crit-input-${idx}`}
                      />
                      <button
                        onClick={() => handleRemoveCriterion(idx)}
                        className="md:hidden p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        id={`crit-delete-mobile-${idx}`}
                        title="Remove factor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Bottom row on mobile / Right side controls on desktop: Unit & Type toggle */}
                    <div className="flex gap-2 items-center pl-7 md:pl-0 shrink-0 flex-wrap sm:flex-nowrap">
                      <div className="grow md:grow-0 md:w-36 min-w-0">
                        <input
                          type="text"
                          value={crit.unit ?? ""}
                          onChange={(e) => handleCriterionChange(idx, "unit", e.target.value)}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) {
                              handleCriterionChange(idx, "unit", "pts (1-10)");
                            }
                          }}
                          className="w-full rounded-none border border-gray-200 px-3 py-2 text-xs focus:border-[#121212] focus:ring-0 bg-white font-mono text-[#121212]"
                          placeholder={`Unit (e.g. pts (1-10), $, hrs)`}
                          id={`crit-unit-${idx}`}
                          title="Edit Unit of Measure (UoM)"
                        />
                      </div>
                      <div className="shrink-0">
                        <div className="flex border border-gray-200 rounded-none overflow-hidden" id={`crit-toggle-${idx}`}>
                          <button
                            type="button"
                            onClick={() => handleCriterionChange(idx, "type", "benefit")}
                            className={`px-2.5 py-2 text-xs font-mono transition cursor-pointer flex items-center gap-1 ${
                              crit.type === "benefit"
                                ? "bg-[#121212] text-white font-semibold"
                                : "bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                            title="Benefit: Higher values are better"
                          >
                            <span>↑</span> Benefit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCriterionChange(idx, "type", "cost")}
                            className={`px-2.5 py-2 text-xs font-mono transition cursor-pointer flex items-center gap-1 border-l border-gray-200 ${
                              crit.type === "cost"
                                ? "bg-[#121212] text-white font-semibold"
                                : "bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                            title="Cost: Lower values are better"
                          >
                            <span>↓</span> Cost
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCriterion(idx)}
                        className="hidden md:block p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        id={`crit-delete-desktop-${idx}`}
                        title="Remove factor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 rounded-none p-4 flex gap-3 text-rose-700 text-xs" id="nl-edit-error">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-gray-100" id="edit-step-navigation">
            <button
              onClick={() => {
                setExtractedData(null);
                setError(null);
              }}
              className="px-5 py-3 text-[11px] uppercase tracking-wider font-bold text-gray-500 hover:text-[#121212] transition cursor-pointer"
              id="btn-edit-back"
            >
              ← Back to Edit Prompt
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-[#121212] hover:bg-neutral-800 text-white text-[11px] uppercase tracking-widest font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
              id="btn-edit-confirm"
            >
              Confirm & Compare Criteria <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
