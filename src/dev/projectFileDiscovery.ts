import type { ProjectFileEntry, ProjectManifest } from '@/types/projectFiles';

export const decodeContent = (file: ProjectFileEntry): string => file.content ?? '';

export const buildContentIndex = (
  manifest: ProjectManifest,
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const file of manifest.files) {
    if (file.status === 'TEXT' && file.content !== undefined) {
      map.set(file.path, file.content);
    }
  }
  return map;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};

export const searchFiles = (
  files: ProjectFileEntry[],
  contentIndex: Map<string, string>,
  rawQuery: string,
  searchContents: boolean,
): FileSearchResultLike[] => {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return files.map((file) => ({ file, pathMatch: true, contentHits: 0 }));
  }

  const results: FileSearchResultLike[] = [];

  for (const file of files) {
    const pathMatch =
      file.path.toLowerCase().includes(query) ||
      file.name.toLowerCase().includes(query);

    let contentHits = 0;

    if (searchContents) {
      const content = contentIndex.get(file.path);
      if (content) {
        const lower = content.toLowerCase();
        let index = lower.indexOf(query);
        while (index !== -1) {
          contentHits++;
          index = lower.indexOf(query, index + query.length);
        }
      }
    }

    if (pathMatch || contentHits > 0) {
      results.push({ file, pathMatch, contentHits });
    }
  }

  results.sort((a, b) => {
    if (a.pathMatch !== b.pathMatch) return a.pathMatch ? -1 : 1;
    if (b.contentHits !== a.contentHits) return b.contentHits - a.contentHits;
    return a.file.path.localeCompare(b.file.path);
  });

  return results;
};

export interface FileSearchResultLike {
  file: ProjectFileEntry;
  pathMatch: boolean;
  contentHits: number;
}

export const buildFileExport = (
  entries: ProjectFileEntry[],
  tree: string,
): string => {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  const parts: string[] = ['SELECTED PROJECT FILES', '', 'PROJECT FILE TREE:', '', tree, ''];
  for (const file of sorted) {
    parts.push('==============================');
    parts.push(`FILE: ${file.path}`);
    parts.push(`STATUS: ${file.status}`);
    parts.push(`SIZE: ${file.size}`);
    if (file.status === 'TEXT' && file.content !== undefined) {
      parts.push('');
      parts.push(file.content);
    } else if (file.status === 'BINARY') {
      parts.push('');
      parts.push('[BINARY FILE — contents not embedded]');
    } else if (file.status === 'FAILED') {
      parts.push('');
      parts.push(`[READ FAILED — ${file.error ?? 'unknown error'}]`);
    } else {
      parts.push('');
      parts.push('[EMPTY FILE]');
    }
    parts.push('');
  }
  parts.push('==============================');
  return parts.join('\n');
};