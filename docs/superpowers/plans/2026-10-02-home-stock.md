# Living Home and Stock Implementation Plan

> **For agentic workers:** Root integrates with independent helpers through dispatching-parallel-agents. Read your task brief, not the entire plan. User requested the next implementation with workers; continue through publishing.

**Goal:** Turn the collection into the launch screen and make each new outing an explicit stock choice.
**Architecture:** Additive atomic profile, procedural home canvas and React sheets; retain a paused outing and one App audio owner.
**Tech Stack:** Existing React, Canvas2D, Node tests and Chromium.
**Spec:** docs/superpowers/specs/2026-10-02-home-stock-design.md; final-product.md sections 1–2, 8.

## Global Constraints
- Evolve src/games/importedAippy/upstream/src/ in place; no runtime dependencies or host wiring changes.
- Preserve legacy credits, resident identity/colour/traits, active run and transaction IDs.
- Purchase writes debit and active fish atomically; failed saving cannot complete purchases.
- Home residents cannot be eaten, hurt, starved or lost. Active outings pause at home.
- Minimum 44 CSS-pixel controls; ivory/petrol/brass styling; no fake future-feature controls.
- Helpers own non-overlapping files, do not commit or spawn helpers. Root verifies and publishes one manifest.

## Review Focus
- Legacy empty, populated and active saves preserve all meaningful data.
- Insufficient funds, rapid repeat stock taps and storage failure cannot lose credits or overwrite a run.
- Unsaved outing survives a home visit and return without remounting.
- Selecting and swimming a resident never changes resident/profile condition.
- Dialogs and controls fit 320px and short 390×420 viewports.

### Task 1: Stock and persistence model
Own utils/boutique.ts, new utils/stockCatalog.ts, utils/specimenAppearance.ts; tests/home-stock.test.ts. Existing boutique tests remain valid.
Interfaces: StockId = ordinary | sunburst | blueveil | legacy; Specimen adds optional origin, inherited {colorFamily: silver | warm | cool, finForm: short | fan | veil, parents:string[]}; BoutiqueSave adds optional placements:Record<string,'home'>. Export STOCK_CATALOG array of {id excluding legacy,name,price,color,accent,finForm,colorFamily,potential:string,description:string}; getStock(id). createSpecimen(stockId='ordinary', id?) makes a healthy fry with no acquired traits. startStockRun(save, stockId, runId) returns unchanged save on invalid/funds/replay/active run; success atomically subtracts price and creates {specimen,x:380,y:1520,stamina:100}. settleRun keep adds home placement. read/write migrate legacy missing metadata as legacy, preserving appearance.
- [x] Write meaningful failing purchase/migration/replay/placement tests and observe failures.
- [x] Implement catalog, migration/transactions and distinct inherited appearance; prove existing/new tests pass.
- [x] Write .superpowers/home-model-report.md with exact commands/results and concerns.

### Task 2: Procedural safe home canvas
Own new components/HomeTank.tsx, utils/homeScene.ts; tests/home-scene.test.ts.
HomeTank props {width:number,height:number,specimens:Specimen[],controlledId:string|null,onSelect:(id:string)=>void,paused?:boolean}. Canvas and optional touch controls; stable autonomous fish with existing rigs and identity palettes, shaded planting/sand/rocks/light, tap picking in CSS coordinates. Controlled fish uses directional keyboard or analogue joystick (all directions), remains in bounds; return to watching governed by controlledId. Show at most 24 residents, ensuring controlled fish present. Pure home scene APIs permit native geometry checks; no simulation/profile mutation of residents. Cleanup RAF/input listeners; pause hidden document/sheet; respect reduced motion.
- [x] Write failing identity/safety/bounds/control tests, observe failures and implement scene.
- [x] Implement canvas/control/picking with 44px controls and mobile resizing.
- [x] Write .superpowers/home-scene-report.md with test evidence and interface notes.

### Task 3: Home and stock React interface
Own new components/HomeScreen.tsx, StockSheet.tsx, HomeUI.css; optional tests/home-ui-browser.cjs only. Consume interfaces above when available; do not edit worker files.
HomeScreen props {width,height,profile,saved,onRaise:()=>void,onContinue:()=>void,onSound:()=>void,sound:boolean,onInteract:()=>void}. Render HomeTank, wallet, primary empty or resume action, quiet Raise/Collection/Watch dock, scrollable paged collection (6/page), selected resident sheet and safe Swim as this fish/Back to watching actions. Show count when more than 24; no fictional residents in empty tank. StockSheet props {profile,saved,onChoose:(id:StockId)=>void,onClose:()=>void}. Preview actual catalog specimens, price/potential/current stats/diet/destination; disable unaffordable purchases and all choices while active run exists. On active run offer close/continue guidance. Minimum targets and short viewport reachable actions.
- [x] Add a failing browser flow for empty launch/stock choice and inspect baseline failure if useful (root also owns integrated journey).
- [x] Implement authored UI with explicit contrast, accessible sheets/controls and no future fake tabs.
- [x] Write .superpowers/home-ui-report.md with changed files and layout checks.

### Task 4: Root integration, evidence and publish
Own App.tsx, Aquarium.tsx, new hooks/useAquariumAudio.ts, tests/home-stock-browser.cjs; docs/manifest.
- [x] Add failing built-browser checks for launch/resume, purchase, sale/keep return, and failed-storage home roundtrip.
- [x] Keep active Aquarium mounted while home visible; gate its visibility/pause; create only purchased/selected runs. Move audio to one App owner; route receipts/defeat to home/stock instead of restart.
- [x] Full Node suite, scoped TypeScript, production build, browser journeys and mobile screenshots; one fresh combined review and resolve material findings.
- [x] Publish updates/home-stock.json containing complete changed-source set, retrieve public manifest and provide Node/Vite import prompt.
