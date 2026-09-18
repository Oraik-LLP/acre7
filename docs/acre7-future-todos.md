# Acre7 future scope

This document records the product direction and deferred work for the project. It is a planning reference; the current demo remains intentionally pre-seeded and does not implement the live production systems described here.

## Professional demo flow

The client-facing demo should make the transformation legible from start to finish:

1. Show the real, hand-drawn or uploaded blueprint as the initial state, positioned on the left side of the workspace.
2. Accept a structured prompt for the house and its accessories, including controls for wall color, flooring, room materials, time of day, floor level, and additional context.
3. Convert the blueprint into a clean 2D top-down representation and show the route through the plan.
4. Present three possible design variations. In demo mode these are fixed, prefilled options; when one is chosen it becomes the final direction for the session.
5. Move from the top-down plan into an isometric view, then into seeded panoramic viewpoints with a clear aerial-to-ground transition. The demo should already have the best viewpoints and annotations selected.

The experience should be polished enough to show architects, buyers, agents, and other participants in a home project.

## Live-session architecture

- The backend generates one-time token codes.
- Redeeming a token creates a unique session URL.
- A redeemed token cannot be reused to create additional sessions.
- Session progression is forward-only after a step has consumed its token, while already-created sessions remain viewable through their unique URL.
- An admin surface should list issued and redeemed tokens, show usage cost, and expose model names and model parameters for editing in one place.

## Panorama object tools

For a later individual-panorama workflow, detect furniture, carpets, fixtures, and other selectable objects in the scene. Selecting an object should use a blue highlight and support phone press-and-hold or laptop right-click interactions. The contextual menu should include texture edits, object edits, and a command to generate a 3D version of the selected object using GPT-6 or an appropriate fallback model. The interaction should feel similar to circle-to-search while remaining grounded in the panorama.

## Brand and UI follow-up

- Redesign the complete site around the Respawn logo system in `assets/Respawn.jpg`, `assets/Respawn(1).jpg`, and `assets/Respawn(2).jpg`.
- Keep the brand treatment consistent across the homepage, designer, materials, viewpoints, about page, and future admin/session surfaces.
- Preserve the current demo as the reference behavior while the production generation, token, and object-selection systems are built later.

## Deferred implementation checklist

- [ ] Apply the Respawn logo system across the full site.
- [ ] Add real blueprint ingestion and prompt-to-plan orchestration.
- [ ] Add variation generation and session finalization.
- [ ] Add aerial-to-isometric-to-panorama transitions driven by real generated assets.
- [ ] Add token redemption, unique sessions, and forward-only usage rules.
- [ ] Add admin token, cost, model, and parameter controls.
- [ ] Add panorama object detection, selection, contextual actions, and object generation.
