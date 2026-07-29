# Known Limitations

Converge is built on well-established multi-criteria decision analysis methods (AHP and TOPSIS). Like any implementation of these methods, it inherits some known theoretical properties and makes some deliberate engineering trade-offs. This document states them plainly, rather than letting them surface as surprises.

---

## 1. TOPSIS is susceptible to rank reversal

**What this means:** TOPSIS ranks alternatives by their distance to a computed "ideal" and "anti-ideal" solution, which are derived from the *entire* set of alternatives being compared. Because of this, adding or removing an alternative — even a clearly non-competitive one — can shift the normalization basis enough to change the relative ranking of the *other* alternatives, without any change to their own underlying scores.

**Why this happens:** This is a documented, long-standing property of TOPSIS with vector normalization, not a bug specific to this implementation. It has been studied extensively in the decision-science literature since the 1990s.

**What this means for you:** If you add a new alternative to a decision you've already ranked, don't assume the existing ranking is unaffected — re-check the full result rather than only looking at whether the new alternative under- or out-performs the incumbents.

**What we haven't done (and why):** Rank-reversal-resistant alternatives exist (e.g. linear max normalization, or reference-independent methods), each with their own trade-offs. Converge uses vector normalization, the standard approach from Hwang & Yoon's original TOPSIS formulation (1981). Switching normalization schemes is a deliberate methodological choice, not something we consider a "fix" without a documented reason for a different scheme.

---

## 2. AHP weights use an approximation, not the exact eigenvector method

**What this means:** Saaty's original AHP method (1980) computes priority weights via the matrix's principal eigenvector. Converge instead uses **column normalization**, a widely-used approximation that avoids the computational complexity of eigenvector decomposition in a browser/JS environment.

**How different is it?** On Saaty's own canonical 3×3 worked example, the exact method yields weights `[0.649, 0.279, 0.072]`; column normalization yields `[0.669, 0.243, 0.088]` — a few percentage points of difference per weight. This has been verified and documented internally (see `TEST_PROPOSAL_MATH.md`).

**What this means for you:** Priority weights are a close approximation of the canonical method, not bit-for-bit identical to it. For most real-world decisions, this difference is small relative to the inherent imprecision of a human expressing preferences via pairwise comparisons in the first place.

---

## 3. AI-assisted criterion classification is reviewable, not blind

**What this means:** When you describe a decision in plain English, Gemini extracts your criteria and classifies each one as **Benefit** (higher is better) or **Cost** (lower is better). If this classification were wrong and went unnoticed — e.g. "Commute Time" mistakenly marked as a benefit — the final ranking would be inverted.

**The safeguard that exists:** Before any ranking is calculated, every criterion's Benefit/Cost classification is shown as an editable toggle on the "Define & Extract" screen. You can review and correct it before proceeding. This is a **human-in-the-loop check**, not a fully automated pipeline — the AI proposes, you can verify.

**What this means for you:** Always glance at the Benefit/Cost tags before moving past Step 1, especially for criteria where the "higher/lower is better" direction isn't immediately obvious from the name alone (e.g. "Risk," "Turnover," "Lead Time").

---

## 4. Consistency adjustment is opt-in, never automatic

**What this means:** If your pairwise comparisons are mathematically inconsistent (Consistency Ratio ≥ 10%), Converge can suggest an adjusted set of values that would bring your inputs into consistency. It uses log-ratio interpolation to find the smallest reasonable change, rather than naively averaging or overwriting your inputs.

**The safeguard that exists:** This adjustment **only happens when you explicitly click "Smart Adjust" or "Apply Suggested Balance."** Your original comparisons are never silently modified by the app. You always retain full control over whether to accept the suggestion, tweak it further, or leave your original inconsistent judgments as-is.

---

## 5. Single-vendor AI dependency

Natural language extraction relies on Google's Gemini API. If Gemini experiences an outage, a deprecated model, or an account-level issue (as documented in `KNOWN_ISSUES.md`), the extraction step will fail. There is currently no cross-provider fallback (e.g. to OpenAI or Anthropic). This is a scope decision appropriate for the project's current stage, not an oversight — but worth knowing if you're relying on this for a time-sensitive decision.

---

## Summary

None of the above are hidden defects — they're properties and trade-offs inherent to the methods and architecture chosen. Where a safeguard already exists (criterion review, opt-in adjustment), it's described above. Where a limitation is structural to the method itself (rank reversal, weight approximation), it's disclosed rather than glossed over.
