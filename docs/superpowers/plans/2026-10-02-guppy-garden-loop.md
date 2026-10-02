# Guppy Garden Loop Implementation Plan

> **For agentic workers:** Use executing-plans or subagent-driven-development. Track the tasks below; current user has authorised execution and delegation.

**Goal:** Deliver a playable grow–appraise–sell/keep loop in the existing aquarium.
**Architecture:** Pure versioned boutique data model, existing procedural simulation, focused React shop/HUD components. Persist whole profile transactions atomically; pause live simulation during menus and choices.
**Tech Stack:** Existing React, Canvas2D, Aippy audio and Tone; native Node tests and Playwright.
**Spec:** final-product.md sections1,4,5,7,8. This slice implements first milestone foundations; extra tanks/species and full score production follow later.

## Global Constraints
- Main source remains src/games/importedAippy/upstream/src/; preserve scoped aliases and Aippy integration.
- Keep smooth procedural fish animation and responsive horizontal turns.
- Persistent shop state remains separate from mutable simulation; no duplicate sales.
- Deliver scoped GitHub files with Node/Vite import prompt.

## Review Focus
- Double taps/stale run IDs must not duplicate money or kept fish.
- Storage corruption/quota failures must preserve a playable run and explain failed saving.
- Resize, backgrounding and menus must not reset a run or advance hunger.
- Vertical/diagonal input must orient the fish and preserve equal max speed.
- Nursery cover must match physical bounds and keep the player readable.

### Task1: Boutique persistence
Files: utils/boutique.ts; tests/boutique.test.ts.
Interfaces: Specimen, ActiveRun, BoutiqueSave; create/load/write save, appraiseFish, getStage, settleRun.
- [x] Write and run tests for duplicate sale, keep, stale IDs, corrupt saves and storage failure.
- [x] Implement immutable settlement and versioned single-write persistence.
- [x] Root reruns native Node tests and integrates save callbacks.

### Task2: Swimming and foliage
Files: utils/playerSurvival.ts, plantRender.ts, nurseryCover.ts; tests/player-swimming.test.ts.
Interfaces: optional survival speed/stamina modifiers; drawPlant layer argument; isInNursery and drawNurseryCover.
- [x] Test analogue speed, diagonal limits, vertical pitch, both turn directions and frame rates.
- [x] Add shaded rear/front leaf layers and bounded local concealment fade.
- [x] Verify integration against screenshot and mobile control input.

### Task3: Complete garden loop
Files: components/Aquarium.tsx, GardenHUD.tsx, BoutiqueScreen.tsx, FishPortrait.tsx, GardenUI.css; utils/specimenAppearance.ts; App.tsx.
- [x] Resume/save an active specimen, preserving growth/stats/position across reload and resize.
- [x] Add growth choices at35/75%, update appearance and swim modifiers.
- [x] Pause during appraisal/choices/shop/receipts; sell or keep only an eligible live fish inside the nursery.
- [x] Add shop, specimen portraits, safe playable display, coins and clear nursery guidance.
- [x] Fix mouth-facing eligibility and directional camera lead for vertical swimming.
- [x] Build and exercise sell, keep, reload, resize, display and pause in a mobile viewport.

### Task4: Verify and deliver
- [x] Run all Node tests and production build; inspect runtime errors and screenshots.
- [x] Have a fresh agent review changed files for the review-focus cases; fix material findings once.
- [x] Publish the scoped files and update manifest; provide one direct Node import prompt.

## Validation record
- 20 native behaviour tests passed; scoped TypeScript check and production build passed.
- Chromium mobile viewport exercised sale/new run/reload, keep/naming/display/return, both growth choices, vertical input, resize/menu pause and unavailable-storage/display preservation.
- Review found a remount could discard unsaved progress. The regression failed against the earlier build; keeping the live garden mounted preserved position in the updated build.
- Mobile garden and display screenshots inspected. Headless audio output disabled; music quality and device performance remain device checks.
- Browser runner: build first, run tests/garden-browser.cjs with installed Playwright; CHROMIUM_EXECUTABLE and PLAYWRIGHT_MODULE_PATH can select external test tools. SCREENSHOTS optionally saves captures.
- This is the first playable slice, not the complete four-tank/eight-species product.
