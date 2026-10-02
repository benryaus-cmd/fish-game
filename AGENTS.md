# Fish Game worker reference

For gameplay, visual, audio, progression or architecture decisions, consult the relevant sections of [final-product.md](final-product.md). It is the product direction; its opening section gives the short version. Earlier recovery notes in MEMORY.md and prototype goals in spec.md are historical context.

The main game is `src/games/importedAippy/upstream/src/`. Evolve it in place. Implement the current requested slice, not the entire design at once. Current user instructions take precedence. Keep the design brief concise and update it when an agreed direction changes.

## Current priorities

Read [the first footage review](docs/reviews/2026-10-02-footage-review.md) when working on rendering, camera or UI. Fix its presentation issues before expanding content. Builds and behaviour tests alone do not establish visual quality.

The saved home aquarium becomes the main menu. Kept fish are persistent individuals and possible breeding stock. Free stock starts as an ordinary guppy; paid stock and species have visible, disclosed potential. Development separates ornamental, athletic and vitality paths. Breeding, habitat conditions and FishoDex provide long-term goals. These are intended systems, not claims that the prototype implements them.

## Implementation guardrails

- Preserve procedural fish character. Pose the entire body/fin frame consistently and inspect steep dives, climbs and both turn directions; do not conceal geometry errors with unconditional fin overlays.
- Keep gameplay centre clear. Guidance is brief or at the edges. Zoom updates world bounds/culling/effects together while HUD and touch targets retain their size.
- Keep inherited traits, acquired development, current condition and environmental modifiers distinct. Species remain species; breeding compatibility and environmental effects are explicit data.
- Preserve coins, kept fish and active runs through save migrations. Purchases, sales, transfers and breeding outcomes commit once; no refresh rerolls or lost individuals.
- Maintain one audio owner as screens multiply. Profile before renderer/library changes; measure on mobile before claiming performance targets.
- Verify the changed player journey in the built app, with screenshots or footage for visual changes. State device/audio checks not performed. Do not repeatedly rerun passing checks without a changed reason.
- Publish scoped GitHub updates through the established Node/Vite import manifest with a direct Aippy prompt when product code changes. Documentation changes need no game import. Never describe planned features or unexecuted imports as completed.
