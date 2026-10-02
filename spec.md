# AquaLume Survival

## Concept
Control a procedurally animated fish in a living aquarium, growing by eating smaller prey while avoiding predators and seeking shelter.

## Gameplay
- **Core Loop**: Swim, burst, and hunt smaller fish to grow; manage hunger, stamina, and health; retreat to nursery plants to recover.
- **Goal**: Grow to maximum size while surviving predator encounters.
- **Fail State**: Health reaches zero from predator attacks or starvation.
- **Special Mechanics**:
  - **Procedural Steering**: Player-controlled fish retains original procedural body waves, fin animation, and turning lag.
  - **Survival Systems**: Hunger drains over time; stamina limits burst movement; nursery plants provide predator-proof shelter.
  - **Predator AI**: Simple pursuit-and-disengage logic with line-of-sight awareness.

## Visual & Audio
- **Theme**: Deep, vibrant underwater aquarium with naturalistic lighting and soft shadows.
- **Art Style**: Procedural organic forms, fluid motion, soft gradients, and high-fidelity particle effects.
- **Layout**: Full-screen canvas with floating joystick (left) and burst button (right); HUD at top corners.
- **Key Visuals**: Recovered procedural fish, plants, rocks, and castle; code-drawn HUD elements.
- **Audio Mood**: Ambient underwater hum, crisp bubble pops, and subtle chimes for growth/eating.

## Feedback & Juice
- **Eating**: Mouth snap, particle glints, and growth pulse.
- **Burst**: Bubble wake and tail kick.
- **Damage**: Body flinch, camera shake, and health loss.

## Leaderboard
- **Enabled**: Yes
- **Metric**: growth progress
- **Unit**: %
- **Sort**: DESC
- **Scope**: global
- **Reason**: Growth progress provides a clear, competitive metric for survival.

## Assets
| Type | Name | Params | Description | Url |
|------|------|--------|-------------|-----|
| image-icon | cog | 44x44 | Developer access cog icon | https://cdn.aippy.ai/asset/295d4d61742d4518ad52fda8d20ffd58.png?x-oss-process=image/format,webp |
| synth | bite | 100ms | Crisp underwater snap with resonance | |
| synth | burst | 200ms | Low-frequency bubble pop | |
| music | ambient | - | Soft, rhythmic underwater soundscape | https://cdn.aippy.ai/asset/dda7a17ff3dc4e1fb2f7a7d11f69fb4b.mp3 |