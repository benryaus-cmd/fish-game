Import the AquaLume update using the same working Node 22 build-time import method.

Fetch https://raw.githubusercontent.com/benryaus-cmd/fish-game/main/updates/living-aquarium.json using Node fetch. Download all 36 files listed in files, using baseUrl + each path, into staging. Await every download before replacing the exact listed paths in the current project. If a download fails, leave the current files intact.

Use the existing awaited Vite import pipeline before game modules resolve. Replace the main game's existing files in place. Preserve saved fish, credits, breeding, settings, the Aippy shell and its README. Do not create another game, use an iframe, or add runtime GitHub fetching. No SHA/hash step.

Use a fresh .fish-living-aquarium-v1-applied marker only after all replacements succeed; do not reuse an older update marker. Complete the import in this task.
