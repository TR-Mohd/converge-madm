import { Criterion, PairwiseComparison, AHPResult, TopsisResult } from "../types";

/**
 * Map slider value from [-8, 8] to Saaty's 1-9 scale.
 * Negative value means A is more important.
 * Positive value means B is more important.
 * 0 means equal importance (1).
 */
export function getSaatyValue(v: number): number {
  if (v === 0) return 1;
  return Math.abs(v) + 1;
}

/**
 * Compute the AHP pairwise matrix, weights, CI, and CR.
 */
export function calculateAHP(
  criteriaCount: number,
  comparisons: PairwiseComparison[]
): AHPResult {
  const n = criteriaCount;
  
  // Initialize matrix with 1s on diagonal
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));

  // Fill matrix based on comparisons
  for (const comp of comparisons) {
    const { criterionAIndex: i, criterionBIndex: j, value } = comp;
    if (i < n && j < n) {
      const saatyVal = getSaatyValue(value);
      if (value < 0) {
        // Criterion A is more important
        matrix[i][j] = saatyVal;
        matrix[j][i] = 1 / saatyVal;
      } else if (value > 0) {
        // Criterion B is more important
        matrix[i][j] = 1 / saatyVal;
        matrix[j][i] = saatyVal;
      } else {
        // Equal
        matrix[i][j] = 1;
        matrix[j][i] = 1;
      }
    }
  }

  // 1. Column Normalization method to approximate priority weights
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  const weights = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] / (colSums[j] || 1);
    }
    weights[i] = rowSum / n;
  }

  // 2. Compute lambdaMax (principal eigenvalue)
  // AW = original_matrix * weights
  const aw = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      aw[i] += matrix[i][j] * weights[j];
    }
  }

  // Average lambda_i = aw[i] / weights[i]
  let lambdaMaxSum = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] > 0) {
      lambdaMaxSum += aw[i] / weights[i];
    }
  }
  const lambdaMax = n > 0 ? lambdaMaxSum / n : 0;

  // 3. Compute Consistency Index (CI)
  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;

  // 4. Compute Consistency Ratio (CR)
  // Standard Random Index (RI) lookup table for n = 1 to 10
  const RI_TABLE = [0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  const ri = RI_TABLE[n - 1] !== undefined ? RI_TABLE[n - 1] : 1.49;

  const cr = ri === 0 ? 0 : ci / ri;
  const isConsistent = n <= 2 ? true : cr < 0.10;

  return {
    weights,
    cr,
    ci,
    lambdaMax,
    matrix,
    isConsistent,
  };
}

/**
 * Converts a slider value in [-8, 8] to the ratio r = w_i / w_j it encodes.
 * This is the exact inverse of mapRatioToSlider (up to integer rounding),
 * and matches the ratio convention used when building the AHP matrix in
 * calculateAHP (matrix[i][j] = w_i / w_j).
 */
export function sliderToRatio(v: number): number {
  const saatyVal = getSaatyValue(v);
  if (v < 0) return saatyVal; // A more important: wi/wj = saatyVal
  if (v > 0) return 1 / saatyVal; // B more important: wi/wj = 1/saatyVal
  return 1;
}

/**
 * Maps a ratio r = w_i / w_j back to the slider value in [-8, 8].
 */
export function mapRatioToSlider(r: number): number {
  if (r >= 0.95 && r <= 1.05) {
    return 0;
  }
  if (r > 1) {
    // A is more important, slider should be negative
    const val = -(r - 1);
    return Math.max(-8, Math.min(0, Math.round(val)));
  } else {
    // B is more important, slider should be positive
    const val = (1 / r) - 1;
    return Math.max(0, Math.min(8, Math.round(val)));
  }
}

/**
 * Automatically adjust the pairwise comparisons using fractional interpolation
 * to achieve consistency with minimum alteration to user input.
 */
