export interface Criterion {
  name: string;
  type: "benefit" | "cost";
  unit?: string;
}

export interface DecisionData {
  decision_goal: string;
  alternatives: string[];
  criteria: Criterion[];
}

export interface PairwiseComparison {
  criterionAIndex: number;
  criterionBIndex: number;
  value: number; // Slider value from -8 to 8
}

export interface AHPResult {
  weights: number[];
  cr: number;
  ci: number;
  lambdaMax: number;
  matrix: number[][];
  isConsistent: boolean;
}

export interface TopsisResult {
  alternative: string;
  score: number; // Closeness coefficient V_i
  rank: number;
}
