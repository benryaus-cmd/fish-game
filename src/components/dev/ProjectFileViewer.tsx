import { Suspense, lazy, useMemo, useState } from 'react';
import manifest from 'virtual:project-file-manifest';
import type { ProjectFileEntry } from '@/types/projectFiles';
import { buildContentIndex, searchFiles, formatSize, copyText, buildFileExport } from '@/dev/projectFileDiscovery';
import { generateTree } from '@/dev/projectTree';
import { DOWNLOAD_ICON_URL, downloadProjectZip } from '@/dev/projectZipExport';

const FilePreview = lazy(() => import('./FilePreview'));

const STATUS_COLOR: Record<string, string> = {
  TEXT: 'text-emerald-400',
  BINARY: 'text-amber-400',
  FAILED: 'text-red-400',
  EMPTY: 'text-white/40',
};

export default function ProjectFileViewer({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'NAMES' | 'CONTENT'>('NAMES');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const contentIndex = useMemo(() => buildContentIndex(manifest), []);
  const allFiles = manifest.files as ProjectFileEntry[];
  const results = useMemo(
    () => searchFiles(allFiles, contentIndex, query, searchMode === 'CONTENT'),
    [allFiles, contentIndex, query, searchMode],
  );
  const fullTree = useMemo(() => generateTree(allFiles), [allFiles]);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 1400);
  };

  const doCopy = async (text: string, label: string): Promise<boolean> => {
    const ok = await copyText(text);
    if (ok) {
      flash(label);
      if (navigator.vibrate) navigator.vibrate(15);
    } else {
      setFallbackText(text);
    }
    return ok;
  };

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAllResults = () => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const r of results) next.add(r.file.path);
      return next;
    });
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const selectedFiles = useMemo(
    () => allFiles.filter((f) => selectedPaths.has(f.path)),
    [allFiles, selectedPaths],
  );

  const copySel = () => {
    if (selectedFiles.length === 0) return;
    const tree = generateTree(selectedFiles);
    void doCopy(buildFileExport(selectedFiles, tree), 'COPIED ✓');
  };

  const copyTree = () => {
    const tree = selectedFiles.length > 0 ? generateTree(selectedFiles) : fullTree;
    void doCopy(`PROJECT FILE TREE\n\n${tree}`, 'COPIED ✓');
  };

  const downloadZip = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const files = selectedFiles.length > 0 ? selectedFiles : allFiles;
      await downloadProjectZip(files);
      flash('ZIP ✓');
      if (navigator.vibrate) navigator.vibrate(15);
    } catch {
      flash('ZIP FAILED');
    } finally {
      setZipping(false);
    }
  };

  const openFile = allFiles.find((f) => f.path === openPath);

  if (openFile) {
    return (
      <Suspense fallback={null}>
        <FilePreview
          path={openFile.path}
          status={openFile.status}
          size={formatSize(openFile.size)}
          content={openFile.content}
          error={openFile.error}
          onBack={() => setOpenPath(null)}
          onCopy={(text, label) => void doCopy(text, label)}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0b0f14] text-white">
      {/* HEADER */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium active:bg-white/20"
        >
          ← CLOSE
        </button>
        <div className="flex-1 text-center text-sm font-semibold tracking-wide">PROJECT FILES</div>
        <div className="font-mono text-xs text-white/60">
          {results.length}/{manifest.files.length}
        </div>
      </div>

      {/* SEARCH */}
      <div className="px-3 pt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchMode === 'CONTENT' ? 'Search names, paths & file contents…' : 'Search file names & paths...'}
          className="w-full rounded-lg bg-white/10 px-3 py-2.5 font-mono text-sm placeholder-white/40 outline-none focus:bg-white/15"
        />
      </div>

      {/* SEARCH MODE */}
      <div className="flex gap-2 px-3 pt-2">
        <button
          onClick={() => setSearchMode('NAMES')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
            searchMode === 'NAMES' ? 'bg-sky-600 text-white' : 'bg-white/10 text-white/60'
          }`}
        >
          NAMES ONLY
        </button>
        <button
          onClick={() => setSearchMode('CONTENT')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
            searchMode === 'CONTENT' ? 'bg-sky-600 text-white' : 'bg-white/10 text-white/60'
          }`}
        >
          NAMES + CONTENT
        </button>
      </div>

      {/* TOP ACTION TOOLBAR */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2">
        <button onClick={selectAllResults} disabled={zipping} className="rounded-lg bg-white/10 px-1 py-2 text-[11px] font-semibold active:bg-white/20 disabled:opacity-40">
          SELECT ALL
        </button>
        <button onClick={clearSelection} disabled={zipping} className="rounded-lg bg-white/10 px-1 py-2 text-[11px] font-semibold active:bg-white/20 disabled:opacity-40">
          CLEAR
        </button>
        <button
          onClick={copySel}
          disabled={selectedPaths.size === 0 || zipping}
          className={`rounded-lg px-1 py-2 text-[11px] font-semibold disabled:opacity-40 ${
            selectedPaths.size > 0 ? 'bg-emerald-600 text-white active:bg-emerald-500' : 'bg-white/5 text-white/30'
          }`}
        >
          COPY SEL ({selectedPaths.size})
        </button>
        <button onClick={copyTree} disabled={zipping} className="rounded-lg bg-white/10 px-1 py-2 text-[11px] font-semibold active:bg-white/20 disabled:opacity-40">
          COPY TREE
        </button>
        <button
          onClick={() => void downloadZip()}
          disabled={zipping}
          className={`col-span-3 flex items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[11px] font-semibold text-white ${
            zipping ? 'bg-sky-800' : 'bg-sky-600 active:bg-sky-500'
          }`}
        >
          {zipping ? (
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-label="Building ZIP"
            />
          ) : (
            <>
              <img src={DOWNLOAD_ICON_URL} alt="" className="h-4 w-4" />
              <span>DOWNLOAD ZIP{selectedPaths.size > 0 ? ` (${selectedPaths.size})` : ''}</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div className="px-3 pb-1 text-center font-mono text-xs text-emerald-400">{feedback}</div>
      )}

      {/* FILE LIST */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {results.map(({ file, pathMatch, contentHits }) => {
          const selected = selectedPaths.has(file.path);
          return (
            <div
              key={file.path}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 active:bg-white/5"
            >
              <button
                onClick={() => toggleSelect(file.path)}
                aria-label={selected ? 'Deselect' : 'Select'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                  selected ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-white/25 text-transparent'
                }`}
              >
                ✓
              </button>
              <button onClick={() => setOpenPath(file.path)} className="min-w-0 flex-1 text-left">
                <div className="truncate font-mono text-sm text-white/90">{file.name}</div>
                <div className="truncate font-mono text-[11px] text-white/45">
                  {file.path} · {formatSize(file.size)}
                  {!pathMatch && searchMode === 'CONTENT' && contentHits > 0 && (
                    <span className="text-sky-400"> · {contentHits} hits in content</span>
                  )}
                </div>
              </button>
              <span className={`shrink-0 font-mono text-[10px] ${STATUS_COLOR[file.status] ?? 'text-white/40'}`}>
                {file.status}
              </span>
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="py-10 text-center font-mono text-sm text-white/40">No matching files</div>
        )}
      </div>

      {/* CLIPBOARD FALLBACK */}
      {fallbackText !== null && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#0b0f14]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <button
              onClick={() => setFallbackText(null)}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm active:bg-white/20"
            >
              ← BACK
            </button>
            <div className="flex-1 text-center text-xs text-amber-400">
              Clipboard failed — select & copy manually
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <pre className="select-text p-3 font-mono text-xs text-white/85" style={{ whiteSpace: 'pre' }}>
              {fallbackText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}