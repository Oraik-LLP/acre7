import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    xai: Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY),
    geminiModel: process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_ANALYSIS_MODEL || "gemini-3.1-flash-lite-preview",
    xaiImageModel: process.env.IMAGE_MODEL_CHOICE || process.env.XAI_IMAGE_MODEL || "grok-imagine-image",
  });
}
