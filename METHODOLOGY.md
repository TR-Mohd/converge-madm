# Methodology

*How Converge turns a plain-English decision into a ranked answer.*

---

## 1. The pipeline, at a glance

```
1. Define & Extract   →  An AI reads your description and proposes alternatives + criteria
2. AHP Comparisons    →  You weigh each criterion against every other, pairwise
3. Weights Chart      →  Those comparisons are converted into priority weights
4. Raw Performance    →  You (or AI-assisted auto-fill) score each alternative per criterion
5. Final Decision     →  TOPSIS ranks alternatives by closeness to the ideal outcome
```

Steps 2–5 are pure mathematics — deterministic, and fully reproducible from the same inputs. Step 1 is the only step that involves AI judgment, and its output is always shown to you for review before anything is calculated.

---

## 2. Turning your description into structured data

When you describe a decision in plain English, an LLM (Gemini) extracts three things: your **alternatives**, your **criteria**, and for each criterion, whether it's a **Benefit** (higher is better, e.g. quality) or a **Cost** (lower is better, e.g. price).

This step is inherently probabilistic — language models can misclassify an ambiguous criterion. That's why the extracted result is never used directly: it's shown to you as an editable table before Step 2 begins. You can rename, add, remove, or re-flag anything. Everything downstream from here is deterministic math, not AI inference.

---

## 3. AHP — turning preferences into weights

### The pairwise comparison

For every pair of criteria, you indicate which one matters more to you, and by how much, using Saaty's 1–9 scale:

| Value | Meaning |
|---|---|
| 1 | Equal importance |
| 3 | One is moderately more important |
| 5 | One is strongly more important |
| 7 | One is very strongly more important |
| 9 | One is extremely more important |

(2, 4, 6, 8 are intermediate values between these.)

These comparisons build an n×n matrix, where matrix[i][j] represents how much criterion *i* is favored over criterion *j* (and matrix[j][i] is its reciprocal, 1/matrix[i][j]).

### From the matrix to weights

Converge computes priority weights using **column normalization**: each column is normalized to sum to 1, then each criterion's weight is the average of its (now-normalized) row values.

```
weight[i] = (1/n) × Σⱼ ( matrix[i][j] / columnSum[j] )
```

This is a widely-used approximation of Saaty's original method, which technically calls for the matrix's principal eigenvector. Column normalization is computationally simpler and, in practice, converges very close to the eigenvector result — see the Limitations page for the exact size of that gap on a worked example.

### Checking your own consistency

Human judgment isn't always transitive — you might say A > B and B > C, but then accidentally say C > A. Converge measures this using the standard AHP **Consistency Ratio**:

```
λmax  = average of (Matrix × weights)ᵢ / weightᵢ,  across all i
CI    = (λmax − n) / (n − 1)
CR    = CI / RI          (RI = Saaty's Random Index for matrix size n)
```

If CR ≥ 0.10, your comparisons are considered too inconsistent to trust, and the app flags it — but never overrides you automatically (see below).

### Smart Adjust: fixing inconsistency without erasing your intent

If you ask for help resolving inconsistency, Converge doesn't simply average your numbers toward consistency. Saaty's scale is a *ratio* scale — the "distance" between values 3 and 7 is not the same as between 1 and 5, because they represent multiplicative relationships, not linear ones. So the adjustment interpolates in **log-ratio space**: it converts your comparison to the ratio it represents, moves that ratio partway toward the mathematically ideal one (found by finding the closest step of Saaty's scale to `weight[i] / weight[j]`), and only then converts back to a slider value. This finds a smaller, more faithful correction than naive linear averaging would.

This adjustment is always opt-in — nothing is changed unless you explicitly accept the suggestion.

---

## 4. TOPSIS — ranking the alternatives

### Normalizing the data

Your raw performance data (e.g. price, battery life, ratings) is on different scales and units. TOPSIS first normalizes each column using **vector normalization**:

```
r(i,j) = x(i,j) / √( Σᵢ x(i,j)² )
```

Each value becomes its proportion of that column's overall magnitude — this makes columns comparable regardless of original units.

### Applying your weights

Each normalized value is then scaled by the criterion's AHP-derived weight:

```
v(i,j) = weight[j] × r(i,j)
```

### Finding the best and worst possible outcome

For each criterion, Converge finds the **Positive Ideal** (best possible value across all alternatives) and **Negative Ideal** (worst possible value) — flipped correctly depending on whether the criterion is a Benefit or a Cost:

```
Benefit criterion:  A⁺ = max(column),  A⁻ = min(column)
Cost criterion:     A⁺ = min(column),  A⁻ = max(column)
```

These aren't real alternatives — they're hypothetical "perfect" and "worst-case" profiles, built by taking the best (or worst) value achieved in each column independently.

### Measuring distance, and ranking

Each alternative's Euclidean distance to both ideals is computed:

```
S⁺ = √( Σⱼ (v(i,j) − A⁺ⱼ)² )      — distance to the ideal
S⁻ = √( Σⱼ (v(i,j) − A⁻ⱼ)² )      — distance to the anti-ideal
```

The final score — the **closeness coefficient** — is:

```
Cᵢ = S⁻ / (S⁺ + S⁻)
```

An alternative that's close to the ideal and far from the anti-ideal scores close to 1. Alternatives are ranked by this score, highest first. Ties (scores equal within floating-point tolerance) share the same rank, using competition-style ranking (1, 2, 2, 4 — not 1, 2, 3, 4).

---

## 5. A known property worth understanding

Because the ideal and anti-ideal are computed from *all* alternatives currently in the comparison, adding or removing an alternative can shift these reference points — and, in rare cases, change the relative order of the *other* alternatives too, even though their own scores didn't change. This is a documented property of TOPSIS itself (not specific to this implementation), sometimes called *rank reversal*. See the [Limitations](/limitations) page for the full explanation.

---

*For the exact tested behavior of every function described here, see `TEST_PROPOSAL_MATH.md` and `math.test.ts` in the source repository.*
