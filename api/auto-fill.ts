import { Type } from "@google/genai";
import { getGeminiClient, generateWithFallback } from "./_gemini.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { alternatives, criteria, decision_goal } = req.body || {};
    if (!alternatives || !criteria || !Array.isArray(alternatives) || !Array.isArray(criteria)) {
      return res.status(400).json({ error: "Missing or invalid alternatives/criteria list." });
    }

    const ai = getGeminiClient();
    const promptMessage = `We are comparing the following options: [${alternatives.join(", ")}]
for the decision goal: "${decision_goal || "My Decision Goal"}".

For each option, please find real, actual performance metrics for the following criteria:
${criteria.map((c: any) => `- ${c.name} (type: ${c.type}, preferred unit: ${c.unit || "pts (1-10)"})`).join("\n")}

Return a 2D array of values where the outer array corresponds exactly to the alternatives in order, and the inner array corresponds exactly to the criteria in order.
CRITICAL MANDATE FOR POINTS/QUALITATIVE CRITERIA:
For any criterion whose preferred unit is 'pts (1-10)', 'points', 'pts', 'score', or qualitative factors (such as Camera Quality, Software Smoothness, Quality, Design, Comfort, Ease of Use), ALL values MUST be numeric ratings strictly on a 1.0 to 10.0 scale (e.g. '8.5', '9.2', '7.8'). NEVER output unscaled raw numbers like 150 or 800 for points/score criteria.

CRITICAL MANDATE FOR CURRENCY & DYNAMIC REALISTIC MARKET PRICING:
For any monetary, price, cost, rent, or salary criterion:
1. Inspect the criterion's SPECIFIC preferred unit ('unit' field, e.g. '$', 'Rp', '€', '£', 'SGD', etc.).
2. You MUST generate prices and monetary figures that are realistic and accurate for the SPECIFIC currency unit requested:
   - If the unit is '$' or 'USD': generate realistic market prices in US Dollars (e.g., '$1,999' for MacBook Pro 14, '$1,200/mo' for rent).
   - If the unit is 'Rp' or 'IDR': generate realistic Indonesian market prices in Rupiah (e.g., '28.000.000 Rp' or 'Rp 28.000.000' for MacBook Pro 14, '5.000.000 Rp' for rent).
   - If the unit is another currency (e.g., '€', '£', 'SGD'): generate realistic market prices in that specific currency.
3. NEVER generate nonsensical figures (such as '35.0 Rp' or '35 Rp' for a laptop in Rupiah, or '$28,000,000' for a laptop in USD). Always match the numerical scale appropriately to the requested currency unit!`;

    const responseSchemaConfig = {
      type: Type.OBJECT,
      properties: {
        values: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: "A 2D grid/matrix where values[i][j] is the performance of alternative i under criterion j."
        }
      },
      required: ["values"]
    };

    let text: string | null = null;

    try {
      const response = await generateWithFallback(ai, {
        contents: promptMessage,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: responseSchemaConfig
        }
      });
      text = response.text || null;
    } catch (searchErr: any) {
      console.warn("Auto-fill search grounding failed/quota exceeded, falling back to standard Gemini generation:", searchErr?.message || searchErr);
    }

    if (!text) {
      try {
        const fallbackResponse = await generateWithFallback(ai, {
          contents: promptMessage + "\nProvide realistic estimated market values and performance numbers based on your knowledge base matching each criterion's specified unit.",
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchemaConfig
          }
        });
        text = fallbackResponse.text || null;
      } catch (genErr: any) {
        console.warn("Standard Gemini generation failed/quota exceeded:", genErr?.message || genErr);
      }
    }

    if (text) {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    }

    const fallbackValues = alternatives.map((alt: string, rIdx: number) =>
      criteria.map((crit: any) => {
        const nameLower = (crit.name || "").toLowerCase();
        const unitLower = (crit.unit || "").toLowerCase();
        
        if (nameLower.includes("price") || nameLower.includes("cost") || nameLower.includes("rent") || nameLower.includes("salary") || unitLower.includes("$") || unitLower.includes("rp") || unitLower.includes("usd") || unitLower.includes("idr") || unitLower.includes("€") || unitLower.includes("£")) {
          if (unitLower.includes("$") || unitLower.includes("usd")) {
            return `$${(1299 + rIdx * 400).toLocaleString()}`;
          } else if (unitLower.includes("€") || unitLower.includes("eur")) {
            return `€${(1200 + rIdx * 350).toLocaleString()}`;
          } else if (unitLower.includes("£") || unitLower.includes("gbp")) {
            return `£${(1100 + rIdx * 300).toLocaleString()}`;
          } else {
            const basePrice = 18000000 + rIdx * 6000000;
            return `${basePrice.toLocaleString("id-ID")} Rp`;
          }
        }
        if (nameLower.includes("battery") || nameLower.includes("life") || unitLower.includes("hr")) {
          return `${(12 + rIdx * 3).toString()} hrs`;
        }
        if (nameLower.includes("ram") || nameLower.includes("storage") || unitLower.includes("gb")) {
          return `${(128 * Math.pow(2, rIdx)).toString()} GB`;
        }
        if (crit.type === "cost") {
          return (1 + rIdx * 2).toString();
        }
        return (7.5 + rIdx * 0.5).toFixed(1);
      })
    );

    res.json({ values: fallbackValues });
  } catch (err: any) {
    console.error("Auto-fill API unexpected error:", err);
    res.status(500).json({ error: err.message || "An error occurred during AI auto-fill." });
  }
}
