# Care-world implementation plan

User authorised planning, workers and execution in the existing main game. Worktree fish-game-work; no duplicate app.

1. Model worker: additive care/clock fields, monotonic real-time care and ten-minute adult gate, diet/preference data, safe resident transfer and exact-once breeding transactions. Own boutique.ts and new specimenCare.ts/worldClock.ts/breeding.ts + model tests.
2. Feeding worker: deliberate EAT input and cooldown, bounded food/algae ecology, care-model integration, growth/health sync, owned-session protection, fry camera and player picking. Own Aquarium.tsx, playerInput.ts, worldCamera.ts, necessary playerSurvival.ts/specimenAppearance.ts updates + targeted tests. Root owns HUD and shared care panel.
3. Lighting worker: day/night tint and sand/water caustics, home renderer integration. Own HomeTank.tsx, aquaScene.ts/new tankLighting.ts + visual tests. Give feeding worker receiver/tint interfaces; do not edit Aquarium.tsx.
4. Root: App profile/care lifecycle, kept transfer and breeding callbacks; WorldTimeBadge, FishCarePanel, BreedingSheet; HomeScreen/HUD/CSS and stock explanations. Integrate worker contracts once agreed; preserve focus/keyboard/pause and failed-write recovery.
5. Review integrated slice once; verify time boundaries/migration/replay, feeding consent/diets, transfer/claim, rendered light/fry framing/mobile sheets. Run scoped TypeScript/build and built journeys; inspect real outputs. Fix material findings and publish one source manifest with direct Aippy import prompt. Update brief/AGENTS and implementation evidence with completed vs future scope.

Implementation and review complete. Verification and remaining scope are recorded in docs/reviews/2026-10-02-care-world.md. Product import: updates/care-world.json (21 source files). No new renderer/audio dependency, no second game copy, no server-clock claim.
