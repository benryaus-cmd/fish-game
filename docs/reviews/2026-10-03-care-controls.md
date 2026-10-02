# Care controls and stage feedback

Removed the instant free-clean Swim button and its whole-algae removal handler. Deliberately eating one algae patch now clears 5 saved dirt for free alongside the current fish snapshot; remaining patches stay available and regrow normally. View cleaning remains paid.

Local upgrade selection registered taps but had no visual selection state. Choices now highlight with ticks and a selection count; once the earned slots are full, unselected options disable until a selection is removed. The existing transaction confirms all distinct choices together. Vitality adds 12% feeding growth credit per upgrade, including overfeeding, capped by the remaining 600 healthy seconds. Existing nutrition, health penalties and elapsed age floor remain.

Swim's stage box counts down healthy time to juvenile/adult and shows Fully grown for adults. Expanded details retain growth percentage. Castle healing replaces Health with a green Healing label; there is no additional line.

Verification: 170 unit tests passed, two optional native export skips, no failures; scoped TypeScript and production build passed. Built-browser journey crosses real milestones with two and three earned slots, selects/deselects visibly, confirms and verifies exact persisted traits and empty pending choices. It also confirms no Clean glass button, with no page errors. Inspected the selected-upgrades mobile screenshot. Unit tests cover algae dirt reduction without credit/ownership loss, Vitality credit while full, countdown formatting, adult presentation and healing label. The audio fix is included in the same import; its Web Audio/slider journey is recorded in 2026-10-03-audio-fix.md.
