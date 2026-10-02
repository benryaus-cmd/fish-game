# Aquarium Presentation Implementation Plan

> **For agentic workers:** Execute focused tasks with independent rendering/camera helpers; the root owns integration and one final review. User has authorised implementation and delegation.

**Goal:** Make steep swimming, lighting, camera framing and mobile interface coherent before expanding the collection game.
**Architecture:** Correct existing procedural projection, add bounded camera zoom to the world view, retain screen-space HUD and simplify its information hierarchy. Preserve current saves and transactions.
**Tech Stack:** Existing React, Canvas2D, Node behaviour tests and Chromium.
**Spec:** final-product.md sections 6–8; docs/reviews/2026-10-02-footage-review.md.

## Global Constraints
- Evolve src/games/importedAippy/upstream/src/ in place; preserve aliases and current saved boutique data.
- No new runtime dependencies or renderer migration. Keep horizontal fish character and control sizes.
- Root edits Aquarium integration, water lighting and UI; helper files do not overlap.

## Review Focus
- Body/fin attachment and visible area at ±1.2-radian pitch and both facing directions.
- Zoom at world boundaries, oversized viewport, resize and reduced-motion preference.
- Lighting continuity across the old 400-pixel boundary at all view sizes/zooms.
- Menu actions with short Aippy viewport, keyboard and populated/empty collection.
- Existing sale/keep/reload and unsaved-display preservation remain intact.

### Task 1: Fish local frame
Files: utils/fishModel.ts, fishFins.ts, fishRender.ts, colorfulRender.ts if needed; tests/fish-projection.test.ts.
- [x] Reproduce steep-pitch distortion with real geometry/render checks; observe failure.
- [x] Correct cross-sections, median/tail/paired fins and face attachments in one coherent projected frame; maintain near/far occlusion.
- [x] Test both directions, ascent/descent and neutral horizontal pose; produce a rendered pose sheet for root inspection.

### Task 2: Camera framing
Files: utils/worldCamera.ts; tests/world-camera.test.ts.
Interface: extend updateCamera's existing signature with optional final hints {speed?:number, bodyLength?:number, reducedMotion?:boolean}; Camera.zoom starts at1. getCameraView(cam,viewW,viewH) returns {x,y,width,height,zoom} with world dimensions and shake applied.
- [x] Test speed/size zoom, smooth recovery, frame-rate consistency, bounds, oversized views and reduced motion; observe missing-feature failures.
- [x] Add bounded smooth zoom, hysteresis and zoom-aware following/clamps; keep legacy callers valid.
- [x] Report exact tuning and integration instructions without editing Aquarium.

### Task 3: Lighting and mobile UI integration
Files: Aquarium.tsx, GardenHUD.tsx, GardenUI.css, utils/aquaScene.ts; tests/presentation-browser.cjs.
- [x] Build baseline and capture existing clipping/crowding/readability failures in browser checks.
- [x] Integrate camera world dimensions into draw transforms, bounds, lighting and culling; draw caustics continuously with gradual world-depth attenuation.
- [x] Compact stats with expandable detail; replace permanent centre instructions with edge guidance and a local refuge action. Keep at least44px touch targets.
- [x] Fix text contrast and compact scrollable dialogs with reachable actions and keyboard-aware layout.

### Task 4: Verify and publish
- [x] Run Node suite, scoped TypeScript and production build; exercise controls, camera/lighting/mobile layouts and existing boutique browser flows.
- [x] Inspect pose sheet and mobile screenshots/short sequence; record limitations of headless audio/device checks.
- [x] Fresh review, address material findings once, append resolution evidence and publish scoped manifest with Node/Vite Aippy prompt.
