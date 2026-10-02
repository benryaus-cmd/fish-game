# Owned residents and busier Swim

Implemented in the existing canonical game, with no save-key or ownership migration.

- Filter is flush to the top-left edge in both projections; its healing plume follows the world fixture.
- Ambient View guppies have stable 50–100% display sizes and mostly rainbow, blue and gold colours. Swim has 42 ambient fish; View displays 30.
- One unowned native Pearl Angel cruises slowly in both modes, with tall sail fins. It never hunts. Actual contact outside the nursery costs 8 health, requests damage feedback and provokes escape. Contact has a three-second cooldown and respects player invulnerability/death.
- Owned fish receive a low-cost soft halo and screen-sized name labels. The selected View sheet offers wraparound previous/next navigation and persistent names (40 characters). Inputs participate in its focus trap. Aquarium simulation pauses behind collection/details sheets and resumes on close.
- Swim has 16 bounded shrimp; View displays eight. Food grows to 108 particles: 48 flakes, 32 pellets, two rare healing beads, 26 algae. Floating food remains mostly in the upper two-thirds.
- Predator notice radius is 384, chase-loss distance 544, charge threshold 416. Shared nine-second post-hit grace remains.
- A successful persisted sale submits the new total wallet credits through the actual Aippy reportScore SDK, in View or Swim. Death no longer submits growth. Duplicate saves and non-sale transactions do not submit scores.

## Evidence

Scoped TypeScript check and production build pass. The complete behaviour suite has 183 tests: 181 pass, two optional native-export skips, zero failures. The updated 16-shrimp respawn test also passes independently.

`tests/owned-residents-browser.cjs` exercises the built app at 390 × 844: rename, reload persistence, previous/next fish, both View and Swim sales, native SDK bridge payload equals the saved wallet, eight-health angel contact without immediate repeated damage, and no page errors. Normal-motion View/Swim screenshots were inspected; the final UI journey also uses reduced motion for economical software-rendered screenshots. Generated captures are `.superpowers/swim-owned-residents-view.png`, `.superpowers/swim-owned-resident-details.png`, `.superpowers/swim-majestic-angel-contact.png`.

The SDK bridge is observed with a test host listener; receipt by the live Aippy server and physical-device haptics/performance are not established by this local check. No remote Aippy import is claimed.

Cumulative Node/Vite importer manifest: `updates/swim-owned-residents.json` (63 files). All changed product files are covered. Host shell, README and saved fish/credits remain intact.

## View clarity follow-up

Removed the broad upper HomeUI scrim from both declarations; the quiet lower dock fade remains. Owned name-tag backgrounds are 30% opaque (70% transparent), with readable text retained. Their centre now sits 0.38 body lengths plus 5px above the fish rather than 0.65 lengths plus 9px. Scoped TypeScript and production build pass. A built 390 × 844 daylight View capture (`.superpowers/swim-view-clarity.png`) was inspected and its computed top overlay checked; no page errors. Cumulative importer: `updates/swim-view-clarity.json`, 63 files.

## Tap-to-reveal follow-up

Owned names and halos start hidden. An empty-water pointer tap reveals them for 2 seconds, then fades both over 400ms. Another miss refreshes the reveal. A direct fish tap still selects care even when hints are invisible. Entering another mode clears the hint. The reveal uses monotonic presentation time, independent of saved care/world timestamps. Scoped TypeScript, production build and all six View behaviour tests pass. The built mobile-browser journey checks actual label draw alpha at hidden/full/half/faded states, confirms owned fish still render while hints are hidden, and directly selects a hidden fish; no page errors. Canvas captures before/after reveal were inspected. Cumulative importer: `updates/swim-view-hints.json`, 63 files.
