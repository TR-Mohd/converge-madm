import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash if key is missing on start
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to extract structured decision data from plain text
app.post("/api/extract", async (req: any, res: any) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "Please enter a valid description of your decision." });
    }

    const ai = getGeminiClient();
    const systemPrompt = 
      "You are a precise data extraction engine. Extract structural decision-making data from the user's description. " +
      "Do NOT perform any math, calculation, or ranking. Do NOT compute any numbers or scores. " +
      "Extract strictly the named alternatives (up to 6) and key evaluation criteria (at least 2) with benefit/cost classification.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Extract the decision-making elements from the description below:\n\n"${description}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision_goal: {
              type: Type.STRING,
              description: "A clear, concise, short title or goal of the decision, e.g., 'Choosing a Programming Laptop' or 'Hospital Selection'."
            },
            alternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of options/alternatives mentioned in the text. Extract at most 6 alternatives."
            },
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "The name of the evaluation criterion, e.g., 'Price', 'Battery Life', 'Safety'."
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
              description: "The key criteria to evaluate the alternatives. Extract at least 2 criteria."
            }
          },
          required: ["decision_goal", "alternatives", "criteria"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const data = JSON.parse(text);

    const alternatives = data.alternatives || [];
    const criteria = data.criteria || [];

    // Enforce constraints
    if (alternatives.length > 6) {
      data.alternatives = alternatives.slice(0, 6);
    }

    if (alternatives.length < 1) {
      return res.status(400).json({
        error: "We couldn't detect any alternatives (options) in your text. Please list at least one option to compare."
      });
    }

    if (criteria.length < 2) {
      return res.status(400).json({
        error: "Decision making requires at least 2 criteria (e.g., price and performance). Please add more details about what you care about."
      });
    }

    res.json(data);
  } catch (err: any) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: err.message || "An error occurred during extraction." });
  }
});

// API endpoint to auto-fill performance scores with web-search grounded real-world data
app.post("/api/auto-fill", async (req: any, res: any) => {
  try {
    const { alternatives, criteria, decision_goal } = req.body;
    if (!alternatives || !criteria || !Array.isArray(alternatives) || !Array.isArray(criteria)) {
      return res.status(400).json({ error: "Missing or invalid alternatives/criteria list." });
    }

    const ai = getGeminiClient();
    const promptMessage = `We are comparing the following options: [${alternatives.join(", ")}]
for the decision goal: "${decision_goal || "My Decision Goal"}".

For each option, please find real, actual performance metrics for the following criteria:
${criteria.map((c: any) => `- ${c.name} (type: ${c.type}, preferred unit: ${c.unit || "auto"})`).join("\n")}

Please use Google Search to pull accurate, honest, real-world data from the internet.
Return a 2D array of values where the outer array corresponds exactly to the alternatives in order, and the inner array corresponds exactly to the criteria in order.
Each value should be a string containing the numeric metric and the unit (e.g., "$999", "14 hrs", "1200 px", or a rating like "8.5" or "8.5/10" if qualitative). Ensure that you DO NOT write letters/words like 'hours' or 'dollars' unless they are standard concise units like '$', 'hrs', 'GB'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini for auto-fill.");
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err: any) {
    console.error("Auto-fill API error:", err);
    res.status(500).json({ error: err.message || "An error occurred during AI auto-fill." });
  }
});

// API endpoint to generate the final analytical summary
app.post("/api/summarize", async (req: any, res: any) => {
  try {
    const { decision_goal, alternatives, criteria, weights, rankings, user_prompt } = req.body;

    const ai = getGeminiClient();

    const rankingStr = rankings.map((r: any, idx: number) => 
      `${idx + 1}. ${r.alternative} (TOPSIS Score: ${(r.score * 100).toFixed(1)}%)`
    ).join("\n");

    const weightsStr = criteria.map((c: any, idx: number) => 
      `- ${c.name} (${c.type}): ${(weights[idx] * 100).toFixed(1)}%`
    ).join("\n");

    const promptMessage = `The user is making a decision: "${decision_goal}".
The initial user input was: "${user_prompt}"

Based on the Analytic Hierarchy Process (AHP), the user-weighted criteria priorities are:
${weightsStr}

Using the TOPSIS algorithm (Technique for Order of Preference by Similarity to Ideal Solution), the final rankings are:
${rankingStr}

Please write a friendly, helpful, and highly insightful analytical summary of why the top alternative won, referencing the user's specific priorities and trade-offs. Highlight how the winner excelled on key criteria and how it compares to runner-ups. Format the response with elegant Markdown. Keep it to 2-3 brief, highly readable paragraphs or bullet points.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: "You are a professional decision advisor. Write a friendly, analytical, and concise evaluation of the MADM results. Focus on explaining trade-offs clearly without technical jargon."
      }
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error("Summarization error:", err);
    res.status(500).json({ error: err.message || "An error occurred during summarization." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
