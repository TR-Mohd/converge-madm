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
    if (!description.trim()) {
      setError("Please describe your decision before extracting.");
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
      setExtractedData(data);
      setGoal(data.decision_goal);
      setAlternatives(data.alternatives);
      setCriteria(data.criteria);
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
    setCriteria([...criteria, { name: `Criterion ${criteria.length + 1}`, type: "benefit", unit: "points" }]);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="edit-lists-grid">
            {/* Alternatives (Max 6) */}
            <div className="bg-white border border-[#E5E1DA] rounded-none p-6 space-y-4" id="edit-alternatives-card">
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

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1" id="alternatives-inputs">
                {alternatives.map((alt, idx) => (
                  <div key={idx} className="flex gap-2 items-center" id={`alt-input-wrapper-${idx}`}>
                    <span className="text-xs font-mono text-gray-400 w-5 text-right">{idx + 1}.</span>
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
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      id={`alt-delete-${idx}`}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Criteria (Min 2) */}
            <div className="bg-white border border-[#E5E1DA] rounded-none p-6 space-y-4" id="edit-criteria-card">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-[#121212]">Factors</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Criteria used to compare (Min 2)</p>
                </div>
                <button
                  onClick={handleAddCriterion}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold text-[#121212] hover:bg-gray-50 border border-[#121212] rounded-none flex items-center gap-1 transition cursor-pointer"
                  id="btn-add-criterion"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1" id="criteria-inputs">
                {criteria.map((crit, idx) => (
                  <div key={idx} className="flex gap-2 items-center" id={`crit-input-wrapper-${idx}`}>
                    <span className="text-xs font-mono text-gray-400 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={crit.name}
                      onChange={(e) => handleCriterionChange(idx, "name", e.target.value)}
                      className="grow rounded-none border border-gray-200 px-3 py-2 text-xs focus:border-[#121212] focus:ring-0 bg-white"
                      placeholder={`Criterion name`}
                      id={`crit-input-${idx}`}
                    />
                    <input
                      type="text"
                      value={crit.unit || ""}
                      onChange={(e) => handleCriterionChange(idx, "unit", e.target.value)}
                      className="w-24 rounded-none border border-gray-200 px-3 py-2 text-xs focus:border-[#121212] focus:ring-0 bg-white font-mono text-[#121212]"
                      placeholder={`Unit (e.g. $, hrs)`}
                      id={`crit-unit-${idx}`}
                    />
                    <select
                      value={crit.type}
                      onChange={(e) => handleCriterionChange(idx, "type", e.target.value)}
                      className="rounded-none border border-gray-200 px-2 py-2 text-xs text-[#121212] bg-gray-50 focus:border-[#121212] focus:ring-0 cursor-pointer shrink-0"
                      id={`crit-select-${idx}`}
                      title="Is high value a benefit or cost?"
                    >
                      <option value="benefit">Benefit (↑)</option>
                      <option value="cost">Cost (↓)</option>
                    </select>
                    <button
                      onClick={() => handleRemoveCriterion(idx)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      id={`crit-delete-${idx}`}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
