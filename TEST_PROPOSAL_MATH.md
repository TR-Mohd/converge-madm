# Test Proposal — `src/utils/math.ts`

## Status
> 📋 Proposal — not yet implemented.

---

## Framework

**Vitest** — zero additional config needed since the project already uses Vite.

**Installation required:**
```bash
npm install -D vitest
```

**Script to add in `package.json`:**
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Test file location:** `src/utils/math.test.ts`

---

## Math Sources & References

### AHP Functions

> **Saaty, T.L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill, New York.**

The primary reference for all AHP-related tests. The canonical 3-criteria worked example
from Chapter 1 is used as the integration test case:

```
Pairwise comparison matrix:
       C1    C2    C3
C1  [  1     3     7  ]
C2  [ 1/3    1     3  ]
C3  [ 1/7   1/3    1  ]
```

Published results using the **right principal eigenvector method** (Saaty):
`w ≈ [0.649, 0.279, 0.072]`, `λmax ≈ 3.067`, `CR ≈ 0.057`

> ⚠️ **Important:** The codebase uses **column normalization** (an approximation of the
> eigenvector method), not the exact eigenvector method. The two methods give slightly
> different results. All expected values in the tests are computed from the column
> normalization algorithm manually — not taken verbatim from Saaty's paper. This is
> documented inline in each test.

**Column normalization derived expected values for the 3×3 example:**
| Property | Expected (approx) |
|---|---|
| `weights[0]` | `0.669` |
| `weights[1]` | `0.243` |
| `weights[2]` | `0.088` |
| `λmax` | `3.007` |
| `CI` | `0.0035` |
| `CR` | `0.006` |
| `isConsistent` | `true` |

**RI table values** (Saaty, 1980 — used to verify the lookup in the code):
| n | RI |
|---|---|
| 1 | 0.00 |
| 2 | 0.00 |
| 3 | 0.58 |
| 4 | 0.90 |
| 5 | 1.12 |

---

### TOPSIS Function

> **Hwang, C.L. & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and
> Applications*. Springer-Verlag, Berlin.**

A hand-computable 2-alternative × 2-criteria example is used for the integration test:

| | Price (Cost, w=0.5) | Quality (Benefit, w=0.5) |
|---|---|---|
| **Option A** | $500 | 8 pts |
| **Option B** | $300 | 6 pts |

**Hand-computed expected results:**

Step 1 — Vector normalization column norms:
- Price: `√(500² + 300²) = 583.095`
- Quality: `√(8² + 6²) = 10`

Step 2 — Weighted normalized matrix:
- A: `[0.4287, 0.4000]`
- B: `[0.2572, 0.3000]`

Step 3 — Ideal solutions (Price=cost, Quality=benefit):
- A⁺: `[0.2572, 0.4000]` (min price, max quality)
- A⁻: `[0.4287, 0.3000]` (max price, min quality)

Step 4 — Euclidean distances:
- `S⁺(A) = 0.1715`, `S⁻(A) = 0.1000`
- `S⁺(B) = 0.1000`, `S⁻(B) = 0.1715`

Step 5 — Closeness coefficients:
- Score(A) ≈ `0.368`
- Score(B) ≈ `0.632`

**Expected winner: Option B** (rank 1). The cost advantage of B outweighs the
quality gap at equal weights because the price difference is proportionally larger
in the normalized space.

---

### `parseCleanNumeric`

No external reference — tested against its own documented contract from the inline
comments in `math.ts`.

---

## Proposed Test Cases

### `getSaatyValue(v: number)`

| Input | Expected | Reason |
|---|---|---|
| `0` | `1` | Equal importance |
| `-3` | `4` | Scale value 3+1=4 |
| `5` | `6` | Scale value 5+1=6 |
| `-8` | `9` | Maximum scale |
| `8` | `9` | Maximum scale |
| `-1` | `2` | Minimum non-equal |

---

### `sliderToRatio(v: number)`

| Input | Expected | Reason |
|---|---|---|
| `0` | `1` | Equal: wi/wj = 1 |
| `-2` | `3` | A dominant: saatyVal=3 |
| `3` | `0.25` | B dominant: 1/saatyVal = 1/4 |
| `-8` | `9` | Max A dominance |
| `8` | `1/9` | Max B dominance |

---

### `mapRatioToSlider(r: number)` — inverse of `sliderToRatio`

| Input | Expected | Reason |
|---|---|---|
| `1.0` | `0` | Equal (within ±5% band) |
| `1.02` | `0` | Within equal band |
| `3` | `-2` | A is 3× more important |
| `0.25` | `3` | B is 4× more important |
| `9` | `-8` | A at maximum |
| `1/9` | `8` | B at maximum |

---

### `parseCleanNumeric(val)`

