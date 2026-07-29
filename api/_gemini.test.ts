import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateWithFallback,
  resetCircuitBreakerForTesting,
  PRIMARY_MODEL,
  FALLBACK_MODEL,
} from "./_gemini";

function mockAi(
  primaryBehavior: "succeed" | "daily429" | "perMinute429" | "other-error",
  fallbackBehavior: "succeed" | "fail" = "succeed"
) {
  const generateContentMock = vi.fn(async (params: any) => {
    if (params.model === PRIMARY_MODEL) {
      if (primaryBehavior === "succeed") {
        return { text: "primary-success", model: PRIMARY_MODEL };
      }
      if (primaryBehavior === "daily429") {
        const error = new Error("Daily quota exceeded");
        Object.assign(error, {
          status: 429,
          message: JSON.stringify({
            error: {
              code: 429,
              message: "You exceeded your current quota...",
              status: "RESOURCE_EXHAUSTED",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                  violations: [
                    {
                      quotaMetric:
                        "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                      quotaDimensions: { location: "global", model: "gemini-3.6-flash" },
                    },
                  ],
                },
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "86400s",
                },
              ],
            },
          }),
        });
        throw error;
      }
      if (primaryBehavior === "perMinute429") {
        const error = new Error("Per-minute rate limit");
        Object.assign(error, {
          status: 429,
          message: JSON.stringify({
            error: {
              status: "RESOURCE_EXHAUSTED",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "43s",
                },
              ],
            },
          }),
        });
        throw error;
      }
      if (primaryBehavior === "other-error") {
        const error = new Error("500 Internal Server Error");
        Object.assign(error, { status: 500 });
        throw error;
      }
    } else if (params.model === FALLBACK_MODEL) {
      if (fallbackBehavior === "succeed") {
        return { text: "fallback-success", model: FALLBACK_MODEL };
      }
      const error = new Error("Fallback failed");
      Object.assign(error, { status: 500 });
      throw error;
    }
    throw new Error(`Unexpected model: ${params.model}`);
  });

  return {
    ai: {
      models: {
        generateContent: generateContentMock,
      },
    } as any,
    generateContentMock,
  };
}

