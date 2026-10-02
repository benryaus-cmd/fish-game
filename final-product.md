# AquaLume — final product direction

**Design reference · 2 October 2026 · Intended destination, not a list of completed features.**

## The game in 30 seconds

Run a beautiful aquarium boutique **from inside its fish**. Choose a tiny specimen, explore a living tank, feed, evade predators and develop its appearance and abilities. Return to the nursery and decide: **sell now, risk another excursion, or keep this fish in your personal display**. Sales fund new species, richer habitats and a shop that visibly fills with your achievements.

The emotional rhythm is **wonder → appetite → danger → clever escape → relief → pride**. Swimming must be enjoyable before any reward appears. “AAA” means exceptional animation, materials, sound, responsiveness and finish throughout this compact mobile game.

## 1. The loop and the reason to return

- **Start:** choose a species and optional customer request. Starter guppies are free. Target 3–8 minutes for a raise-and-sell cycle, with suspend/resume anytime.
- **Explore:** follow food, schools and landmarks into exposed routes. Eat suitable prey or forage according to species. Give a feeding success within 15 seconds.
- **Develop:** grow through fry, juvenile and adult stages. At each transition choose between two adaptations, such as stronger burst versus ornamental fins. Choices have visible changes and trade-offs; fish stay within their species.
- **Appraise:** the nursery shows current value and the next premium. Price combines species, maturity, pattern/fin traits and condition; customer requests add a disclosed bonus.
- **Cash out or keep:** selling ends the run with a specimen portrait and payout. Keeping ends it without payout, placing that named individual safely in the personal display. Its appearance and achievements persist; favourites can be piloted there.
- **Expand:** buy starter stock, habitats, curated planting/decor layouts and display upgrades. Requests encourage variety: a healthy adult guppy, long-finned angelfish or varied-diet specimen. Offer choices without real-world deadlines.

Defeat loses the current unbanked specimen and run gains. Banked coins, unlocks, catalogue records and display fish survive. Hunger advances only during active play. Health measures injury, food sustains growth/recovery and stamina powers exertion.

The long-term goal is a flourishing boutique and a personal collection worth watching. Completing the main tank progression opens expert requests, rare visual morphs and mastery challenges with normalised starting conditions.

## 2. A small collection of memorable worlds

Launch with four authored adventure tanks and the personal display. Tanks span several screens in both axes, with meaningful routes, shelter, food niches and landmarks.

| Tank | Look and play identity |
| --- | --- |
| **Guppy Garden** | Sunlit jade leaves, pale sand, drifting fry. Learn feeding, hiding and returning to sell; one readable roaming threat. |
| **Sunken Courtyard** | Amber light, terracotta, the existing castle transformed into a navigable ruin. Competing schools, narrow passages and territorial hunters. |
| **Moonlit Roots** | Copper water, deep blue shadows and tangled roots. Ambush predators, alternate escape routes and crab side excursions. |
| **Coral Gallery** | Pearl sand, luminous coral colours and gentle current lanes. Reef fish, seahorse feeding routes and dangerous open-water crossings. |
| **Personal Display** | A safe, customisable shop showpiece populated by fish the player kept. Photograph, admire and swim as favourites. |

Handcraft geography; vary food, patrols and specimen traits. Anchor reflections to the actual water surface and lighting to the world as the camera moves.

## 3. Creatures with identity

Target eight playable species: **guppy, tetra, fancy goldfish, angelfish, cichlid, reef dartfish, clownfish and seahorse**. Extend the existing fish, angel and seahorse rigs. Each needs a recognisable silhouette, palette/pattern family, fin motion, acceleration, turning style, diet and shelter fit. Alternate colours alone do not constitute another species.

Guppies thread vegetation; tetras accelerate and benefit from schooling; goldfish forage; angelfish glide precisely; cichlids hunt smaller prey; dartfish sprint between cover; clownfish use specific refuges; seahorses hover upright and pick tiny food from currents. Predation eligibility follows body/mouth size and diet, visibly communicated before a bite.

Crabs, shrimp and starfish make the floor feel inhabited through feeding, cleaning, climbing and retreating. Later, optional short crab excursions let the player collect something under a ledge while the main fish waits safely in the nursery. Form changes happen at a refuge with a clear handoff, never as an escape exploit during a chase.

Ambient fish have routines: school, investigate food, yield territory, startle, shelter and settle. Predators patrol, notice, telegraph, pursue, search the last seen location and disengage. Their senses, body language and habitats explain their behaviour.

## 4. Swimming, hiding and tactile feedback

**Full two-dimensional swimming:** rise, dive, travel diagonally, curve and reverse. Analogue stick strength controls effort. Body orientation follows intended travel with believable species-specific articulation, while eyes, fins, spine and tail retain independent life. Preserve the responsive full-stick turn and gentle low-input movement. Seahorses remain upright while translating.

Use a left floating joystick, right burst and occasional contextual action. Support keyboard, simultaneous touch, left-handed layout and adjustable controls. Auto-bites occur at the mouth with clear contact.

The camera leads into travel and gently reframes growth. Landmarks preserve scale. Threat cues precede attacks; bites have a wind-up, recovery and damage grace period.

