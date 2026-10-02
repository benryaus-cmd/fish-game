# Exotic Aquarium Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans for assigned tasks. Root integrates and publishes one scoped update.

**Goal:** Unify day/night appearance and expand living fish, inherited silhouettes and bottom ecology.
**Architecture:** Reuse existing procedural bases and shared care/breeding profile. Model helpers define inherited axes; one render adapter selects the existing body renderers. Root owns Aquarium integration and shared UI.
**Tech Stack:** React, TypeScript, Canvas2D, existing Vite/Node import.
**Spec:** docs/superpowers/specs/2026-10-02-exotic-aquarium-design.md

## Global constraints

Canonical game: src/games/importedAippy/upstream/src/. Preserve saved identity, purchases, exact-once breeding, explicit EAT and approved swimming. No second game or product dependencies. Shared getTankPalette(daylight) endpoints; inherited bodyShape starter/colorful/angel, finStyle rounded/triangle/sail, colorPattern solid/rainbow/banded/koi. Existing short/fan/veil tail forms remain separate.

## Review focus

- Old saves migrate without dropping residents, maturity or pending offspring.
- Cross-family axes persist once; replay never rerolls or duplicates.
- Genuine angel anatomy retains coherent dives and fits portraits/tank bounds.
- Shrimp require deliberate size-gated eating; crab never attacks inside nursery or from unlimited height.
- Home and growing backgrounds visibly follow identical day/night endpoints; moving caustics stay on receivers.

### Task 1: Model worker
- [x] Test migration, hybrid axes, replay and care quality before implementing stockCatalog/boutique/breeding/specimenCare changes.
- [x] Add four priced stocks and validated additive fields; expose specimenBodyShape/specimenFinStyle/specimenPattern and careColourQuality.
- [x] Run targeted native tests and communicate exact contracts.

### Task 2: Render worker
- [x] Use original starter/colorful/angel anatomy, independent fin forms and inherited patterns; expose drawSpecimenFish and specimenMouthPoint.
- [x] Fit portraits and preserve all-direction pose; add geometry/pixel checks and inspect comparison renders.

### Task 3: Lighting worker
- [x] Add shared getTankPalette, true cached home endpoint backgrounds and phase-matched decor.
- [x] Integrate owned render adapter and care-sensitive appearance cache; verify real day/night pixels.

### Task 4: Food/ecology worker
- [x] Improve existing food material rendering; retain newborn food interaction.
- [x] Add bounded original shrimp/crab rigs with update/bite/draw APIs and tested telegraph, reach, safety and cooldown.

### Task 5: Root integration and delivery
- [x] Wire palettes, render/mouth adapters and bottom ecology into Aquarium; update stock/breeding/care UI to all families.
- [x] Run scoped TypeScript, build, native tests and relevant built journeys; inspect screenshots, resolve independent review findings.
- [x] Update product/worker docs and publish one source manifest plus direct Node import prompt. Preserve existing Aippy saves and shell.
