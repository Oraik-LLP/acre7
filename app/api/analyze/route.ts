import { NextResponse } from "next/server";
import { analyzeFloorPlan } from "@/lib/acre7/providers/gemini";
import type { MaterialSelections } from "@/lib/acre7/types";

const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const floorPlan = form.get("floorPlan");
    if (!(floorPlan instanceof File)) return NextResponse.json({ error: "A floor-plan file is required." }, { status: 400 });
    if (!allowedTypes.has(floorPlan.type)) return NextResponse.json({ error: "Use a PNG, JPG, or PDF floor plan." }, { status: 415 });
    if (floorPlan.size > 20 * 1024 * 1024) return NextResponse.json({ error: "The floor plan must be 20 MB or smaller." }, { status: 413 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Gemini is not connected yet. Add GEMINI_API_KEY to the server environment." }, { status: 503 });

    const materials = JSON.parse(String(form.get("materials") || "{}")) as MaterialSelections;
    const required = ["walls", "flooring", "style", "lighting"] as const;
    if (required.some((key) => typeof materials[key] !== "string" || !materials[key].trim())) {
      return NextResponse.json({ error: "Complete all material selections before analysis." }, { status: 400 });
    }
    const analysis = await analyzeFloorPlan(floorPlan, String(form.get("instructions") || "").slice(0, 4000), materials);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Floor-plan analysis failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Floor-plan analysis failed." }, { status: 502 });
  }
}
