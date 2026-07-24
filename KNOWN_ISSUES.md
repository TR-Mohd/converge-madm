# Known Issues & Troubleshooting Log

---

## 📌 Issue #1: "The server encountered an error. Please try again in a few seconds."

### Date Identified
July 24, 2026

### Symptoms
When clicking **"Extract Decision Elements"**, the application displays:
> ❌ *The server encountered an error. Please try again in a few seconds.*

---

### Root Cause Analysis (Proven by Dashboard Screenshot)

1. **Primary Model Daily Quota Exhausted**:
   As shown in your **Google AI Studio Rate Limits Dashboard**, `Gemini 3.6 Flash` reached its daily request limit (**23 RPD / Red bar**).

2. **Model Name Mismatch in Fallback**:
   - The fallback model in [`api/_gemini.ts`](./api/_gemini.ts) was configured as `"gemini-3.5-flash"`.
   - As clearly shown in your Google AI Studio dashboard, the active model tier available in your account is **`Gemini 2.5 Flash`** (`gemini-2.5-flash`), **NOT** `gemini-3.5-flash`.
   - When the circuit breaker attempted to invoke `"gemini-3.5-flash"`, Google's API returned a `404 / 400 Invalid Model` error because the model ID `"gemini-3.5-flash"` does not exist in your Google AI Studio tier.

3. **HTTP 500 & UI Fallback**:
   Because `404 Invalid Model` is a server/request error rather than a `429 Quota` error, `server.ts` returned `HTTP 500`. The frontend in [`NaturalLanguageStep.tsx`](./src/components/NaturalLanguageStep.tsx) caught the 500 status code and displayed the generic error banner.

---

### Solution (To Apply Tomorrow)

In [`api/_gemini.ts`](./api/_gemini.ts), change line 25:

```typescript
// BEFORE:
export const FALLBACK_MODEL = "gemini-3.5-flash";

// AFTER:
export const FALLBACK_MODEL = "gemini-2.5-flash";
```

### Why This Solution Will Work
1. As confirmed by your dashboard, `Gemini 2.5 Flash` is active in your project and has available quota (**RPD: 5 / limit**, RPM: 2/5, TPM: 788/250K).
2. Switching `FALLBACK_MODEL` to `"gemini-2.5-flash"` will allow the circuit breaker to fall back cleanly to `Gemini 2.5 Flash` whenever `Gemini 3.6 Flash` is rate-limited.