export function smartAdjustComparisons(
  criteriaCount: number,
  comparisons: PairwiseComparison[]
): PairwiseComparison[] {
  // 1. Calculate current AHP
  const currentResult = calculateAHP(criteriaCount, comparisons);
  if (currentResult.isConsistent) {
    return comparisons; // No adjustment needed
  }

  const weights = currentResult.weights;

  // Find consistent slider values
  const consistentValues = comparisons.map((comp) => {
    const wi = weights[comp.criterionAIndex];
    const wj = weights[comp.criterionBIndex];
    const ratio = wj === 0 ? 1 : wi / wj;
    return mapRatioToSlider(ratio);
  });

  // Iteratively search for the smallest alpha (step of 0.05) that gives a CR < 10%
  let bestAdjustedComparisons = comparisons;
  let reachedConsistency = false;

  for (let alpha = 0.05; alpha <= 1.0; alpha += 0.05) {
    const candidateComparisons = comparisons.map((comp, idx) => {
      // Saaty's scale is a ratio (multiplicative) scale, not a linear one:
      // the "distance" between slider values 2 and 6 (ratios 3 and 7) is not
      // the same as between 0 and 4 (ratios 1 and 5). Interpolating on the
      // raw integer slider index therefore distorts the user's original
      // relative preference strength more than necessary when forcing
      // consistency. Interpolating in log-ratio space respects the
      // multiplicative structure and finds a genuinely smaller perturbation.
      const origRatio = sliderToRatio(comp.value);
      const targetRatio = sliderToRatio(consistentValues[idx]);

      const logOrig = Math.log(origRatio);
      const logTarget = Math.log(targetRatio);
      const interpolatedLog = logOrig + alpha * (logTarget - logOrig);
      const interpolatedRatio = Math.exp(interpolatedLog);

      const roundedVal = mapRatioToSlider(interpolatedRatio);
      return {
        ...comp,
        value: roundedVal,
      };
    });

    const candidateResult = calculateAHP(criteriaCount, candidateComparisons);
    if (candidateResult.isConsistent) {
      bestAdjustedComparisons = candidateComparisons;
      reachedConsistency = true;
      break;
    }
  }

  if (!reachedConsistency) {
    bestAdjustedComparisons = comparisons.map((comp, idx) => ({
      ...comp,
      value: consistentValues[idx],
    }));
  }

  return bestAdjustedComparisons;
}

export interface ComparisonInconsistencyInfo {
  index: number;
  deviation: number; // Multicative error
  suggestedValue: number;
}

/**
 * Calculates how much each comparison deviates from the consistent weight ratio.
 */
export function analyzeComparisonsInconsistency(
  criteriaCount: number,
  comparisons: PairwiseComparison[]
): ComparisonInconsistencyInfo[] {
  const result = calculateAHP(criteriaCount, comparisons);
  const weights = result.weights;

  return comparisons.map((comp, idx) => {
    const wi = weights[comp.criterionAIndex];
    const wj = weights[comp.criterionBIndex];
    const idealRatio = wj === 0 ? 1 : wi / wj;

    const saatyVal = getSaatyValue(comp.value);
    const actualRatio = comp.value < 0 ? saatyVal : (comp.value > 0 ? 1 / saatyVal : 1);

    // Deviation score: max(actual/ideal, ideal/actual) - 1
    const deviation = Math.max(actualRatio / idealRatio, idealRatio / actualRatio) - 1;
    const suggestedValue = mapRatioToSlider(idealRatio);

    return {
      index: idx,
      deviation,
      suggestedValue,
    };
  });
}

/**
 * Helper to parse numeric input robustly, handling:
 *  - plain numbers: "42", "3.5"
 *  - ranges: "10-12", "10 to 12", "10–12" -> averaged
 *  - metric multipliers: "2.5k" -> 2500, "1.2M" -> 1200000
 *  - units/noise: "$799", "12 hrs", "45%"
 *
 * Unlike a naive character-strip, this does NOT silently collapse a range
 * like "10-12" into "10" by accident (which previously happened because
 * parseFloat("10-12") short-circuits at the first "-"). Ranges are
 * explicitly detected and averaged instead.
 *
 * Returns NaN (not 0) when the input has no discernible number, so callers
 * can detect and surface bad data instead of it silently becoming a 0 that
 * skews TOPSIS normalization.
 */
export function parseCleanNumeric(val: string | number): number {
  if (typeof val === "number") return val;
  if (val === null || val === undefined) return NaN;

  const str = String(val).trim();
  if (!str) return NaN;

  // 1. Range detection: "10-12", "10 to 12", "10–12", "10—12" -> average
  //    Requires two distinct numeric tokens separated by a range delimiter.
  const rangeMatch = str.match(
    /(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i
  );
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]);
    const b = parseFloat(rangeMatch[2]);
    if (!isNaN(a) && !isNaN(b)) {
      return (a + b) / 2;
    }
  }

  // 2. Metric multiplier suffix: "2.5k", "1.2M", "3B" (case-insensitive,
  //    optional space, optional trailing unit text like "2.5k users")
  const multMatch = str.match(/(-?\d+(?:\.\d+)?)\s*([kKmMbB])(?:[a-zA-Z]*)?\b/);
  if (multMatch) {
    const num = parseFloat(multMatch[1]);
    const suffix = multMatch[2].toLowerCase();
    const multiplier = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : 1e9;
    if (!isNaN(num)) {
      return num * multiplier;
    }
  }

  // 3. Plain number with surrounding noise: "$799", "12 hrs", "45%"
  //    Extract the first standalone numeric token rather than stripping
  //    all non-numeric chars blindly (which can merge unrelated digits
  //    together, e.g. "v2 - 3 stars" -> "2-3" -> misparsed as a range/23).
  const plainMatch = str.match(/-?\d+(?:\.\d+)?/);
  if (plainMatch) {
    const num = parseFloat(plainMatch[0]);
    return isNaN(num) ? NaN : num;
  }

  return NaN;
}

