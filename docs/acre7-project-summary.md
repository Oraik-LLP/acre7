# Acre7 project summary

## Product vision

Acre7 is an image-to-spatial visualization tool for architects, real-estate professionals, and clients. A user uploads a real floor plan, adds natural-language instructions, selects controlled design parameters, and receives a furnished overview plus room-level panoramic views.

The product is intended to create a shared visual language between architects, buyers, agents, brokers, and other project stakeholders. Instead of producing an unrestricted image variation, it uses a focused set of material and style choices so every generated view stays consistent.

## Input model

- A real PNG, JPG, or PDF floor plan
- Optional text instructions
- Controlled selectors for wall color, flooring, interior style, and lighting
- Future support for additional room priorities and finish specifications

Example input:

> I want to generate this house with warm white walls, oak wood flooring, a warm natural interior, and natural daylight. Keep the kitchen open and prioritize the living room view.

## Intended generation pipeline

1. Upload and inspect the floor plan.
2. Use Gemini to identify rooms, walls, openings, and uncertainties.
3. Let the user confirm the extracted layout.
4. Apply the selected material and style parameters.
5. Generate an overhead furnished view.
6. Place up to five room viewpoints on the plan.
7. Generate a panoramic image for each selected viewpoint.
8. Let the user explore the house room by room.

## Current MVP

The first Acre7 edition currently includes:

- Real floor-plan upload support
- PNG, JPG, and PDF validation
- Gemini-based floor-plan analysis endpoint
- Provider-status checking
- Natural-language parameter sentence with selectable chips
- Fixed design options for walls, flooring, style, and lighting
- Cedar House ready-state preview
- Furnished overhead floor-plan image
- Five room viewpoints:
  - Living room
  - Dining area
  - Kitchen
  - Primary bedroom
  - Guest bedroom
- Room-specific panorama assets
- Numbered viewpoint markers
- Animated overhead-to-room transition with panorama preloading
- Spherical WebGL panorama projection using Three.js
- Drag, wheel, touch, pinch, button, and keyboard camera controls
- Compact fullscreen panorama mode with an in-view exit control
- Room-to-room hotspots derived from floor-plan bearings
- Panorama validation, loading, error, and non-WebGL fallback states
- Reduced-motion support
- Responsive mobile and desktop layouts
- Room thumbnails in the viewpoint list
- Server-side API key handling

The current ready-state uses fixed Cedar House assets while the complete multi-provider generation pipeline is being developed. It is presented as a finished project preview in the UI rather than being labeled as a simulated experience.

## Public site routes

The product now has a public website around the working surface:

- `/` and `/homepage` — public Acre7 homepage with the product story and workflow entry points
- `/designer` — full plan-to-panorama workspace
- `/plan` — alias for the complete designer workflow
- `/materials` — interactive controlled finish selector
- `/viewpoints` — interactive floor-plan viewpoint map and panorama previews
- `/about` — product principles and the interactive build queue

The public pages share the same dark mineral palette, lime wayfinding accent, typography, navigation, footer, responsive rules, focus states, and motion language. They use the existing Cedar House floor-plan and panorama assets instead of invented stock imagery.

The Linear plugin is installed and connected to the `entroprox` workspace. The build queue is intentionally local for now; its items are ready to be mapped to Linear issues when the project workflow is finalized.

## Main files

- `app/page.tsx` — main Acre7 workflow and viewer interactions
- `app/globals.css` — visual system, layout, responsive rules, and motion
- `app/api/analyze/route.ts` — floor-plan analysis endpoint
- `lib/acre7/providers/` — Gemini and xAI provider integrations
- `lib/acre7/prompts.ts` — orchestration and analysis prompts
- `public/demo/` — current overhead and panorama assets
- `vid-assets/` — supplied UI and motion reference videos

## UI and UX direction

The supplied videos were used as visual references for hierarchy, motion, density, and composition. The resulting direction is a dark spatial studio with cinematic media as the main surface.

The design decisions are:

- Use the floor plan and panorama as the primary visual surfaces.
- Keep the interface dark, quiet, and spatial.
- Use glass effects only for overlays and controls.
- Avoid repetitive card grids, excessive purple gradients, generic stock sections, vague calls to action, and decorative UI without a purpose.
- Make room selection visual by using actual panorama thumbnails.
- Keep the workflow explicit: Plan, Materials, Viewpoints, Generate, Tour.
- Use motion to explain the relationship between the floor plan and the selected room.
- Keep controls keyboard-accessible and respect `prefers-reduced-motion`.

## Local development

Start the development server from the Acre7 folder:

```powershell
npm run dev -- --host 0.0.0.0
```

Open:

`http://localhost:5173/`

The environment supports provider configuration through server-side variables such as `GEMINI_API_KEY`, `GROK_API_KEY`, `GROQ_API_KEY`, and `DEEPGRAM_API_KEY`. Secret values should remain in `.env` and should never be committed or exposed in the browser.

## Panorama viewer architecture

The original viewer displayed each 1774 × 887 panorama as a repeating CSS background. Dragging only changed `background-position`, so the expanded image remained flat even though the overhead-to-room transition looked convincing.

The current viewer maps each 2:1 panorama onto the inside of an inverted Three.js sphere. The camera stays at the sphere's origin and uses real yaw, pitch, and field-of-view changes. It supports mouse and touch dragging, pinch and wheel zoom, keyboard controls, resize handling, reduced motion, texture caching, and nearby-viewpoint preloading.

Each viewpoint is structured data with a stable ID, room ID, floor-plan position, panorama URL, initial camera orientation, and neighbouring viewpoints. Hotspot directions are calculated from floor-plan coordinates using a documented north-up, clockwise bearing convention.

The interface now reports the texture's real loaded dimensions instead of the previous hard-coded `4096 × 2048` label. The bundled panoramas load as `1774 × 887`.

## Current limitations

- The current assets are lower resolution than the preferred generation target. The pipeline should request larger strict 2:1 equirectangular images for production.
- Spherical projection provides a convincing 360° look-around view, but a single panorama does not contain geometry, depth, or parallax.
- Room hotspots use floor-plan bearings. Their exact visual alignment depends on calibrating each generated panorama's north orientation.
- Format, dimensions, and 2:1 ratio are validated automatically. Visual seam quality still needs either generation-time enforcement or image analysis.
- Movement between rooms switches panoramas. Continuous Google Earth-style travel requires shared spatial data such as a 3D mesh, depth maps, NeRF, or Gaussian splats.

## Generation requirements for the viewer

The image pipeline should:

1. Produce strict 2:1 equirectangular panoramas for every selected viewpoint.
2. Keep architectural structure, materials, lighting, and furniture consistent across rooms.
3. Return camera orientation metadata so hotspot bearings align with visible doors and passages.
4. Prefer a production target such as 4096 × 2048 or higher while preserving a lower-cost preview tier.
5. Reject malformed images before they enter a project and retry generation when dimensions or projection are invalid.
6. Add depth or shared scene geometry when the product moves beyond viewpoint switching to continuous spatial travel.

## Current status

The Acre7 UI, floor-plan workflow, fixed project preview, cinematic transition, and Level 1 spherical panorama viewer are in place. The next product milestone is connecting the structured viewpoints to generated panoramic assets, calibrating panorama orientation, and establishing a canonical scene representation for later depth and spatial-navigation work.
