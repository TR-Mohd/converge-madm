import { DecisionData, PairwiseComparison, AHPResult, TopsisResult } from "../types";

export const SESSION_KEY = "converge_session_v1";
export const SESSION_VERSION = 1;

export interface WizardSession {
  version: number;
  savedAt: string;
  currentStep: number;
  userPrompt: string;
  decisionData: DecisionData | null;
  comparisons: PairwiseComparison[] | null;
  ahpResult: AHPResult | null;
  rawData: string[][] | null;
  rankings: TopsisResult[] | null;
}

export function loadSession(): WizardSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== SESSION_VERSION ||
      typeof parsed.currentStep !== "number" ||
      parsed.currentStep <= 1
    ) {
      return null;
    }

    return parsed as WizardSession;
  } catch (error) {
    console.warn("Failed to load or parse session from localStorage:", error);
    return null;
  }
}

export function saveSession(
  sessionData: Omit<WizardSession, "version" | "savedAt">
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const fullSession: WizardSession = {
      ...sessionData,
      version: SESSION_VERSION,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(fullSession));
  } catch (error) {
    console.warn("Failed to save session to localStorage:", error);
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn("Failed to clear session from localStorage:", error);
  }
}

export function useSessionPersistence() {
  return {
    loadSession,
    saveSession,
    clearSession,
  };
}
