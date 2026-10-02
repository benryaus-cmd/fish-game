import { mix } from '@/utils/colorUtils';

type G = CanvasRenderingContext2D;

/** Stacked wide round strokes at low alpha — a cheap, filter-free soft blur along a path. */
export function softStroke(g: G, p: Path2D, color: string, widths: number[], alpha: number): void {
  g.save();
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.globalAlpha = alpha;
  for (const lw of widths) { g.lineWidth = lw; g.stroke(p); }
  g.restore();
}

/** Gentle dune shading: faces tilted toward the light (upper-left) brighten, others dim, fading downward. */
export function slopeShade(g: G, w: number, surf: (x: number) => number, depth: number, sand: string, deep: string): void {
  const lit = g.createLinearGradient(0, 0, 0, depth);
  lit.addColorStop(0, mix(sand, '#ffffff', 0.55, 1));
  lit.addColorStop(1, mix(sand, '#ffffff', 0.55, 0));
  const shd = g.createLinearGradient(0, 0, 0, depth);
  shd.addColorStop(0, mix(sand, deep, 0.65, 1));
  shd.addColorStop(1, mix(sand, deep, 0.65, 0));
  const step = 4;
  for (let x = -step; x <= w + step; x += step) {
    const s = (surf(x + step) - surf(x - step)) / (step * 2);
    const a = Math.min(0.07, Math.abs(s) * 0.9);
    if (a < 0.004) continue;
    g.globalAlpha = a;
    g.fillStyle = s > 0 ? lit : shd;
    g.save();
    g.translate(0, surf(x) - 2);
    g.fillRect(x, 0, step, depth);
    g.restore();
  }
  g.globalAlpha = 1;
}

/** Broad, flattened light/dark patches for natural tonal variation. */
export function tonalPatches(g: G, rnd: () => number, w: number, y0: number, y1: number, sand: string, deep: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = y0 + rnd() * (y1 - y0), rx = 120 + rnd() * 180;
    const light = i % 2 === 1;
    const other = light ? '#ffffff' : deep;
    const t = light ? 0.35 : 0.4;
    g.save();
    g.translate(x, y);
    g.scale(1, 0.26);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, mix(sand, other, t, light ? 0.07 : 0.06));
    gr.addColorStop(1, mix(sand, other, t, 0));
    g.fillStyle = gr;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
  }
}

/** Very fine grain plus a few faint speckle clusters. */
export function grain(g: G, rnd: () => number, w: number, y0: number, h: number, n: number, sand: string, deep: string): void {
  const cols: [string, number][] = [['#ffffff', 0.07], [deep, 0.075]];
  for (const [col, a] of cols) {
    g.fillStyle = mix(sand, col, 0.5, a);
    g.beginPath();
    for (let i = 0; i < n / 2; i++) g.rect(rnd() * w, y0 + rnd() * (h - y0), 1, 1);
    g.fill();
  }
  g.fillStyle = mix(sand, deep, 0.55, 0.1);
  g.beginPath();
  const clusters = Math.max(3, Math.round(w / 260));
  for (let c = 0; c < clusters; c++) {
    const cx = rnd() * w, cy = y0 + (h - y0) * (0.3 + rnd() * 0.65);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 34;
      g.rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.4, 1.2, 1.2);
    }
  }
  g.fill();
}