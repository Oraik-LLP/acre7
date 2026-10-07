import { NextResponse } from "next/server";

export async function GET() {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  return NextResponse.json({
    gemini,
    xai: Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY),
    analysisEnabled: gemini && (process.env.NODE_ENV !== "production" || process.env.ACRE7_ANALYSIS_ENABLED === "true"),
    geminiModel: process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_ANALYSIS_MODEL || "gemini-3.1-flash-lite-preview",
    xaiImageModel: process.env.IMAGE_MODEL_CHOICE || process.env.XAI_IMAGE_MODEL || "grok-imagine-image",
  }, { headers: { "Cache-Control": "no-store" } });
}