describe("api/_gemini.ts Circuit Breaker", () => {
  beforeEach(() => {
    resetCircuitBreakerForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("Case 1 — Normal: primary model succeeds", async () => {
    const { ai, generateContentMock } = mockAi("succeed");
    const result = await generateWithFallback(ai, { contents: "test" });

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith({
      contents: "test",
      model: PRIMARY_MODEL,
    });
    expect(result).toEqual({ text: "primary-success", model: PRIMARY_MODEL });
  });

  it("Case 2 — Daily quota hit on primary -> silent fallback", async () => {
    const { ai, generateContentMock } = mockAi("daily429", "succeed");
    const result = await generateWithFallback(ai, { contents: "test" });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(1, {
      contents: "test",
      model: PRIMARY_MODEL,
    });
    expect(generateContentMock).toHaveBeenNthCalledWith(2, {
      contents: "test",
      model: FALLBACK_MODEL,
    });
    expect(result).toEqual({ text: "fallback-success", model: FALLBACK_MODEL });
  });

  it("Case 3 — Subsequent calls while blocked: primary skipped entirely", async () => {
    // First call trips the circuit breaker
    const { ai: firstAi } = mockAi("daily429", "succeed");
    await generateWithFallback(firstAi, { contents: "first" });

    // Second call should skip primary model entirely
    const { ai: secondAi, generateContentMock: secondMock } = mockAi(
      "daily429",
      "succeed"
    );
    const result = await generateWithFallback(secondAi, { contents: "second" });

    expect(secondMock).toHaveBeenCalledTimes(1);
    expect(secondMock).toHaveBeenCalledWith({
      contents: "second",
      model: FALLBACK_MODEL,
    });
    expect(result).toEqual({ text: "fallback-success", model: FALLBACK_MODEL });
  });

  it("Case 4 — Auto-recovery: midnight UTC has passed", async () => {
    vi.useFakeTimers();
    const now = new Date(Date.UTC(2026, 6, 29, 12, 0, 0));
    vi.setSystemTime(now);

    // Trip the breaker at noon UTC
    const { ai: firstAi } = mockAi("daily429", "succeed");
    await generateWithFallback(firstAi, { contents: "first" });

    // Advance system time past midnight UTC
    const pastMidnight = new Date(Date.UTC(2026, 6, 30, 0, 0, 1));
    vi.setSystemTime(pastMidnight);

    // Next call should auto-reset and try primary model again
    const { ai: secondAi, generateContentMock: secondMock } = mockAi("succeed");
    const result = await generateWithFallback(secondAi, { contents: "second" });

    expect(secondMock).toHaveBeenCalledTimes(1);
    expect(secondMock).toHaveBeenCalledWith({
      contents: "second",
      model: PRIMARY_MODEL,
    });
    expect(result).toEqual({ text: "primary-success", model: PRIMARY_MODEL });
  });

  it("Case 5 — Recovery attempt: primary hits daily quota again", async () => {
    vi.useFakeTimers();
    const now = new Date(Date.UTC(2026, 6, 29, 12, 0, 0));
    vi.setSystemTime(now);

    // Trip breaker first time
    const { ai: firstAi } = mockAi("daily429", "succeed");
    await generateWithFallback(firstAi, { contents: "first" });

    // Advance past midnight UTC so it auto-resets
    const pastMidnight = new Date(Date.UTC(2026, 6, 30, 0, 0, 1));
    vi.setSystemTime(pastMidnight);

    // Primary throws daily429 again -> breaker re-trips and uses fallback
    const { ai: secondAi, generateContentMock: secondMock } = mockAi(
      "daily429",
      "succeed"
    );
    const result = await generateWithFallback(secondAi, { contents: "retry" });

    expect(secondMock).toHaveBeenCalledTimes(2);
    expect(secondMock).toHaveBeenNthCalledWith(1, {
      contents: "retry",
      model: PRIMARY_MODEL,
    });
    expect(secondMock).toHaveBeenNthCalledWith(2, {
      contents: "retry",
      model: FALLBACK_MODEL,
    });
    expect(result).toEqual({ text: "fallback-success", model: FALLBACK_MODEL });
  });

  it("Case 6 — Per-minute or non-daily error: fallback NOT triggered", async () => {
    const { ai, generateContentMock } = mockAi("perMinute429", "succeed");

    await expect(generateWithFallback(ai, { contents: "test" })).rejects.toThrow(
      /RESOURCE_EXHAUSTED/
    );

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith({
      contents: "test",
      model: PRIMARY_MODEL,
    });

    // Verify circuit breaker was NOT tripped by making a subsequent call
    const { ai: nextAi, generateContentMock: nextMock } = mockAi("succeed");
    const result = await generateWithFallback(nextAi, { contents: "after" });
    expect(nextMock).toHaveBeenCalledWith({
      contents: "after",
      model: PRIMARY_MODEL,
    });
    expect(result).toEqual({ text: "primary-success", model: PRIMARY_MODEL });
  });

  it("Case 7 — Non-quota error on primary: re-thrown as-is", async () => {
    const { ai, generateContentMock } = mockAi("other-error", "succeed");

    await expect(generateWithFallback(ai, { contents: "test" })).rejects.toThrow(
      "500 Internal Server Error"
    );

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith({
      contents: "test",
      model: PRIMARY_MODEL,
    });
  });

  it("Case 8 — Both models fail", async () => {
    const { ai, generateContentMock } = mockAi("daily429", "fail");

    await expect(generateWithFallback(ai, { contents: "test" })).rejects.toThrow(
      "Fallback failed"
    );

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock).toHaveBeenNthCalledWith(1, {
      contents: "test",
      model: PRIMARY_MODEL,
    });
    expect(generateContentMock).toHaveBeenNthCalledWith(2, {
      contents: "test",
      model: FALLBACK_MODEL,
    });
  });

  it("Case 9 — PRIMARY_MODEL and FALLBACK_MODEL constants", () => {
    expect(PRIMARY_MODEL).toBe("gemini-3.6-flash");
    expect(FALLBACK_MODEL).toBe("gemini-3.5-flash");
  });

  it("Case 10 — fallbackUntil is set to next midnight UTC (not arbitrary)", async () => {
    vi.useFakeTimers();
    const now = new Date(Date.UTC(2026, 6, 29, 15, 30, 0));
    vi.setSystemTime(now);

    const warnSpy = vi.spyOn(console, "warn");
    const { ai } = mockAi("daily429", "succeed");
    await generateWithFallback(ai, { contents: "test" });

    const expectedNextMidnightUTC = new Date(
      Date.UTC(2026, 6, 30, 0, 0, 0)
    );

    expect(warnSpy).toHaveBeenCalled();
    const warnMessage = warnSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(warnMessage).toContain(expectedNextMidnightUTC.toISOString());

    // Before midnight UTC (-1000ms), circuit breaker stays blocked (uses fallback directly)
    vi.setSystemTime(new Date(expectedNextMidnightUTC.getTime() - 1000));
    const { ai: beforeAi, generateContentMock: beforeMock } = mockAi(
      "daily429",
      "succeed"
    );
    await generateWithFallback(beforeAi, { contents: "before-midnight" });
    expect(beforeMock).toHaveBeenCalledTimes(1);
    expect(beforeMock).toHaveBeenCalledWith({
      contents: "before-midnight",
      model: FALLBACK_MODEL,
    });

    // At midnight UTC (+1ms), circuit breaker resets to primary model
    vi.setSystemTime(new Date(expectedNextMidnightUTC.getTime() + 1));
    const { ai: afterAi, generateContentMock: afterMock } = mockAi("succeed");
    await generateWithFallback(afterAi, { contents: "after-midnight" });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(afterMock).toHaveBeenCalledWith({
      contents: "after-midnight",
      model: PRIMARY_MODEL,
    });
  });
});