/**
 * Compute the TOPSIS rankings of the alternatives.
 * @param alternatives List of alternative names
 * @param criteria List of criteria types & names
 * @param weights AHP priority weights
 * @param rawData Matrix of dimensions: alternatives x criteria
 */
export function calculateTOPSIS(
  alternatives: string[],
  criteria: Criterion[],
  weights: number[],
  rawData: string[][] // index [i][j] represents raw cell for alternatives[i], criteria[j]
): TopsisResult[] {
  const m = alternatives.length;
  const n = criteria.length;

  if (weights.length !== n) {
    throw new Error(
      `Mismatch between weights count (${weights.length}) and criteria count (${n}). ` +
        `Please re-run the AHP pairwise weighting step.`
    );
  }

  // Convert raw text inputs into numbers
  const dataMatrix: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  const invalidCells: { alternative: string; criterion: string; raw: string }[] = [];

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const raw = rawData[i]?.[j] ?? "";
      const parsed = parseCleanNumeric(raw === "" ? "0" : raw);
      if (isNaN(parsed)) {
        invalidCells.push({
          alternative: alternatives[i],
          criterion: criteria[j]?.name ?? `criterion ${j}`,
          raw: String(raw),
        });
        dataMatrix[i][j] = 0; // placeholder only; error below prevents using it
      } else {
        dataMatrix[i][j] = parsed;
      }
    }
  }

  if (invalidCells.length > 0) {
    const details = invalidCells
      .map((c) => `"${c.raw}" (${c.alternative} / ${c.criterion})`)
      .join(", ");
    throw new Error(
      `Unable to parse ${invalidCells.length} data cell(s) as numbers: ${details}. ` +
        `Fix these values before running TOPSIS — invalid cells would otherwise ` +
        `silently distort the ranking.`
    );
  }

  // 1. Vector Normalization
  // sum_of_squares_j = sum_{i=1}^m (x_ij)^2
  const colNorms = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let sumSquares = 0;
    for (let i = 0; i < m; i++) {
      sumSquares += Math.pow(dataMatrix[i][j], 2);
    }
    colNorms[j] = Math.sqrt(sumSquares);
  }

  const normMatrix: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const normFactor = colNorms[j];
      normMatrix[i][j] = normFactor === 0 ? 0 : dataMatrix[i][j] / normFactor;
    }
  }

  // 2. Multiply by AHP weights
  const weightedMatrix: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      weightedMatrix[i][j] = normMatrix[i][j] * weights[j];
    }
  }

  // 3. Positive Ideal Solution (A_plus) and Negative Ideal Solution (A_minus)
  const aPlus = Array(n).fill(0);
  const aMinus = Array(n).fill(0);

  for (let j = 0; j < n; j++) {
    const colValues = weightedMatrix.map((row) => row[j]);
    const maxVal = Math.max(...colValues);
    const minVal = Math.min(...colValues);

    if (criteria[j].type === "benefit") {
      aPlus[j] = maxVal;
      aMinus[j] = minVal;
    } else {
      // cost criterion: lower is better
      aPlus[j] = minVal;
      aMinus[j] = maxVal;
    }
  }

  // 4. Euclidean distance to ideal solutions
  const sPlus = Array(m).fill(0);
  const sMinus = Array(m).fill(0);

  for (let i = 0; i < m; i++) {
    let sumSqPlus = 0;
    let sumSqMinus = 0;
    for (let j = 0; j < n; j++) {
      sumSqPlus += Math.pow(weightedMatrix[i][j] - aPlus[j], 2);
      sumSqMinus += Math.pow(weightedMatrix[i][j] - aMinus[j], 2);
    }
    sPlus[i] = Math.sqrt(sumSqPlus);
    sMinus[i] = Math.sqrt(sumSqMinus);
  }

  // 5. Closeness Coefficient (V_i = S-_i / (S+_i + S-_i))
  const results: { alternative: string; score: number }[] = [];
  for (let i = 0; i < m; i++) {
    const dPlus = sPlus[i];
    const dMinus = sMinus[i];
    let score = 0;

    if (dPlus === 0 && dMinus === 0) {
      score = 0.5;
    } else {
      score = dMinus / (dPlus + dMinus);
    }
    results.push({
      alternative: alternatives[i],
      score,
    });
  }

  // Rank highest score first
  const sorted = [...results].sort((a, b) => b.score - a.score);

  return sorted.map((item, index) => ({
    alternative: item.alternative,
    score: item.score,
    rank: index + 1,
  }));
}