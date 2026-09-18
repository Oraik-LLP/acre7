export async function generateXaiImage(prompt: string, aspectRatio: "2:1" | "16:9" = "2:1") {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not configured");
  const model = process.env.IMAGE_MODEL_CHOICE || process.env.XAI_IMAGE_MODEL || "grok-imagine-image";
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, n: 1, aspect_ratio: aspectRatio, resolution: "2k", quality: "high", response_format: "b64_json" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`xAI image generation failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  return response.json() as Promise<{ data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> }>;
}
