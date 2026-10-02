import { fishEllipse, type Fish, type FishPalette } from '@/utils/fishModel';
import { mix } from '@/utils/colorUtils';

/** Soft overlapping pigment on projected body slices, under the procedural volume lighting. */
export function drawInheritedPattern(ctx: CanvasRenderingContext2D, f: Fish, p: FishPalette, pattern?: string, quality = 1) {
  if (pattern === 'rainbow') {
    const spectrum = ['#ed7568', '#e6b966', '#a5c886', '#62bdb3', '#7298d1', '#b28dcc'];
    for (let i = 2; i < 21; i++) {
      const u = (i - 2) / 18 * (spectrum.length - 1), k = Math.floor(u);
      ctx.fillStyle = mix(spectrum[k], spectrum[Math.min(k + 1, 5)], u - k);
      // Broad feathered patches blend into the underlying body and each other.
      for (const [radius, alpha] of [[0.15, 0.07], [0.1, 0.1], [0.065, 0.12]]) {
        ctx.globalAlpha = alpha * (0.4 + quality * 0.6);
        ctx.beginPath(); fishEllipse(ctx, f, i, radius, f.tr.hh[i] * 1.15, f.tr.ww[i]); ctx.fill();
      }
    }
  } else if (pattern === 'koi') {
    for (const [i, down, col] of [[5,-0.35,p.accent],[10,0.15,p.accent],[15,-0.1,p.mark],[8,0.6,p.mark]] as const) {
      ctx.fillStyle = col; ctx.globalAlpha = 0.65;
      ctx.beginPath(); fishEllipse(ctx,f,i,0.07,f.tr.hh[i]*0.55,f.tr.ww[i]*0.85,f.tr.hh[i]*down);ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
