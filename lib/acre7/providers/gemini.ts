import { floorPlanAnalysisPrompt } from "../prompts";
import type { FloorPlanAnalysis, MaterialSelections } from "../types";

const responseSchema = {
  type: "OBJECT",
  properties: {
    projectSummary: { type: "STRING" },
    scale: {
      type: "OBJECT",
      properties: { value: { type: "NUMBER", nullable: true }, unit: { type: "STRING", nullable: true }, confidence: { type: "NUMBER" } },
      required: ["value", "unit", "confidence"],
    },
    rooms: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" }, label: { type: "STRING" }, confidence: { type: "NUMBER" },
          dimensions: { type: "OBJECT", properties: { width: { type: "NUMBER", nullable: true }, length: { type: "NUMBER", nullable: true }, unit: { type: "STRING", nullable: true } } },
          adjacentRoomIds: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["id", "label", "confidence", "dimensions", "adjacentRoomIds"],
      },
    },
    openings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: { type: "STRING" }, type: { type: "STRING", enum: ["door", "window", "opening"] }, connects: { type: "ARRAY", items: { type: "STRING" } }, confidence: { type: "NUMBER" } },
        required: ["id", "type", "connects", "confidence"],
      },
    },
    uncertainties: { type: "ARRAY", items: { type: "STRING" } },
    generationWarnings: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["projectSummary", "scale", "rooms", "openings", "uncertainties", "generationWarnings"],
};

export async function analyzeFloorPlan(file: File, instructions: string, materials: MaterialSelections): Promise<FloorPlanAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model = process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_ANALYSIS_MODEL || "gemini-3.1-flash-lite-preview";
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: floorPlanAnalysisPrompt(instructions, materials) }, { inlineData: { mimeType: file.type, data: bytes } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.1 },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini analysis failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini returned no structured analysis");
  return JSON.parse(text) as FloorPlanAnalysis;
}
