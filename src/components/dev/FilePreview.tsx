import { useState } from 'react';

interface FilePreviewProps {
  path: string;
  status: string;
  size: string;
  content?: string;
  error?: string;
  onBack: () => void;
  onCopy: (text: string, label: string) => void;
}

const FilePreview = ({
  path,
  status,
  size,
  content,
  error,
  onBack,
  onCopy,
}: FilePreviewProps) => {
  const [zoom, setZoom] = useState(false);

  const copyFile = () => {
    if (status === 'TEXT' && content !== undefined) {
      onCopy(content, 'FILE ✓');
    } else {
      onCopy(`FILE: ${path}\nSTATUS: ${status}\nSIZE: ${size}\n[Contents not available as text]`, 'INFO ✓');
    }
  };

  const copyPath = () => {
    onCopy(path, 'PATH ✓');
  };

  return (
    <div className="flex h-full flex-col bg-[#0b0f14]">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-2">
        <button
          onClick={onBack}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white active:bg-white/20"
        >
          ← BACK
        </button>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate font-mono text-xs text-white/90">{path}</p>
          <p className="font-mono text-[10px] text-white/50">
            STATUS: {status} · SIZE: {size}
          </p>
        </div>
        <button
          onClick={copyFile}
          className="shrink-0 rounded-lg bg-emerald-600/80 px-3 py-2 text-xs font-medium text-white active:bg-emerald-600"
        >
          COPY FILE
        </button>
        <button
          onClick={copyPath}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white active:bg-white/20"
        >
          COPY PATH
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 border-b border-white/10 px-2 py-1">
        <button
          onClick={() => setZoom((z) => !z)}
          className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60 active:bg-white/10"
        >
          {zoom ? 'SMALLER' : 'LARGER'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {status === 'TEXT' && content !== undefined ? (
          <pre
            className={`p-3 font-mono text-white/85 ${zoom ? 'text-sm' : 'text-xs'}`}
            style={{ whiteSpace: 'pre' }}
          >
            {content}
          </pre>
        ) : status === 'BINARY' ? (
          <div className="p-4 font-mono text-sm text-amber-400">
            Binary file — contents not embedded.
          </div>
        ) : status === 'FAILED' ? (
          <div className="p-4 font-mono text-sm text-red-400">
            Read failed: {error ?? 'unknown error'}
          </div>
        ) : (
          <div className="p-4 font-mono text-sm text-white/50">
            This file is empty.
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;