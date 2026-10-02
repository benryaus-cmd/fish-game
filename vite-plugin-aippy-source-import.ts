import type { Plugin } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

export const IMPORT_ROOT = 'src/games/importedAippy';
export const UPSTREAM_ROOT = 'src/games/importedAippy/upstream';

const RECOVERED_AQUA_INIT_ID = 'virtual:recovered-aqua-init';
const RESOLVED_AQUA_INIT_ID = '\0' + RECOVERED_AQUA_INIT_ID;

export function aippySourceImportPlugin(): Plugin {
  return {
    name: 'aippy-source-import',
    enforce: 'pre',

    async resolveId(source, importer) {
      // Virtual init module for SWIM side effects and tweaks setup
      if (source === RECOVERED_AQUA_INIT_ID) {
        return RESOLVED_AQUA_INIT_ID;
      }

      const normImporter = importer ? importer.replace(/\\/g, '/') : '';
      const isUpstream =
        normImporter.includes('/src/games/importedAippy/upstream/') ||
        normImporter.includes('/upstream/');

      // Recovered App entry import from ImportedAippyGame
      if (
        source === './upstream/src/App' &&
        normImporter.endsWith('/src/games/importedAippy/ImportedAippyGame.tsx')
      ) {
        const recoveredAppBase = path.resolve(path.dirname(importer!), source);
        for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
          const target = recoveredAppBase + ext;
          try {
            const stat = await fs.stat(target);
            if (stat.isFile()) {
              return target;
            }
          } catch {
            // continue
          }
        }
        throw new Error('[Aippy] Could not resolve recovered SWIM App at ' + recoveredAppBase);
      }

      // Handle @/ imports with strict importer scoping
      if (source.startsWith('@/')) {
        const subPath = source.slice(2);
        const extensions = [
          '',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '.json',
          '/index.tsx',
          '/index.ts',
          '/index.js',
          '/index.json',
        ];

        if (!isUpstream) {
          // Host imports: resolve strictly against host src/
          const hostBase = path.resolve(process.cwd(), 'src', subPath);
          for (const ext of extensions) {
            const target = hostBase + ext;
            try {
              const stat = await fs.stat(target);
              if (stat.isFile()) {
                return target;
              }
            } catch {
              // try next
            }
          }
          return null;
        } else {
          // Upstream imports: resolve strictly against recovered SWIM source tree
          const upstreamCandidates = [
            path.resolve(process.cwd(), UPSTREAM_ROOT, 'src', subPath),
            path.resolve(process.cwd(), UPSTREAM_ROOT, 'src/src', subPath),
            path.resolve(process.cwd(), UPSTREAM_ROOT, subPath),
          ];

          for (const candidate of upstreamCandidates) {
            for (const ext of extensions) {
              const target = candidate + ext;
              try {
                const stat = await fs.stat(target);
                if (stat.isFile()) {
                  return target;
                }
              } catch {
                // try next
              }
            }
          }

          // Generated asset registry lives in host src/config and is shared with the game build.
          // Keep all other upstream aliases scoped to the editable game source tree.
          if (subPath === 'config/assets' || subPath === 'config/assets.json') {
            const assetRegistry = path.resolve(process.cwd(), 'src', subPath);
            for (const ext of extensions) {
              const target = assetRegistry + ext;
              try {
                const stat = await fs.stat(target);
                if (stat.isFile()) {
                  return target;
                }
              } catch {
                // try next
              }
            }
          }

          // Refuse fallback to host src to prevent silent cross-talk
          throw new Error(
            `[Aippy] Scoped resolution error: Upstream module '${source}' imported from '${normImporter}' could not be resolved within upstream source tree.`
          );
        }
      }

      // Handle relative imports within upstream
      if (isUpstream && (source.startsWith('./') || source.startsWith('../'))) {
        const dir = path.dirname(importer!);
        const resolved = path.resolve(dir, source);
        const extensions = [
          '',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '.json',
          '/index.tsx',
          '/index.ts',
          '/index.js',
          '/index.json',
        ];
        for (const ext of extensions) {
          const target = resolved + ext;
          try {
            const stat = await fs.stat(target);
            if (stat.isFile()) {
              return target;
            }
          } catch {
            // try next
          }
        }
      }

      return null;
    },

    async load(id) {
      if (id === RESOLVED_AQUA_INIT_ID) {
        const tweaksPath = path.resolve(
          process.cwd(),
          UPSTREAM_ROOT,
          'src/config/tweaksConfig.json'
        );

        let initCode = 'console.log("[Aippy] SWIM runtime initialization mounted.");\n';

        let hasTweaks = false;
        try {
          const stat = await fs.stat(tweaksPath);
          if (stat.isFile()) hasTweaks = true;
        } catch {
          // not found
        }

        if (hasTweaks) {
          const tweaksRaw = await fs.readFile(tweaksPath, 'utf8');
          initCode += `
import { aippyTweaks } from '@aippy/runtime/tweaks';
const tweaksConfig = ${tweaksRaw};
try {
  aippyTweaks(tweaksConfig);
} catch (e) {
  console.warn('[Aippy] Tweaks initialization notice:', e);
}
`;
        }

        return initCode;
      }

      return null;
    },
  };
}