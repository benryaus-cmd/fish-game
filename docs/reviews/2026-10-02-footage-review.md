# First playable footage review

Reviewed `7656.mp4` (41.28 seconds), sampled throughout at two-second intervals and checked against GitHub build `65dbc8f`. This review changes product direction and worker guidance; it does not implement the fixes below. The recording has no audio stream, so it cannot establish music quality or audio performance. No fresh interactive app run was performed for this review.

## What is working

The horizontal turn and trailing body/tail remain appealing. Feeding, growth choices, appraisal, sale and a fresh outing are visibly connected. Around 14–22 seconds the player appraises an adult, receives 199 credits and starts another guppy. Foreground leaves make shelter feel like a place. Preserve these strengths while improving the rig and presentation.

## Next implementation pass

Paths below are relative to `src/games/importedAippy/upstream/src/`.

| Finding | Evidence and source | Required result |
| --- | --- | --- |
| Steep swimming distorts the fish and buries the dorsal fin | Around 6, 12 and 38 seconds. `utils/fishModel.ts` pitches the spine; `utils/fishFins.ts:drawMedianFin` still offsets fin height along screen Y. `utils/fishRender.ts:bodyPath` draws upright cross-section ellipses, and `drawFish` always paints median fins before the body. | A consistent projected local frame for body cross-sections and fin roots/tips, with pose-correct overlap. Audit tail, paired fins, face and mouth. Do not merely paint every dorsal fin on top. Inspect ascent/descent, diagonals and reversals at small and adult sizes. |
| Water pattern has a horizontal boundary | Visible through the swimming footage. `components/Aquarium.tsx` passes `Math.min(vH, 400)` as caustic height. `utils/aquaScene.ts:drawCaustics` paints rectangular layers, exposing that edge. | Cover the visible world area and fade intensity by world depth/material. Verify tall/short screens, travel, world edges and zoom levels. Distinguish underwater caustics from an actual surface reflection. |
| HUD occupies travel and look-ahead space | Permanent “Feed, grow, then return…” pill at 0–12 and 24–40 seconds; two large stat cards also claim the top. `GardenHUD.tsx` always renders the out-of-shelter instruction; `GardenUI.css` puts it 128 pixels above bottom safe spacing. | One brief introductory hint, then a small edge refuge marker when relevant. Compact stats, expandable details and local refuge action. Controls remain reachable; fish and threats stay visible. |
| Camera has no growth/speed zoom | Adults occupy substantial screen space and travel has limited anticipation. `utils/worldCamera.ts` has position/shake only; Aquarium translates without scaling. | Smooth speed/size-based zoom with hysteresis and slower recovery, plus travel lead. Recalculate visible world dimensions, clamps, culling, cover buffer/effects and picking. HUD stays screen-sized. Check world smaller than view and reduced-motion mode. |
| Boutique contrast and action layout need work | At 18–20 seconds, collection/empty-state headings appear dark on dark. `.boutique-screen` and several headings lack explicit foreground colour. Appraisal around 14 seconds pushes choices below view. | Explicit readable text tokens on every screen/empty state. Compact content and reachable actions with scrolling inside the Aippy viewport and with the naming keyboard open. |
| Choices do not yet support a collection game | Repeated Swift/Ornamental cards around 4 and 36 seconds. `specimenAppearance.ts` enlarges fins and changes an accent; repeated Swift increases speed and stamina drain. Fresh stock is another coral/gold fish. | Three authored branches with visual/stat distinctions, ordinary versus paid stock, persistent lineage/potential and a living home. Stage these in the product brief's order. |

The new outing reaches juvenile growth roughly 14 seconds after spawning (about 22–36 seconds). Feeding is accessible, but this is much faster than the intended whole-session rhythm. Measure meals, milestones, sale and defeat across several genuine runs before rebalancing; one demonstration is insufficient to prescribe rates.

## Completion evidence for the presentation pass

Capture a mobile sequence: juvenile and adult fish climb, dive, reverse both ways, burst into open water and return through cover. Show coherent silhouettes, readable threats, smooth zoom, continuous lighting and an unobstructed centre. Include home/boutique empty and populated states and appraisal with the keyboard open. Use the Aippy-sized viewport as well as full-screen portrait. Builds/tests support this evidence; they do not replace it.

Follow with home/stock and progression slices in `final-product.md`. Keep this review as a baseline; append resolution evidence when fixes land rather than changing observations into completed claims.
