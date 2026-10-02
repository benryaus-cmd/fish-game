# Living aquarium implementation evidence

Implemented 2 October 2026. This supersedes earlier safe-return and two-tank prototype rules.

## Shipped behaviour

View and Swim use one mounted Aquarium and one atomic profile. The composed overview projects the active swimming position and world landmarks; native fish silhouettes retain readable display size. View shows owned individuals once, one calm crab, the predator and a small bubbling castle. Selecting Swim resumes the active individual or starts a resident session; there is no separate safe joystick game.

The world is 3600×1800. Nursery foliage at the left is the only refuge. The far-right castle plume heals 3 health/second, enhanced by vitality, without immunity. Crabs roam outside the nursery, telegraph for 0.75 seconds, hop 140 pixels and float down; their attack is bounded to one hit and a two-second cooldown. Original articulated shrimp roam the water column, dodge approaching fish and replenish after 22 seconds. Algae attaches inward to both side walls; eligible nearby food has a soft glow. Guppies and other fish are never edible. Controlled and wild fish default travel speeds are 40% of the previous version; the approved continuous swimming pose is preserved.

View pellets cost 5 credits and cleaning 15; Swim cleaning and foraging cost nothing. Tank dirt follows the shared saved clock and appears on View walls. New stock starts at 70 food so the first deliberate bite is useful. Meals while food is at most 85 add nourishment and up to 15 healthy seconds; food above 85 causes overfeeding damage with no development bonus. Adult development retains a 600-second healthy-credit gate and 450-second elapsed floor. Food depletion rates are unchanged.

Milestones at 35 and 75 resolve exactly once. Condition earns zero through three distinct picks from speed, vibrancy, ornamental fins and vitality. Present milestones queue an unobtrusive upgrade action, never an automatic modal. Pending choices survive visible View and paid feeding. Offline/hidden growth assigns deterministic choices; reload cannot reroll them. Legacy fish retain maturity, traits and silhouettes.

Zero health persists before a four-second upside-down float, then a death notice and atomic removal. This applies to owned individuals too. Death history prevents resurrection, clears affected placements/breeding reservations and preserves other fish/credits. Failed checkpoints keep live Swim; failed death writes can be retried after storage recovers.

## Verification

- 131 Node tests: 129 passed, two optional pose-sheet export skips; no failures. Includes care-time equivalence, migrations, payment/death replay, wall orientation, shrimp evasion, crab hop reach, nursery safety, camera bounds and swimming geometry.
- Canonical-source TypeScript check and production Vite build pass. The unrelated full host TypeScript alias baseline was not repaired.
- Built Chromium journey passes: View/Swim identity and position, one active Collection entry, paid pellets/overfeeding/cleaning, free cleaning, native Enter EAT without contact eating, deferred multiple upgrades, visible View retention, hidden growth without reload, four-second resident death and reload persistence.
- Built ecology journey passes: castle healing saved above 35 health with frozen care time, a crab hitting above its previous floor-only reach, neutral View without additional damage, both attached walls and outward joystick bounds.
- Storage-recovery journey passes: native home button activation and retrying a defeated run after quota writes recover.
- Inspected portrait captures of View, Swim, both walls, castle bubbles, crab hop and upside-down death; narrow 320×420 layout checked separately after final action spacing.

Desktop headless Chromium establishes these behaviours and layout. Physical-phone frame rate, real audio playback and Aippy's external import execution were not tested here.

## Import

`updates/living-aquarium.json` lists 36 source files, including the previous exotic update dependencies. Import in the existing awaited Node 22/Vite recovery pipeline; preserve the host shell, README, wallet and saved individuals. See `updates/living-aquarium-prompt.md` for the direct prompt.
