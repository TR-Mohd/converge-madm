import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = String(err?.message || err || "");
      const is429 = err?.status === 429 || err?.status === "RESOURCE_EXHAUSTED" || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < maxRetries) {
        attempt++;
        let delayMs = 6500;
        const match = errMsg.match(/retry in\s*(\d+(?:\.\d+)?)s/i);
        if (match) {
          delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 500;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { decision_goal, alternatives, criteria, weights, rankings, user_prompt } = req.body || {};

    const ai = getGeminiClient();

    const rankingStr = (rankings || []).map((r: any, idx: number) => 
      `${idx + 1}. ${r.alternative} (TOPSIS Score: ${(r.score * 100).toFixed(1)}%)`
    ).join("\n");

    const weightsStr = (criteria || []).map((c: any, idx: number) => 
      `- ${c.name} (${c.type}): ${((weights?.[idx] || 0) * 100).toFixed(1)}%`
    ).join("\n");

    const promptMessage = `The user is making a decision: "${decision_goal}".
The initial user input was: "${user_prompt}"

Based on the Analytic Hierarchy Process (AHP), the user-weighted criteria priorities are:
${weightsStr}

Using the TOPSIS algorithm (Technique for Order of Preference by Similarity to Ideal Solution), the final rankings are:
${rankingStr}

Please write a friendly, helpful, and highly insightful analytical summary of why the top alternative won, referencing the user's specific priorities and trade-offs. Highlight how the winner excelled on key criteria and how it compares to runner-ups. Format the response with elegant Markdown. Keep it to 2-3 brief, highly readable paragraphs or bullet points.`;

    let summaryText = "";
    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.0-flash",
        contents: promptMessage,
        config: {
          systemInstruction: "You are a professional decision advisor. Write a friendly, analytical, and concise evaluation of the MADM results. Focus on explaining trade-offs clearly without technical jargon."
        }
      });
      summaryText = response.text || "";
    } catch (err: any) {
      console.warn("Summarize call quota warning:", err?.message || err);
      const topWinner = rankings?.[0]?.alternative || "the top choice";
      summaryText = `### Analytical Summary\n\nBased on your weighted criteria preferences, **${topWinner}** emerged as the optimal decision choice according to the TOPSIS algorithm.\n\nIt achieved the highest relative closeness score to the ideal benchmark while minimizing performance drawbacks across your most heavily weighted factors.`;
    }

    res.json({ summary: summaryText });
  } catch (err: any) {
    console.error("Summarization error:", err);
    res.status(500).json({ error: err.message || "An error occurred during summarization." });
  }
}
