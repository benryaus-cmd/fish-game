# Exotic aquarium implementation

## Delivered

- Shared day/night endpoints in both tanks: turquoise water and cream sand by day, petrol water by night. Home blends cached endpoint backgrounds/foliage; growing water/sand blend continuously and foliage/rocks use three levels to bound material rebuilding. Moving light remains on water and sand receivers.
- Seven purchasable stocks: existing Ordinary/Sunburst/Blue Veil starter fish, Rainbow (80) and Neon (110) tropical fish, Pearl Angel (160) and Koi Angel (200). Family tabs keep comparison manageable. Original procedural starter/colourful/native angel bodies are reused.
- Independently inherited body, hue, pattern, dorsal/anal fin silhouette and tail form. New game hybrids persist five draws once at breeding start. The native angel tail supports short/fan/veil; historic legacy individuals retain their established silhouette while newly bred legacy-origin individuals render inherited forms.
- Care and maturity reveal colour/sheen without changing inherited hue/pattern; current poor condition dulls it reversibly. Acquired quality is additive save data. Care details disclose vibrancy and inherited axes.
- Curled amber flakes, shaded pellets and attached fine algae. Eight original articulated shrimp act as deliberate, juvenile size-gated prey with bounded replenishment. Two original crabs guard small bottom regions outside the nursery: 0.75-second raised-claw wind-up, 0.35-second ground lunge, two-second damage cooldown, eight damage and disengagement above their reach.
- Correct native angel 3D pitch/yaw projection and eating contact, fitted portraits, nourishment feedback after bites and direct care access from the HUD details.

## Evidence

A short Astra worker actually bought Sunburst, ate via Enter, steered right/down with the joystick, held EAT, opened/resumed the boutique and inspected details on the prior built baseline. Its feedback drove meal confirmation and direct care access; its earlier screenshot observations were explicitly provisional.

Scoped canonical-game TypeScript and production build passed. Native suite: 104 passed, two intended pose-export skips, no failures (106 total), including real canvas lighting/material/angel projection checks, saved axes/replay and crab safety/telegraph/size-gated shrimp. Independent review caught inherited tails being saved but ignored on new legacy-origin hybrids and native angels; both were fixed with geometry regressions.

Built Chromium exercises tropical and angel purchases, actual EAT/meal feedback, direct care access, all-direction angel input, cross-family previews, persisted offspring through reload and single claiming. It also checks night in the growing tank and waits for an actual floor attack to reduce health after the warning. Existing care-world journey still verifies identity transfer, newborn consent feeding and immature return. Native portrait and steep-dive sheets were inspected, plus 390×680 home day/night, stock, growing and night-bottom screenshots. Phone FPS/touch feel and audible music were not tested; this remains Canvas2D with the existing single audio owner and no new product dependency.

## Limits and next work

Cross-family reproduction is an authored fictional game rule. This slice shares the current omnivorous starter diet and ten-minute maturity gate across its ornamental families; specialised diet/temperature/pH progression remains future work. FishoDex goals, habitat equipment, expanded genetics and distinct per-family branch trees are still planned. No new backend clock or offline simulation service was introduced.