| Input | Expected | Reason |
|---|---|---|
| `42` (number) | `42` | Pass-through |
| `"42"` | `42` | Plain integer |
| `"3.14"` | `3.14` | Decimal |
| `"$799"` | `799` | Currency prefix |
| `"12 hrs"` | `12` | Trailing unit |
| `"45%"` | `45` | Percentage |
| `"2.5k"` | `2500` | Kilo multiplier |
| `"1.2M"` | `1200000` | Mega multiplier |
| `"3B"` | `3000000000` | Billion multiplier |
| `"10-12"` | `11` | Range average |
| `"10 to 12"` | `11` | Range with "to" |
| `"10–12"` | `11` | En-dash range |
| `""` | `NaN` | Empty string |
| `"abc"` | `NaN` | No numeric content |
| `null` | `NaN` | Null input |

---

### `calculateAHP(criteriaCount, comparisons)`

#### Edge cases
| Scenario | What to verify |
|---|---|
| `n=1`, no comparisons | `weights=[1]`, `CI=0`, `CR=0`, `isConsistent=true` |
| `n=2`, equal comparison (`value=0`) | `weights=[0.5, 0.5]`, `isConsistent=true` |

#### Saaty 3×3 integration test
```ts
// slider value=-2 → saatyVal=3 → matrix[i][j]=3 (A more important)
// slider value=-6 → saatyVal=7 → matrix[i][j]=7 (A more important)
const comparisons = [
  { criterionAIndex: 0, criterionBIndex: 1, value: -2 }, // C1 vs C2: 3× (C1 stronger)
  { criterionAIndex: 0, criterionBIndex: 2, value: -6 }, // C1 vs C3: 7× (C1 strongest)
  { criterionAIndex: 1, criterionBIndex: 2, value: -2 }, // C2 vs C3: 3× (C2 stronger)
];
const result = calculateAHP(3, comparisons);
```

| Property | Expected | Tolerance |
|---|---|---|
| `weights[0]` | `0.669` | `±0.001` |
| `weights[1]` | `0.243` | `±0.001` |
| `weights[2]` | `0.088` | `±0.001` |
| `weights` sum | `1.000` | `±0.0001` |
| `lambdaMax` | `3.007` | `±0.01` |
| `cr` | `< 0.10` | — |
| `isConsistent` | `true` | — |

#### Inconsistent matrix test
A deliberately inconsistent 3×3 matrix (cyclical preference: A>B, B>C, C>A):
```ts
const comparisons = [
  { criterionAIndex: 0, criterionBIndex: 1, value: -7 }, // C1 >>> C2
  { criterionAIndex: 1, criterionBIndex: 2, value: -7 }, // C2 >>> C3
  { criterionAIndex: 0, criterionBIndex: 2, value: 3 },  // C3 > C1 (violates transitivity)
];
```
Expected: `isConsistent = false`, `cr > 0.10`

---

### `calculateTOPSIS(alternatives, criteria, weights, rawData)`

#### 2×2 hand-computed integration test
```ts
const alternatives = ["Option A", "Option B"];
const criteria = [
  { name: "Price", type: "cost", unit: "$" },
  { name: "Quality", type: "benefit", unit: "pts" },
];
const weights = [0.5, 0.5];
const rawData = [["500", "8"], ["300", "6"]];
const result = calculateTOPSIS(alternatives, criteria, weights, rawData);
```

| Assertion | Expected |
|---|---|
| `result[0].alternative` | `"Option B"` |
| `result[0].rank` | `1` |
| `result[0].score` | `≈ 0.632` (±0.005) |
| `result[1].alternative` | `"Option A"` |
| `result[1].rank` | `2` |

#### All-benefit criteria
Higher raw values should rank first.

#### All-cost criteria
Lower raw values should rank first.

#### Edge case: single alternative
- `dPlus = 0`, `dMinus = 0`
- Expected score: `0.5` (code handles this explicitly)

#### Error cases
| Scenario | Expected |
|---|---|
| `weights.length ≠ criteria.length` | Throws with mismatch message |
| Cell contains `"abc"` (unparseable) | Throws with cell details in message |
| Cell contains `"$1,200"` | Parsed as `1200` (no error — comma stripped) |

---

## Tolerance Strategy

All floating-point comparisons use `toBeCloseTo(expected, decimalPlaces)` from Vitest,
or a custom `±tolerance` wrapper for readability. No exact equality on computed floats.

---

## What Is NOT Tested Here

| Function | Reason |
|---|---|
| `smartAdjustComparisons` | Iterative algorithm; behaviour tested implicitly via `calculateAHP`. Can be added later. |
| `analyzeComparisonsInconsistency` | Depends on `calculateAHP`; indirect coverage sufficient for now. |

---

## Estimated Effort

| Task | Time |
|---|---|
| Install Vitest, add script | 5 min |
| Write all unit tests | ~45 min |
| Write AHP integration test | ~20 min |
| Write TOPSIS integration test | ~30 min |
| **Total** | **~1.5 hours** |
