# Predator balance and Burst endurance

Both predator and crab hits remove 8 points from the 100-point health scale. Predator acquisition drops from 750 to 600 world units. Chase loss, bite and charge expiry seed one forward coast destination, slow to patrol speed, then return to ordinary patrol; no per-frame retreat rerolls. Existing pursuit loss distance, nursery safety and damage grace period remain.

Default Burst duration rises 50%: normalized drain is 65/1.5 per second (about 2.31 seconds from full instead of 1.54). Saved stamina remains 0–100; cooldown, recovery and exhaustion threshold are unchanged.

Verification: scoped TypeScript and production build passed. Unit suite: 163 passed, two optional native export skips, no failures. Regression tests cover 599/601 detection boundary, stable forward disengagement in both directions, and full default Burst endurance. Built-browser journey confirmed crab and predator each show 92 health after one hit, haptic requests and cooldown/recovery; that journey ran before the final endurance-only change, which is covered by unit tests and the final build. Physical-device haptics and performance were not measured.
