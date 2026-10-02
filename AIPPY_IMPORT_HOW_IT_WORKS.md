# AquaLume Source Recovery — How It Works

## 1. Project Identification & Metadata

- **Project Name**: AquaLume
- **Confirmed Project ID**: 6878311
- **Share URL**: https://share.aippy.ai/p/vGW7
- **Share Code**: vGW7
- **Confirmed Development Preview Origin**: https://preview--edf115d6-b963-4dda-8894-17f7448893a6.aippy.live
- **Owner Name**: mohammad2000
- **Owner UID**: 5558584
- **Publish Status**: 2

---

## 2. API Endpoints & Discovery

### Share Data Endpoint
- `GET https://api.aippy.ai/api/share/data/vGW7`
- **Purpose**: Used exclusively for project identity validation and confirmation.
- **Rule**: If `projectId` / `project_id` is returned, it must strictly match `6878311`. The share webpage itself is NOT treated as application source.

### Template Info Endpoint
- `GET https://api.aippy.ai/api/template/info?projectId=6878311`
- **Purpose**: Discovers project metadata including `ownerId`, `ownerName`, `publishStatus`, `previewVersion`, and `previewUrl`.
- **Query Hygiene**: Duplicated query strings (such as `?v=...?v=...`) are stripped to prevent malformed URL resolutions.

### Development Preview as True Source-Recovery Target
The development preview (and not the production CDN or share viewer) is the source-recovery target. If `previewUrl` is returned and valid, it is selected with `previewResolutionSource = 'template-info'`. If template-info is unreachable or does not provide a valid preview URL, the confirmed preview origin `https://preview--edf115d6-b963-4dda-8894-17f7448893a6.aippy.live` serves as the guaranteed fallback (`previewResolutionSource = 'confirmed-preview-fallback'`).

---

## 3. Build-Time Importer Pipeline (`vite-plugin-aippy-source-import.ts`)

Recovery is executed during the Vite build pipeline before ordinary module resolution using native `fetch` (Node 20+), `node:fs/promises`, `node:path`, and `node:crypto`.

### Why Production Bundles Are Not Used
Production builds minify, mangle identifiers, inline constants, and frequently omit full source maps. In contrast, the Aippy development preview preserves complete source maps with full `sourcesContent`, allowing 100% faithful reconstruction of original TypeScript, React components, hooks, utilities, and configuration files.

### Why Node 20+ Does Not Need a Browser Relay
Native web-standard `fetch`, `AbortController`, `Blob`, and `FormData` are built into Node 20+, without requiring headless browsers, Puppeteer, or Cloudflare worker relays. Direct HTTP streaming with exponential backoff and timeout safeguards provides reliable retrieval.

### Pipeline Execution Steps
1. **Resolution & Fetch**: Directly requests the development preview HTML.
2. **Script Discovery**: Parses HTML `<script>` tags, inspecting inline scripts and resolving external bundles against the preview base URL.
3. **Source Map Extraction**: Locates `//# sourceMappingURL=...` in script bundles, supporting relative URLs, absolute URLs, and Base64/URL-encoded `data:` URIs, with conventional `.map` fallback.
4. **Source Reconstruction**: Parses `sources` and `sourcesContent` from the source map JSON:
   - Strips build prefixes (`http://`, `webpack:///`, `vite:///`, `/@fs/`).
   - Normalizes directory paths and directory traversals (`.` and `..`).
   - Filters out runtime and bundling internals (`node_modules`, `@vitejs`, `vite/`, `react-refresh`, `browser-external`, `typescript/lib`, `virtual:`).
   - Reconstructs all project files under `src/**`.
5. **Staging & Integrity Check**: Reconstructed files are written to `src/games/importedAippy/.staging/` first. Paths are verified against the confirmed 103-file baseline.
6. **Promotion**: Once validated, staged files are promoted to `src/games/importedAippy/upstream/` as an untouched upstream snapshot.
7. **Asset Mirroring**: Scans all recovered code for public asset URLs (`https://cdn.aippy.ai/asset/...`), downloads binary assets into `public/imported-aippy-assets/`, and produces `asset-manifest.json`.
8. **Status Generation**: Outputs `src/games/importedAippy/import-status.json` with comprehensive audit information.

---

## 4. Confirmed 103-File Source Baseline

All 103 files confirmed by Project Lens from the development preview source map:

