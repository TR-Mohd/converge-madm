# Test Proposal — `api/_gemini.ts` Circuit Breaker

## Status
> 📋 Proposal — not yet implemented.

---

## Framework

**Vitest** — same as the math test suite. No additional installation needed if
`TEST_PROPOSAL_MATH.md` is implemented first.

**Test file location:** `api/_gemini.test.ts`

---

## What Is Being Tested

The circuit breaker logic in [`api/_gemini.ts`](./api/_gemini.ts):

| Export | What it does |
|---|---|
| `generateWithFallback(ai, params)` | Main function — tries primary model, falls back to secondary on daily quota hit, auto-resets at midnight UTC |
| `PRIMARY_MODEL` | `"gemini-3.6-flash"` |
| `FALLBACK_MODEL` | `"gemini-3.5-flash"` |

The state variables (`primaryBlocked`, `fallbackUntil`) are module-level — they persist
for the lifetime of the Node.js process. Tests must reset this state between cases.

---

## Testing Strategy

### The core challenge: module-level state

The circuit breaker uses module-level variables that persist across calls. This means:
1. Tests **must** reset state between each case.
2. The reset mechanism must be exposed (a `resetCircuitBreaker()` export added to `_gemini.ts` for test use only, or the state is reset by mocking the module).

**Recommended approach:** Add a `resetCircuitBreakerForTesting()` export to `_gemini.ts`
(clearly marked as test-only) that sets `primaryBlocked = false` and `fallbackUntil = null`.

### Mocking the Gemini API

All tests use a **mock `ai` object** — no real API calls are made. The mock controls
what each call returns or throws:

```ts
// Helper: create a mock ai object
function mockAi(primaryBehaviour: "succeed" | "daily429" | "other-error",
                fallbackBehaviour: "succeed" | "fail" = "succeed") {
  // returns an object with ai.models.generateContent(params)
  // that inspects params.model and behaves accordingly
}
```

### Detecting daily quota errors

The `isDailyQuotaError()` function (private) is tested **indirectly** through
`generateWithFallback()` — by verifying the fallback is triggered only for
errors that look like daily quota exhaustion.

---

## Test Cases

### Case 1 — Normal: primary model succeeds

```ts
// Setup: primaryBlocked = false (default), primary returns success
// Input: any valid params
// Expected:
//   - ai.models.generateContent called once
//   - Called with model = "gemini-3.6-flash"
//   - Returns the mock response
//   - primaryBlocked remains false after the call
```

---

### Case 2 — Daily quota hit on primary → silent fallback

```ts
// Setup: primary throws a 429 / RESOURCE_EXHAUSTED error with
//         a long retryDelay (> 300s) or "free_tier" in message
// Expected:
//   - ai.models.generateContent called twice
//   - First call: model = "gemini-3.6-flash"    → throws daily 429
//   - Second call: model = "gemini-3.5-flash"   → succeeds
//   - primaryBlocked = true after the call
//   - fallbackUntil = next midnight UTC (approximately)
//   - Function returns the fallback model's response (no error thrown)
```

---

### Case 3 — Subsequent calls while blocked: primary skipped entirely

```ts
// Setup: primaryBlocked = true, fallbackUntil = far future
// Expected:
//   - ai.models.generateContent called once
//   - Called with model = "gemini-3.5-flash" (skips primary entirely)
//   - Returns fallback response
//   - primaryBlocked remains true
```

---

### Case 4 — Auto-recovery: midnight UTC has passed

```ts
// Setup: primaryBlocked = true, fallbackUntil = Date in the past
// Expected:
//   - State is auto-reset at the start of the call (primaryBlocked = false)
//   - ai.models.generateContent called once
//   - Called with model = "gemini-3.6-flash" (primary restored)
//   - Returns primary response
//   - primaryBlocked = false after the call
```

---

### Case 5 — Recovery attempt: primary hits daily quota again

```ts
// Setup: primaryBlocked = true, fallbackUntil = Date in the past (auto-reset triggers)
//         primary throws daily 429 again
// Expected:
//   - First attempt resets state and tries primary → daily 429
//   - Circuit breaker trips again with a NEW fallbackUntil = next midnight
//   - Second attempt uses fallback → succeeds
//   - primaryBlocked = true (re-tripped)
//   - fallbackUntil updated to tonight's midnight
```

---

### Case 6 — Per-minute or non-daily error: fallback NOT triggered