**Hiding must be physical and visible.** Draw shelter foliage both behind and in front of the fish. Foreground leaves soften only around the player's silhouette; surrounding foliage stays lush. Entering cover adds a restrained concealed indicator, muffles the soundscape and changes predator search behaviour. Shelter volumes and sight obstruction must match the rendered plants and rocks.

Food gives a mouth snap, glint and rounded sound. Bursts disturb leaves and particles; escapes bring musical relief. Damage compresses the body and nudges the camera. Reserve the largest celebrations for growth and sales.

## 5. Art direction and interface

**A luminous miniature world behind aquarium glass:** jewel-coloured fish, warm shafts of light, soft depth haze, rich foliage and tactile ceramic/stone. Fish remain the brightest and sharpest subject. Use clear focal lighting and restrained saturation around them.

Plants need curved surfaces, shaded undersides, translucent edges, veins, overlapping shadows and delayed stem-to-tip motion. Fish wakes and gentle currents move the scene coherently. Sand gains relief, contact shadows and shells; fish gain controlled iridescence, translucent fins and eye highlights.

Compose background, habitat, creatures, foreground cover and atmosphere as deliberate layers. Use cached shading, gradients, masks and controlled light effects. The scene must look premium with particles and bloom disabled.

Moving light should cross leaves, scales and sand consistently. Caustics soften with depth; contact shadows anchor objects. Suggest water volume through refraction and layered motion.

The UI uses deep petrol glass, warm ivory typography and small brass/pearl accents. Give panels bevels, contact shadows, considered spacing and consistent iconography. Gameplay shows a compact condition cluster, growth/value and contextual threat information. Stamina belongs around burst. Expand details on demand; keep the centre open for swimming.

Shop screens feel like specimen display cases: animated fish portraits, simple appraisal tags, tactile selection and an inviting tank carousel. Safe-area-aware controls have generous touch targets. Include separate sound/music controls, reduced motion, readable contrast and shape/text cues alongside colour. Development controls stay in developer access.

## 6. Sound that carries the mood

Use an authored, seamless ambient score: soft glass/plucked tones, warm sustained harmony, restrained bass and ample silence. A quiet tension layer fades in during a credible pursuit and resolves on escape. Each tank has a related musical identity. Feeding, turning, bubbles and sales form a consistent, gentle sonic vocabulary; repeated feeding sounds vary slightly and never become piercing.

Prefer a small set of pre-rendered music layers and reusable effects. Keep one audio owner, gesture unlock, pooled voices, bounded concurrency, smooth gain ramps and clean pause/resume. Load only the current tank's audio. Diagnose scheduling, duplicate playback and frame stalls before blaming or replacing a library.

## 7. Build on the actual project

**Verified baseline:** the main game lives in `src/games/importedAippy/upstream/src/`. Fish and plants are procedurally drawn with Canvas 2D; preserve and extend these rigs. SVG is useful for icons and authored shapes. Current vertical movement exists, but the finished swimming pose and handling need the full direction described above.

Start with `components/Aquarium.tsx` and the `utils/` player, ecology, camera, fish and plant modules. Active music uses Aippy `useSound`; Tone.js supplies effects. The older `hooks/useBackgroundMusic.ts` is not the active music path.

Evolve in place, separating simulation, rendering, audio and screens as they grow. Define species/tanks as data; separate shop progress from run state. Retain the scoped resolver and Aippy shell. Version saves and make sales atomic so refreshes cannot duplicate or lose payouts.

Useful tools, selected for a concrete job:

- **Existing Canvas 2D + React:** build the first slice here. Cache art, pool particles, limit React updates and reduce distant simulation frequency.
- **[PixiJS](https://pixijs.com/8.x/guides/concepts/performance-tips):** optional GPU rendering after profiling. Prove one tank preserves the fish before migration; filters and changing complex graphics have costs.
- **[GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/):** optional shop/reward choreography; simulation owns gameplay movement.
- **[Tone.js guidance](https://github.com/Tonejs/Tone.js/wiki/Performance):** balance scheduling latency with reliability; keep visual work out of audio callbacks.

Deliver scoped GitHub updates through the working Node/Vite import process, with changed paths and a direct Aippy prompt. This brief supersedes prototype goals in `spec.md` and historical recovery notes in `MEMORY.md` for product direction.

## 8. Build order and finish line

1. **Prove one complete loop:** Guppy Garden, expressive all-direction swimming, convincing cover, fair pursuit, growth choice, appraisal, sell/keep, persistent shop and retry. Finish its fish/plant/UI/audio treatment as the reference for everything else.
2. **Make choices matter:** distinct playable species, diets, adaptations, customer requests, collection and decorative progression.
3. **Expand the world:** remaining tanks, predator personalities, currents and creature side excursions, each with its own visual and musical identity.
4. **Ship the finish:** onboarding through play, settings/accessibility, save migration, interruption recovery, responsive layouts and sustained mobile performance.

Release targets: 60 fps on representative mid-range phones, stable 30 fps fallback, clean audio through busy ten-minute sessions, reliable pause/resume, readable danger/cover and a first sale without a manual. Preserve input, fish articulation and fair simulation when reducing decorative cost.

**Worker rule:** implement the requested slice, consulting the relevant sections here. Do not treat the whole destination as one task or describe planned features as already built. Update this brief only when the agreed product direction changes.
