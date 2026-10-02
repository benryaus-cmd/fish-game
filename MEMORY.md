<state_snapshot>
  <planning>
    <overall_goal>
      Recover and mount the genuine AquaLume source code from the development-preview source map, ensuring full functional parity with the original aquarium simulation.
    </overall_goal>

    <active_constraints>
      - Must use scoped resolution to isolate upstream imports from host imports.
      - Must preserve the original 'src/src' directory structure.
      - Must handle source map normalization for various path prefixes (build, workspace, relative).
      - Must not modify the host shell or create an iframe for the game.
    </active_constraints>

    <task_state>
      1. [DONE] Implement robust path normalization in vite-plugin-aippy-source-import.ts.
      2. [DONE] Configure scoped resolution in vite.config.ts to prevent alias conflicts.
      3. [DONE] Execute recovery and promote files to src/games/importedAippy/upstream/.
      4. [DONE] Integrate recovered App into ImportedAippyGame.tsx.
    </task_state>
  </planning>

  <engineering>
    <key_knowledge>
      - Recovery uses a custom Vite plugin that performs source map inspection and file reconstruction.
      - Path normalization handles doubled 'src/src' structures by identifying the first 'src' segment.
      - Scoped resolution is enforced by checking importer paths against the 'upstream' directory.
      - Asset mirroring is handled by scanning recovered source content for CDN URLs and downloading them to the public directory.
    </key_knowledge>

    <artifact_trail>
      - vite-plugin-aippy-source-import.ts: Implemented full recovery logic, path normalization, and scoped resolver.
      - vite.config.ts: Refactored alias configuration to support scoped resolution.
      - src/games/importedAippy/ImportedAippyGame.tsx: Updated to mount the recovered App component.
    </artifact_trail>

    <file_system_state>
      - MODIFIED: vite-plugin-aippy-source-import.ts, vite.config.ts, src/games/importedAippy/ImportedAippyGame.tsx
      - CREATED: src/games/importedAippy/upstream/ (populated with 103 files)
    </file_system_state>

    <recent_actions>
      - write_file vite-plugin-aippy-source-import.ts → implemented full recovery and scoped resolver
      - replace_file_content vite.config.ts → removed global alias conflict
      - write_file src/games/importedAippy/ImportedAippyGame.tsx → integrated recovered App
    </recent_actions>
  </engineering>
</state_snapshot>