```
src/App.tsx
src/main.tsx
src/src/components/AngelfishPreview.tsx
src/src/components/Aquarium.tsx
src/src/components/CastlePreview.tsx
src/src/components/CoinCounter.tsx
src/src/components/CrabPreview.tsx
src/src/components/DecorPreviews.tsx
src/src/components/FeedButton.tsx
src/src/components/FilterPreview.tsx
src/src/components/SeahorsePreview.tsx
src/src/components/ShopButton.tsx
src/src/components/ShopCard.tsx
src/src/components/ShopIcons.tsx
src/src/components/ShopPanel.tsx
src/src/components/ShrimpPreview.tsx
src/src/components/SoundButton.tsx
src/src/components/StarfishPreview.tsx
src/src/components/UiIcons.tsx
src/src/config/tweaksConfig.json
src/src/hooks/useBackgroundMusic.ts
src/src/hooks/useCanvasDPI.ts
src/src/hooks/useGameLoop.ts
src/src/utils/angelBody.ts
src/src/utils/angelBrain.ts
src/src/utils/angelColony.ts
src/src/utils/angelFace.ts
src/src/utils/angelFins.ts
src/src/utils/angelHull.ts
src/src/utils/angelLimbs.ts
src/src/utils/angelModel.ts
src/src/utils/angelPalette.ts
src/src/utils/angelProject.ts
src/src/utils/angelRender.ts
src/src/utils/angelTurn.ts
src/src/utils/aquaBubbles.ts
src/src/utils/aquaMotes.ts
src/src/utils/aquaScene.ts
src/src/utils/aquaTextures.ts
src/src/utils/castleRender.ts
src/src/utils/coinFx.ts
src/src/utils/colorfulRender.ts
src/src/utils/colorUtils.ts
src/src/utils/crabBrain.ts
src/src/utils/crabClaws.ts
src/src/utils/crabColony.ts
src/src/utils/crabFeeding.ts
src/src/utils/crabFeet.ts
src/src/utils/crabLegs.ts
src/src/utils/crabModel.ts
src/src/utils/crabPose.ts
src/src/utils/crabRender.ts
src/src/utils/crabRig.ts
src/src/utils/crabShell.ts
src/src/utils/decorLayout.ts
src/src/utils/drawHelpers.ts
src/src/utils/economy.ts
src/src/utils/feedFx.ts
src/src/utils/feedGate.ts
src/src/utils/filterRender.ts
src/src/utils/fishBrain.ts
src/src/utils/fishFeeding.ts
src/src/utils/fishFins.ts
src/src/utils/fishFood.ts
src/src/utils/fishModel.ts
src/src/utils/fishRender.ts
src/src/utils/fishSchool.ts
src/src/utils/fishSpawn.ts
src/src/utils/fishSpecies.ts
src/src/utils/foodRender.ts
src/src/utils/plantRender.ts
src/src/utils/rockRender.ts
src/src/utils/sandDetails.ts
src/src/utils/sandLayer.ts
src/src/utils/sandShading.ts
src/src/utils/seahorseBrain.ts
src/src/utils/seahorseColony.ts
src/src/utils/seahorseFace.ts
src/src/utils/seahorseFins.ts
src/src/utils/seahorseGeom.ts
src/src/utils/seahorseModel.ts
src/src/utils/seahorseMotion.ts
src/src/utils/seahorsePalette.ts
src/src/utils/seahorsePath.ts
src/src/utils/seahorseRender.ts
src/src/utils/seahorseSkin.ts
src/src/utils/seahorseTurn.ts
src/src/utils/shrimpBrain.ts
src/src/utils/shrimpColony.ts
src/src/utils/shrimpFeed.ts
src/src/utils/shrimpLimbs.ts
src/src/utils/shrimpModel.ts
src/src/utils/shrimpMotion.ts
src/src/utils/shrimpRender.ts
src/src/utils/shrimpRig.ts
src/src/utils/shrimpTurn.ts
src/src/utils/starfishBrain.ts
src/src/utils/starfishColony.ts
src/src/utils/starfishModel.ts
src/src/utils/starfishRender.ts
src/src/utils/starfishShape.ts
src/src/utils/waterBackdrop.ts
src/src/utils/waterFilter.ts
```

### Import Status
- **Baseline Count**: 103 files
- **Recovered Expected Count**: 103 files
- **Missing Expected Files**: 0
- **Status**: COMPLETE

---

## 5. Architecture & Adapter Boundaries

The host application and the recovered upstream snapshot maintain strict boundaries:

```
host src/main.tsx
  └── mounts host src/App.tsx (single React root)
        └── renders ImportedAippyGame.tsx (host adapter + error boundary)
              └── mounts recovered AquaLume App (upstream/src/App.tsx)
```

- **Upstream Protection**: The `src/games/importedAippy/upstream/` directory is treated as an immutable snapshot. No manual edits, reformatting, or renaming are performed within it.
- **Root Protection**: Recovered `main.tsx` is intentionally NOT executed to prevent duplicate `createRoot()` calls and conflicting DOM mount operations.
- **Alias Resolution**: The Vite build-time plugin dynamically resolves `@/` imports from within `upstream/`, checking both `upstream/src` and nested `upstream/src/src` hierarchies to support genuine original import paths without file movement.
- **Asset Mirroring**: Public CDN assets are mirrored locally into `public/imported-aippy-assets/` with binary byte integrity and SHA256 verification.

---

## 6. Snapshot Refresh & Safety
If a newer preview version of project 6878311 is published:
1. Re-running the build checks `api.aippy.ai/api/template/info?projectId=6878311` for updated `previewVersion`.
2. Staging ensures an in-progress or failed network request never destroys an existing `COMPLETE` snapshot.
3. Partial recoveries will not overwrite a complete snapshot.