```ts
// Setup: primary throws a 429 with a SHORT retryDelay (< 300s, e.g. "43s")
//         to simulate a per-minute limit
// Expected:
//   - ai.models.generateContent called once (primary only)
//   - Error is re-thrown to the caller (no silent fallback)
//   - primaryBlocked remains false (circuit breaker NOT tripped)
```

This is the most critical correctness test — ensures per-minute limits do NOT
permanently block the primary model for the rest of the day.

---

### Case 7 — Non-quota error on primary: re-thrown as-is

```ts
// Setup: primary throws a network error or 500 server error (not a quota error)
// Expected:
//   - Error re-thrown directly
//   - Fallback NOT attempted
//   - primaryBlocked remains false
```

---

### Case 8 — Both models fail

```ts
// Setup: primaryBlocked = true (already in fallback mode),
//         fallback also throws an error
// Expected:
//   - Error from fallback model is re-thrown
//   - Caller receives the error (can surface it to the user)
```

---

### Case 9 — PRIMARY_MODEL and FALLBACK_MODEL constants

```ts
// Simple sanity checks:
expect(PRIMARY_MODEL).toBe("gemini-3.6-flash");
expect(FALLBACK_MODEL).toBe("gemini-3.5-flash");
```

---

### Case 10 — `fallbackUntil` is set to next midnight UTC (not arbitrary)

```ts
// After triggering a daily 429:
// - Compute what "next midnight UTC" should be at test-run time
// - Assert fallbackUntil is within 1 second of that value
// This ensures the reset time is always midnight UTC, not e.g. 24h from now
```

---

## Error Shape Used in Tests

The daily quota error mock should match the structure the real Gemini API sends:

```ts
const dailyQuotaError = {
  status: 429,
  message: JSON.stringify({
    error: {
      code: 429,
      message: "You exceeded your current quota...",
      status: "RESOURCE_EXHAUSTED",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          violations: [{
            quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaDimensions: { location: "global", model: "gemini-3.6-flash" },
          }]
        },
        {
          "@type": "type.googleapis.com/google.rpc.RetryInfo",
          retryDelay: "86400s"   // 24 hours → clearly daily
        }
      ]
    }
  })
};

const perMinuteQuotaError = {
  status: 429,
  message: JSON.stringify({
    error: {
      status: "RESOURCE_EXHAUSTED",
      details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "43s" }]
    }
  })
};
```

---

## Required Change to `_gemini.ts` Before Writing Tests

Add a test-only reset export:

```ts
/** FOR TESTING ONLY — resets circuit breaker state between test cases. */
export function resetCircuitBreakerForTesting(): void {
  primaryBlocked = false;
  fallbackUntil = null;
}
```

This must be called in each test's `beforeEach` to prevent state leaking between cases.

---

## Test Matrix Summary

| Case | primaryBlocked start | fallbackUntil | Primary behaviour | Fallback called? | Expected outcome |
|---|---|---|---|---|---|
| 1 | false | null | ✅ success | No | Primary result returned |
| 2 | false | null | ❌ daily 429 | Yes ✅ | Fallback result, breaker tripped |
| 3 | true | future | — | Yes ✅ | Fallback result directly |
| 4 | true | **past** | ✅ success | No | Primary result, breaker reset |
| 5 | true | **past** | ❌ daily 429 | Yes ✅ | Fallback result, breaker re-tripped |
| 6 | false | null | ❌ per-minute 429 | No | Error re-thrown |
| 7 | false | null | ❌ network error | No | Error re-thrown |
| 8 | true | future | — | ❌ fails | Error re-thrown |
| 9 | — | — | — | — | Constant values correct |
| 10 | false | null | ❌ daily 429 | Yes ✅ | `fallbackUntil` = next midnight UTC |

---

## What Is NOT Tested Here

| Concern | Reason |
|---|---|
| Real Gemini API responses | Integration test territory — requires live API key, not suitable for unit tests |
| Vercel cold-start state reset | Infrastructure behaviour, not testable at the code level |
| Concurrent requests | Out of scope for now; the state is not mutex-protected (single-threaded Node.js) |

---

## Estimated Effort

| Task | Time |
|---|---|
| Add `resetCircuitBreakerForTesting()` to `_gemini.ts` | 5 min |
| Write mock `ai` helper | 15 min |
| Write all 10 test cases | ~45 min |
| **Total** | **~1 hour** |
