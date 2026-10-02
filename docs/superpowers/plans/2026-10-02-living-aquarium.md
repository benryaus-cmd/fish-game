# Living aquarium implementation plan

> Workers: use subagent-driven development. Current user instructions authorize implementation.

**Goal:** One saved aquarium with peaceful View and controlled Swim, and a feeding–hiding–healing growth loop.
**Architecture:** One mounted Aquarium owns simulation and two camera presentations. The atomic profile owns individuals, development, tank care and transactions. Real timestamps own care; simulation time owns motion.
**Stack:** Existing React, TypeScript and native Canvas fish rigs; no new game dependencies.
**Spec:** [final-product.md](../../../final-product.md), sections 1–3 and shared lighting, plus latest user request.

## Constraints and review focus

Preserve identities, legacy colour/tails, wallet, breeding and existing saves. Never eat guppies. Preserve continuous back-facing dives. Zero health is actual death; never revive or duplicate removed fish. Failed writes preserve live play. Pending choices must not interrupt care. Visible View is presence; actual absence resolves milestones automatically.

- [x] Astra: quick contracts for care, ecology, HUD and same-aquarium routing.
- [x] Sol care worker: milestone IDs 35/75, four traits, care-derived slots, away resolution, meal credit/overfeeding, death and paid tank transactions; migration/replay tests.
- [x] Sol ecology worker: 3600-wide world, both wall algae, far-end castle plume, roaming hopping crabs, evasive water-column shrimp, edible indicators; geometry/behaviour tests.
- [x] Sol HUD worker: health/food/age above identity/time, edge upgrades and free clean action, care explanations and consistent View/Swim language.
- [x] Sol View worker: transparent interface over shared Aquarium, actual Swim routing, active individual in Collection, paid care and mobile sheets.
- [x] Root integration: one Aquarium instance, shared ecology/projected overview, 40% speeds, no fish eating, healing and death animation handoff, save guards and nonblocking upgrade entry.
- [x] Independent Sol review: checkpoint failure, stale death refs, projected world positions and visible-player pending choices.
- [x] Built browser journeys and visual inspection at 390×844 and 320×420; inspect castle, danger and death.
- [x] Prepared scoped source/manifest and direct awaited Node 22 import prompt.
