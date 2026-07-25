# Known Issues & Troubleshooting Log

---

## 📌 Issue #1: "The server encountered an error. Please try again in a few seconds."

### Date Identified
July 24, 2026

### Date Resolved
July 25, 2026

### Symptoms
When clicking **"Extract Decision Elements"**, the application displayed:
> ❌ *The server encountered an error. Please try again in a few seconds.*

The server returned HTTP 500, and the frontend in [`NaturalLanguageStep.tsx`](./src/components/NaturalLanguageStep.tsx) caught the 500 and displayed the generic error banner.

---

### Original (Incorrect) Diagnosis

The initial hypothesis was:
- The primary model `gemini-3.6-flash` had exhausted its daily request quota.
- The circuit breaker in [`api/_gemini.ts`](./api/_gemini.ts) fell back to `FALLBACK_MODEL = "gemini-3.5-flash"`.
- `gemini-3.5-flash` was assumed to be an invalid/nonexistent model ID, returning `404 Invalid Model`.

**This diagnosis was wrong.** It was based on inference from the UI error alone — no raw HTTP status or error body was being logged at the time. The theory was investigated and ruled out via diagnostic logging (see below).

---

### Actual Root Cause Analysis

#### Root Cause 1 — Leaked API key, revoked by Google (primary)

An earlier commit (`1b6f25f`, `feat(ai): add prompt validation and standardize criteria units`) hardcoded the `GEMINI_API_KEY` value directly in `server.ts` as a fallback:

```typescript
// Committed to git history in 1b6f25f (later removed in 32dcaed):
const apiKey = process.env.GEMINI_API_KEY || "AQ.***REDACTED-REVOKED-KEY***";
```

GitHub's automated secret scanning detected this key in the public git history and reported it to Google, which revoked it. All subsequent API calls using that key returned:

```json
{ "error": { "code": 403, "message": "Your API key was reported as leaked. Please use another API key.", "status": "PERMISSION_DENIED" } }
```

This was confirmed by adding diagnostic logging to `generateWithFallback()` in [`api/_gemini.ts`](./api/_gemini.ts), which revealed `err.status = 403` — not a quota error, not a 404.

Because `403 PERMISSION_DENIED` does not match `isQuotaError()` (no 429, no quota-related keywords), the circuit breaker **never tripped** and the fallback to `gemini-3.5-flash` was **never attempted**. The error was re-thrown immediately to the caller, producing HTTP 500.

#### Root Cause 2 — `dotenv` override bug (contributing factor, delayed the fix)

After rotating to a new API key and creating a local `.env` file, the server still returned 403. Investigation revealed that `server.ts` was calling:

```typescript
dotenv.config();  // ← no override option
```

`dotenv.config()` without `override: true` silently skips any variable already present in the process environment. A stale `GEMINI_API_KEY` from a Windows User environment variable (set at an earlier time) was present in the shell session and took silent precedence over the `.env` file. The server log showed `injected env (0) from .env`, confirming zero variables were loaded from the file.

---

### Corrective Actions Taken

1. **Key rotation**: Generated a new `GEMINI_API_KEY` in Google AI Studio. Added it to:
   - Vercel environment variables (for production)
   - Local `.env` file (for local development)

2. **Removed stale Windows User environment variable**:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", $null, "User")
   ```

3. **Fixed `dotenv` to override pre-existing env vars** in [`server.ts`](./server.ts):
   ```typescript
   // BEFORE:
   dotenv.config();

   // AFTER:
   dotenv.config({ override: true }); // .env always wins over shell/system env vars
   ```

4. **Added diagnostic logging** to [`api/_gemini.ts`](./api/_gemini.ts) `generateWithFallback()` to surface the raw HTTP status code and full error body from Google on any future API failure (previously, non-quota errors were silently re-thrown with no logging).

5. **Fixed dead `err.code` check** in `isQuotaError()`: added a comment noting `err.code` is unreachable under `@google/genai` v2.13.0+, which only exposes `.status`, `.message`, `.name`, and `.stack` on `ApiError`.

---

### Verification

After all corrective actions, the server log showed:

```
◇ injected env (1) from .env     ← 1 variable loaded (was 0 before)
Server running on http://localhost:3000
```

A live `POST /api/extract` test returned a valid structured JSON response with no errors — the new key is working correctly both locally and on Vercel.

---

### Open / Unconfirmed Items (Low Priority)

- **`FALLBACK_MODEL = "gemini-3.5-flash"` correctness**: The original theory that this model ID is invalid was never confirmed or denied. Because the 403 error fired before the circuit breaker could activate, the fallback model was never tested under real daily quota exhaustion. This remains unverified but is considered low priority — if `gemini-3.6-flash` actually hits its daily quota in future, the diagnostic logging will surface whether the fallback model ID is valid.

- **Git history contains the revoked key**: Commits `1b6f25f` and `32dcaed` in the repo still contain the old hardcoded key in their diffs. The key is already revoked, and the repo is private, so this is low risk. A future `git filter-repo` history rewrite + force-push would clean it up completely.
