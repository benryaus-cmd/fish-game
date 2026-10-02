# First care-world slice

Implemented in the existing main game; approved procedural swimming retained.

## Delivered

- One saved world clock across viewing/growing tanks: five minutes day, five minutes night, gradual dawn/dusk. Moving sand caustics in both renderers and readable night lighting.
- Persistent individual care: slow food decline, recovery while fed, a forgiving 40-health home floor, no offline loss of kept fish. Ten healthy minutes and sufficient nutrition gate new adulthood. Existing adults retain earned maturity.
- Select a kept fish, feed it at home or move that same individual into the growing tank. Return even an immature resident; owned-session defeat returns it safely rather than erasing it.
- Explicit EAT: tap/hold/E or keyboard activation. Flakes, sinking pellets, renewing algae and size-gated juvenile prey. Diet policy is extensible; the currently playable species remains guppy. Feeding phase preference changes nourishment.
- Closer fry camera; existing speed/size zoom-out retained. Camera-correct tapping opens care and development details with focus trapping/Escape. Ornamental, athletic and vitality paths have separate disclosed effects.
- Free two-minute guppy breeding from two adult, healthy, fed residents. Parents and nursery capacity are reserved. Inherited colour/fin potential and parent IDs persist once at start; claiming/reloading cannot duplicate or reroll offspring. Acquired upgrades are not copied.
- Compact home dock and separate EAT/BURST controls; paged parents and scrollable short-screen sheets.

## Verification

Native suite: 87 passed, 2 skipped, no failures (89 total), including real canvas floor/night pixels, migration, care/time boundaries, diets/input, transfer, inheritance and replay. Scoped canonical-game TypeScript and production build passed. The existing full-project tsc-b recovery/alias errors are unrelated and remain outside this slice.

Built Chromium journey checks cover shared clock, same-fish raise/return, care details, free breeding/one claim/reload, newborn nonautomatic eating, native Enter activation of EAT and immature return. Additional journeys exercise purchases, failed-save recovery, existing owned home control, the closer fry camera, camera-correct fish picking, care-sheet focus wrapping and Escape. Pixel screenshots were inspected at 390×680 and the breeding sheet at 320×420: floor caustics are visible, growing controls stay at the edges, short sheets scroll. These checks do not establish phone frame rate or sound quality.

Independent code review found and fixed capped recovery across long time gaps, native keyboard eating and breeding-reserved nursery capacity. Physical mobile touch, long busy-tank play and audio were not tested. The timer is persisted device time, not authoritative backend time; device-clock tampering is not prevented.

## Remaining product work

FishoDex discovery/goals; authored additional playable species and diets; adjustable pH/temperature/equipment; habitat-dependent breeding/development; deeper family genetics and appraisal. These are direction, not claims of shipped functionality. Keep this first loop coherent before increasing catalogue size or adding renderer dependencies.
