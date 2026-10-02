import assetsData from "@/config/assets";
import { Suspense, lazy, useState } from 'react';
const ProjectFileViewer = lazy(() => import('./ProjectFileViewer'));

/**
 * Developer-only utility: floating cog (bottom-right) that opens the
 * Project File Viewer. Fully isolated — remove this file, the dev/
 * helpers, the components/dev/ files and the manifest plugin to remove it.
 */
export default function DevProjectFilesAccess() {
  const [open, setOpen] = useState(false);
  return <>
      {!open && <button onClick={() => setOpen(true)} aria-label="Open project file viewer" className="fixed z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm active:bg-black/80" style={{
      right: 'max(12px, env(safe-area-inset-right))',
      bottom: 'max(12px, env(safe-area-inset-bottom))'
    }}>
          <img src={assetsData.IMAGE_BEHK} alt="" width={26} height={26} className="opacity-80" />
        </button>}

      {open && <div className="fixed inset-0 z-[9998] bg-[#0b0f14]">
          <Suspense fallback={null}>
            <ProjectFileViewer onClose={() => setOpen(false)} />
          </Suspense>
        </div>}
    </>;
}