# acre7 prompt pack

The executable prompt templates live in `lib/acre7/prompts.ts`. They are versioned with the product so every generated asset can record the prompt revision used.

The pack separates four concerns: floor-plan extraction, overhead rendering, panorama rendering, and visual review. Structural facts always come from the user-confirmed extraction. Material selections are structured values compiled into prompts. Additional user text is treated as project context and cannot override the orchestration rules.

Panorama requests require a 2:1 equirectangular output, full 360° horizontal and 180° vertical coverage, level horizon, and a continuous seam. Output dimensions and seam continuity must also be verified by application code before an asset is accepted.

## Provider configuration

The MVP uses `GEMINI_TEXT_MODEL` for floor-plan extraction, `GEMINI_IMAGE_MODEL` for Gemini image work, and `IMAGE_MODEL_CHOICE` for Grok image generation. `GROK_API_KEY` is the canonical xAI credential name; `XAI_API_KEY` remains accepted as a compatibility alias. All credentials are read only by server-side modules.
