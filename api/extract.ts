import { Type } from "@google/genai";
import { getGeminiClient, generateWithFallback } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { description } = req.body || {};
    const trimmed = typeof description === "string" ? description.trim() : "";

    const chitchatRegex = /^(hi+|hello|hey+|greetings|good\s*(morning|afternoon|evening|day)|test|demo|howdy|what'?s?\s*up|yo|help|yes|no|how\s+are\s+you|who\s+are\s+you|what\s+is|tell\s+me)\b/i;
    if (!trimmed || trimmed.length < 15 || chitchatRegex.test(trimmed)) {
      return res.status(400).json({
        error: "Please enter a real description of a decision problem (e.g. 'Choosing between iPhone 16, Samsung S24, and Pixel 9 based on price, battery life, and camera quality'). General chatter or short questions do not contain options or evaluation factors."
      });
    }

    const ai = getGeminiClient();
    const systemPrompt = 
      "You are a strict decision parsing validator and extraction engine. " +
      "FIRST, evaluate if the user's text describes a genuine decision problem or selection task between multiple options/alternatives. " +
      "If the input is general chitchat (e.g. 'How are you today?'), a non-decision question, or lacks a real decision context, set 'is_valid_decision' to FALSE and explain why in 'validation_error'. " +
      "STRICT MANDATE: Extract ONLY criteria and alternatives that are EXPLICITLY mentioned or directly referenced in the user's prompt. " +
      "DO NOT invent, hallucinate, or insert default criteria (such as 'Price', 'Performance', or 'Cost') if the user did NOT mention them in their description. " +
      "If the text mentions only 1 criterion or fewer than 2 alternatives, set 'is_valid_decision' to FALSE and explain in 'validation_error' that multi-criteria decision making requires at least 2 options and at least 2 criteria to evaluate trade-offs. " +
      "Do NOT perform any math, calculation, or ranking. " +
      "CRITICAL MANDATE: EVERY SINGLE CRITERION MUST HAVE AN EXPLICIT UNIT OF MEASURE ('unit' field). NEVER leave 'unit' empty or null. " +
      "For qualitative or score-based criteria (such as Camera Quality, Software Smoothness, Design, Comfort, Ease of Use, Quality), ALWAYS assign unit as 'pts (1-10)'.";

    let text: string | null = null;
    let lastAiError: string | null = null;
    try {
      const response = await generateWithFallback(ai, {
        contents: `Analyze and extract the decision-making elements from the description below:\n\n"${description}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_valid_decision: {
                type: Type.BOOLEAN,
                description: "Set to TRUE ONLY if the text describes a genuine decision task with at least 2 explicitly mentioned options and at least 2 explicitly mentioned evaluation factors. Set to FALSE if options or factors are missing or if it's chitchat."
              },
              validation_error: {
                type: Type.STRING,
                description: "If is_valid_decision is false, provide a polite, specific explanation detailing what is missing (e.g. 'You listed options but only 1 factor (battery life). Please include at least 2 factors to compare trade-offs')."
              },
              decision_goal: {
                type: Type.STRING,
                description: "A clear, concise, short title or goal of the decision, e.g., 'Choosing a Laptop'."
              },
              alternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "The options explicitly mentioned in the text. Do NOT invent options."
              },
              criteria: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "The name of the evaluation criterion explicitly mentioned in the text."
                    },
                    type: {
                      type: Type.STRING,
                      enum: ["benefit", "cost"],
                      description: "Criterion type: Use 'benefit' if higher values are better. Use 'cost' if lower values are better (e.g. price, risk)."
                    },
                    unit: {
                      type: Type.STRING,
                      description: "The preferred measurement unit for this criterion, e.g., '$', 'hrs', 'GB', '%', or 'points'. Default to 'points' if qualitative or unknown."
                    }
                  },
                  required: ["name", "type", "unit"]
                },
                description: "The criteria explicitly mentioned in the text. DO NOT fabricate unmentioned criteria."
              }
            },
            required: ["is_valid_decision", "decision_goal", "alternatives", "criteria"]
          }
        }
      });
      text = response.text || null;
    } catch (aiErr: any) {
      console.warn("AI extraction call failed:", aiErr?.message || aiErr);
      lastAiError = aiErr?.message || "Gemini API extraction request failed.";
    }

    if (!text) {
      return res.status(500).json({
        error: lastAiError || "Gemini AI extraction service is currently unavailable. Please verify your GEMINI_API_KEY in Vercel settings."
      });
    }

    const data = JSON.parse(text);

    if (data.is_valid_decision === false) {
      return res.status(400).json({
        error: data.validation_error || "Your description does not contain enough decision elements. Please describe a decision with at least 2 options and 2 evaluation factors (e.g., 'Choosing between Laptop A and Laptop B based on price and battery life')."
      });
    }

    const alternatives = data.alternatives || [];
    const criteria = data.criteria || [];

    if (alternatives.length < 2 || criteria.length < 2) {
      const foundAlts = alternatives.length > 0 ? alternatives.join(", ") : "none";
      const foundCrits = criteria.length > 0 ? criteria.map((c: any) => c.name).join(", ") : "none";
      return res.status(400).json({
        error: `Incomplete decision prompt. Detected ${alternatives.length} option(s) [${foundAlts}] and ${criteria.length} factor(s) [${foundCrits}]. Multi-criteria decision analysis requires at least 2 options and 2 evaluation criteria to compare trade-offs. Please revise your description to include at least one more factor (e.g. Price, Weight, or Performance).`
      });
    }

    criteria.forEach((c: any) => {
      if (!c.unit || typeof c.unit !== "string" || !c.unit.trim()) {
        const nameLower = (c.name || "").toLowerCase();
        if (nameLower.includes("price") || nameLower.includes("cost")) c.unit = "$";
        else if (nameLower.includes("battery") || nameLower.includes("life")) c.unit = "hrs";
        else if (nameLower.includes("storage") || nameLower.includes("ram")) c.unit = "GB";
        else c.unit = "pts (1-10)";
      } else {
        const u = c.unit.trim();
        const uLower = u.toLowerCase();
        if (uLower === "points" || uLower === "pts" || uLower === "score") {
          c.unit = "pts (1-10)";
        } else {
          c.unit = u;
        }
      }
    });

    if (alternatives.length > 6) {
      data.alternatives = alternatives.slice(0, 6);
    }
    if (criteria.length > 10) {
      data.criteria = criteria.slice(0, 10);
    }

    res.json(data);
  } catch (err: any) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: err.message || "An error occurred during extraction." });
  }
}
