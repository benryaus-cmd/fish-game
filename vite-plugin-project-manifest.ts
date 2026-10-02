import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const VIRTUAL_MODULE_ID = 'virtual:project-file-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID;

const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage',
  '.staging', 'cache', '.cache', 'tmp', '.tmp', '.vite',
  '.pnpm', '.idea', '.vscode-test',
]);

const EXCLUDED_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /credential/i,
  /secret/i,
  /token/i,
  /\.crt$/i,
  /\.cer$/i,
];

// Text extensions treated as text without a UTF-8 sniff
const KNOWN_TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss',
  '.less', '.html', '.htm', '.md', '.mdx', '.txt', '.yml', '.yaml', '.xml',
  '.svg', '.csv', '.toml', '.ini', '.cfg', '.conf', '.sh', '.bash', '.zsh',
  '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc', '.eslintrc',
  '.d.ts', '.map', '.graphql', '.gql', '.sql', '.vue', '.svelte', '.lock',
]);

const MAX_TEXT_BYTES = 8 * 1024 * 1024;

function isExcludedName(name: string): boolean {
  if (EXCLUDED_FILE_PATTERNS.some((re) => re.test(name))) return true;
  const ext = path.extname(name).toLowerCase();
  if (ext === '.env' || ext === '.env.*') return true;
  return false;
}

function looksLikeText(buf: Buffer, ext: string): boolean {
  if (KNOWN_TEXT_EXTS.has(ext)) return true;
  if (ext === '') {
    // no extension: sniff for NUL bytes / high proportion of non-printable
    const sample = buf.subarray(0, Math.min(buf.length, 4096));
    let suspicious = 0;
    for (const b of sample) {
      if (b === 0) return false;
      if (b < 9 || (b > 13 && b < 32)) suspicious++;
    }
    return suspicious / Math.max(sample.length, 1) < 0.1;
  }
  return false;
}

async function walk(
  rootDir: string,
  rel: string,
  files: { path: string; abs: string }[],
  folders: Set<string>,
): Promise<void> {
  const abs = rel ? path.join(rootDir, rel) : rootDir;
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      folders.add(relPath);
      await walk(rootDir, relPath, files, folders);
    } else if (entry.isFile()) {
      if (isExcludedName(entry.name)) continue;
      files.push({ path: relPath, abs: path.join(rootDir, relPath) });
    }
  }
}

async function buildManifest(rootDir: string): Promise<string> {
  const files: { path: string; abs: string }[] = [];
  const folders = new Set<string>();
  await walk(rootDir, '', files, folders);

  const entries = await Promise.all(
    files.map(async ({ path: relPath, abs }) => {
      const name = path.basename(relPath);
      const dir = path.dirname(relPath).split('\\').join('/');
      const ext = path.extname(name).toLowerCase();
      let size = 0;
      let status = 'FAILED';
      let content: string | undefined;
      let error: string | undefined;
      try {
        const buf = await fs.readFile(abs);
        size = buf.byteLength;
        if (size === 0) {
          status = 'EMPTY';
        } else if (size > MAX_TEXT_BYTES) {
          status = 'BINARY';
        } else if (looksLikeText(buf, ext)) {
          status = 'TEXT';
          content = buf.toString('utf8');
        } else {
          status = 'BINARY';
        }
      } catch (e) {
        status = 'FAILED';
        error = e instanceof Error ? e.message : String(e);
      }
      return {
        path: relPath,
        name,
        dir,
        ext,
        size,
        status,
        ...(error !== undefined ? { error } : {}),
        ...(content !== undefined ? { content } : {}),
      };
    }),
  );

  const manifest = {
    generatedAt: Date.now(),
    files: entries,
    folders: Array.from(folders).sort(),
  };
  return JSON.stringify(manifest);
}

function snapshotHash(): string {
  try {
    return crypto.createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12);
  } catch {
    return 'dev';
  }
}

export function projectFileManifestPlugin() {
  let manifestPromise: Promise<string> | null = null;
  let manifestKey = '';
  return {
    name: 'aippy-project-file-manifest',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
      return null;
    },
    async load(id: string) {
      if (id !== RESOLVED_ID) return null;
      // Re-scan once per dev server session / build run
      const key = process.env.NODE_ENV ?? 'dev';
      if (!manifestPromise || key !== manifestKey) {
        manifestKey = key;
        manifestPromise = buildManifest(path.resolve(import.meta.dirname)).catch((e: unknown) => {
          console.error('[Aippy] project manifest scan failed:', e);
          return JSON.stringify({ generatedAt: Date.now(), files: [], folders: [] });
        });
      }
      const json = await manifestPromise;
      void snapshotHash();
      return `export default ${json};`;
    },
  };
}