# Fish Game worker reference

For gameplay, visual, audio, progression or architecture decisions, consult the relevant sections of [final-product.md](final-product.md). It is the product direction; its opening section gives the short version. Earlier recovery notes in MEMORY.md and prototype goals in spec.md are historical context.

The main game is `src/games/importedAippy/upstream/src/`. Evolve it in place. Implement the current requested slice, not the entire design at once. Current user instructions take precedence. Keep the design brief concise and update it when an agreed direction changes.

## Current priorities

The presentation, living home/stock and first care-world slices are implemented. Read [care-world evidence](docs/reviews/2026-10-02-care-world.md), [the footage review](docs/reviews/2026-10-02-footage-review.md) and [home/stock implementation](docs/reviews/2026-10-02-home-stock-implementation.md). Next is a small tracked FishoDex and meaningful habitat/species expansion. Builds and behaviour tests alone do not establish visual quality. The [living-swimming review](docs/reviews/2026-10-02-living-swimming.md) distinguishes relaxed passive aquarium motion from controlled back-facing dives; do not reintroduce binary side-facing vertical poses.

The saved home aquarium is the main menu. Kept fish are persistent individuals and breeding stock. Free ordinary and paid fancy guppies have disclosed inherited appearance. Ornamental, athletic and vitality development remain separate from heredity. First guppy breeding reserves two adults and one nursery space, persists one inherited offspring at start and claims it once after two minutes. Shared day/night is five minutes each. Care uses saved device timestamps, not a server clock; adulthood requires ten healthy minutes plus nutrition. Deliberate EAT supports pointer/hold/E/native keyboard activation; do not restore collision eating. Adjustable habitat conditions, expanded species and FishoDex remain intended systems.

## Implementation guardrails

- Preserve procedural fish character. Pose the entire body/fin frame consistently and inspect steep dives, climbs and both turn directions; do not conceal geometry errors with unconditional fin overlays.
- Keep gameplay centre clear. Guidance is brief or at the edges. Zoom updates world bounds/culling/effects together while HUD and touch targets retain their size.
- Keep inherited traits, acquired development, current condition and environmental modifiers distinct. Species remain species; breeding compatibility and environmental effects are explicit data.
- Preserve coins, kept fish and active runs through save migrations. Purchases, sales, transfers and breeding outcomes commit once; no refresh rerolls or lost individuals.
- Maintain one audio owner as screens multiply. Profile before renderer/library changes; measure on mobile before claiming performance targets.
- Verify the changed player journey in the built app, with screenshots or footage for visual changes. State device/audio checks not performed. Do not repeatedly rerun passing checks without a changed reason.
- Publish scoped GitHub updates through the established Node/Vite import manifest with a direct Aippy prompt when product code changes. Documentation changes need no game import. Never describe planned features or unexecuted imports as completed.
