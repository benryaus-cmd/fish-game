import assetsData from "@/config/assets";
import JSZip from 'jszip';
import type { ProjectFileEntry } from '@/types/projectFiles';
const DOWNLOAD_ICON_URL = assetsData.IMAGE_GLPD;
export { DOWNLOAD_ICON_URL };
export const buildProjectZip = async (files: ProjectFileEntry[]): Promise<Blob> => {
  const zip = new JSZip();
  const included: ProjectFileEntry[] = [];
  const skipped: ProjectFileEntry[] = [];
  for (const file of files) {
    if (file.status === 'TEXT' || file.status === 'EMPTY') {
      zip.file(file.path, file.content ?? '');
      included.push(file);
    } else {
      skipped.push(file);
    }
  }
  if (skipped.length > 0) {
    const lines = ['FILES NOT EMBEDDED IN ZIP (binary / unreadable in browser manifest)', '='.repeat(64), '', ...skipped.map(f => `${f.path}\n  STATUS: ${f.status}  SIZE: ${f.size}${f.error ? `  ERROR: ${f.error}` : ''}`)];
    zip.file('EXCLUDED-BINARY-FILES.txt', lines.join('\n'));
  }
  const manifestInfo = [`Files in archive: ${included.length}`, `Files excluded (binary/failed): ${skipped.length}`, `Generated: ${new Date().toISOString()}`].join('\n');
  zip.file('ZIP-MANIFEST.txt', manifestInfo);
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
};
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
export const downloadProjectZip = async (files: ProjectFileEntry[], filename = 'aqualume-project.zip'): Promise<void> => {
  const blob = await buildProjectZip(files);
  downloadBlob(blob, filename);
};