/**
 * _gemini.ts — Shared Gemini AI client with daily quota circuit breaker.
 *
 * Circuit breaker behaviour (daily quota only):
 *  - When gemini-3.6-flash returns a RESOURCE_EXHAUSTED error that indicates the
 *    DAILY quota is exhausted, the breaker trips and all subsequent requests are
 *    routed directly to the fallback model (gemini-3.5-flash) for the rest of
 *    that UTC day.
 *  - At midnight UTC the breaker resets automatically and the next request will
 *    try gemini-3.6-flash again.
 *  - If the fallback model also fails the error is re-thrown to the caller.
 *
 * Per-minute / per-token-minute limits are NOT handled here; those are
 * transient (< 60 s) and the caller should surface a friendly message to
 * the user asking them to retry shortly.
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PRIMARY_MODEL = "gemini-3.6-flash";
export const FALLBACK_MODEL = "gemini-3.5-flash";

// ---------------------------------------------------------------------------
// Circuit-breaker state  (module-level singleton — lives for the lifetime of
// the Node.js process / Vercel function warm instance)
// ---------------------------------------------------------------------------

let primaryBlocked = false;
let fallbackUntil: Date | null = null;

/** Returns true when the primary model is currently blocked by the circuit breaker. */
function isPrimaryBlocked(): boolean {
  if (!primaryBlocked || !fallbackUntil) return false;

  // Auto-reset: if we are past the reset time, unblock the primary model.
  if (new Date() >= fallbackUntil) {
    primaryBlocked = false;
    fallbackUntil = null;
    console.log("[gemini] Circuit breaker reset — retrying primary model.");
    return false;
  }

  return true;
}

/** Trips the circuit breaker until midnight UTC tonight. */
function tripCircuitBreaker(): void {
  const now = new Date();
  const nextMidnightUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  primaryBlocked = true;
  fallbackUntil = nextMidnightUTC;
  console.warn(
    `[gemini] Daily quota exhausted on ${PRIMARY_MODEL}. ` +
    `Switching to ${FALLBACK_MODEL} until ${nextMidnightUTC.toISOString()}.`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the shared Gemini client (throws if API key is missing). */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

/** Returns true when an error represents any rate-limit or quota exhaustion. */
export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : String(err.message || JSON.stringify(err) || "");
  const lowerMsg = msg.toLowerCase();
  return (
    err.status === 429 ||
    err.code === 429 ||
    lowerMsg.includes("429") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("limit") ||
    lowerMsg.includes("rate") ||
    lowerMsg.includes("free_tier")
  );
}

/**
 * Returns true when a caught error looks like a DAILY quota exhaustion.
 * Gemini daily-quota errors are 429 / RESOURCE_EXHAUSTED and carry a long
 * retryDelay (hours) or quota dimension that references "day".
 */
function isDailyQuotaError(err: any): boolean {
  if (!isQuotaError(err)) return false;
  const msg = typeof err === "string" ? err : String(err.message || JSON.stringify(err) || "");
  const lowerMsg = msg.toLowerCase();

  // If the error message explicitly mentions "day" quota or free_tier it is a daily quota hit.
  if (
    lowerMsg.includes("per_day") ||
    lowerMsg.includes("per day") ||
    lowerMsg.includes("daily") ||
    lowerMsg.includes("free_tier") ||
    lowerMsg.includes("generate_content_free_tier")
  ) {
    return true;
  }

  // Gemini includes a retryDelay field in the error details.
  // A delay > 5 minutes strongly indicates a daily (not per-minute) quota hit.
  try {
    const retryDelayMatch = lowerMsg.match(/"retrydelay"\s*:\s*"(\d+)s"/i);
    if (retryDelayMatch) {
      const seconds = parseInt(retryDelayMatch[1], 10);
      return seconds > 300; // > 5 minutes → treat as daily
    }
  } catch {
    // ignore parse errors
  }

  // Default: assume quota error on free tier is a daily quota exhaustion
  return true;
}

// ---------------------------------------------------------------------------
// Main export — drop-in replacement for generateContentWithRetry
// ---------------------------------------------------------------------------

/**
 * Generates content using the primary model (gemini-3.6-flash) with automatic
 * daily-quota fallback to gemini-3.5-flash.
 *
 * @param ai      - GoogleGenAI client
 * @param params  - generateContent params (WITHOUT the `model` field)
 * @returns       - generateContent response
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<any, "model">
): Promise<any> {

  // --- Decide which model to start with ---
  const startWithFallback = isPrimaryBlocked();
  const firstModel  = startWithFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
  const secondModel = startWithFallback ? null : FALLBACK_MODEL;

  // --- First attempt ---
  try {
    return await ai.models.generateContent({ ...params, model: firstModel });
  } catch (firstErr: any) {
    // -------------------------------------------------------------------------
    // DIAGNOSTIC LOGGING — logs the raw HTTP status, error code, and full error
    // object so we can see exactly what Google returned instead of guessing.
    // TODO: Remove this block once the root cause is confirmed.
    // -------------------------------------------------------------------------
    console.error(
      `[gemini] ⚠ DIAGNOSTIC — ${firstModel} threw an error:`,
      "\n  status     :", firstErr?.status ?? firstErr?.code ?? "(none)",
      "\n  httpStatus :", firstErr?.httpStatusCode ?? firstErr?.statusCode ?? "(none)",
      "\n  message    :", firstErr?.message ?? "(none)",
      "\n  errorCode  :", firstErr?.errorCode ?? firstErr?.error?.code ?? "(none)",
      "\n  fullError  :", JSON.stringify(firstErr, Object.getOwnPropertyNames(firstErr), 2)
    );

    // If we started on the fallback already, re-throw — nothing more to try.
    if (startWithFallback) throw firstErr;

    // Check if this is a daily quota error on the primary model.
    if (isDailyQuotaError(firstErr) && secondModel) {
      tripCircuitBreaker();

      // --- Second attempt on fallback model ---
      try {
        console.warn(`[gemini] Retrying request with fallback model ${secondModel}...`);
        return await ai.models.generateContent({ ...params, model: secondModel });
      } catch (fallbackErr: any) {
        // -----------------------------------------------------------------------
        // DIAGNOSTIC LOGGING — same as above, for the fallback model.
        // TODO: Remove this block once the root cause is confirmed.
        // -----------------------------------------------------------------------
        console.error(
          `[gemini] ⚠ DIAGNOSTIC — ${secondModel} (fallback) also threw an error:`,
          "\n  status     :", fallbackErr?.status ?? fallbackErr?.code ?? "(none)",
          "\n  httpStatus :", fallbackErr?.httpStatusCode ?? fallbackErr?.statusCode ?? "(none)",
          "\n  message    :", fallbackErr?.message ?? "(none)",
          "\n  errorCode  :", fallbackErr?.errorCode ?? fallbackErr?.error?.code ?? "(none)",
          "\n  fullError  :", JSON.stringify(fallbackErr, Object.getOwnPropertyNames(fallbackErr), 2)
        );
        console.error(`[gemini] Fallback model ${secondModel} also failed:`, fallbackErr?.message || fallbackErr);
        // Both models failed — re-throw the fallback error.
        throw fallbackErr;
      }
    }

    // Non-quota error (network, auth, etc.) — re-throw as-is.
    // NOTE: The DIAGNOSTIC block above will have already printed the full error.
    throw firstErr;
  }
}

