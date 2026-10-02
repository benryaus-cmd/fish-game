import { ctx2d, makeCanvas, mulberry } from '@/utils/aquaTextures';
import { mix } from '@/utils/colorUtils';
import { drawPebble, drawShell, drawShellFragment } from '@/utils/sandDetails';
import { grain, slopeShade, softStroke, tonalPatches } from '@/utils/sandShading';

interface Ridge { base: number; amp: number; p: [number, number, number] }
export interface SandLayer { canvas: HTMLCanvasElement; clip: Path2D; top: number; surfaceY: (x: number) => number }

// Long absolute wavelengths: wide screens show more gentle swells instead of stretched hills.
const K = [(Math.PI * 2) / 900, (Math.PI * 2) / 430, (Math.PI * 2) / 210];

function ridgeY(r: Ridge, x: number): number {
  return r.base + r.amp * (0.6 * Math.sin(x * K[0] + r.p[0]) + 0.28 * Math.sin(x * K[1] + r.p[1]) + 0.12 * Math.sin(x * K[2] + r.p[2]));
}

function ridgePath(r: Ridge, w: number, h: number, closed: boolean): Path2D {
  const p = new Path2D();
  p.moveTo(-30, ridgeY(r, -30));
  for (let x = -24; x <= w + 30; x += 6) p.lineTo(x, ridgeY(r, x));
  if (closed) { p.lineTo(w + 30, h + 4); p.lineTo(-30, h + 4); p.closePath(); }
  return p;
}

function curve(x0: number, len: number, y: number, rnd: () => number): Path2D {
  const p = new Path2D();
  const ph = rnd() * 6.28, f = 70 + rnd() * 60;
  for (let i = 0; i <= len; i += 6) {
    const x = x0 + i, yy = y + Math.sin(x / f + ph) * 3 + Math.sin(x / 31 + ph * 1.7);
    if (i === 0) p.moveTo(x, yy); else p.lineTo(x, yy);
  }
  return p;
}

export function buildSand(w: number, h: number, dpr: number, sand: string, deep: string): SandLayer {
  const rnd = mulberry(20260611);
  const sh = Math.min(200, Math.max(90, h * 0.16));
  const base = h - sh;
  const ph = (): [number, number, number] => [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const far: Ridge = { base: base - sh * 0.2, amp: sh * 0.1, p: ph() };
  const main: Ridge = { base: base + sh * 0.04, amp: sh * 0.075, p: ph() };
  const surf = (x: number) => ridgeY(main, x);
  const top = main.base - main.amp;
  const c = makeCanvas(w * dpr, h * dpr);
  const g = ctx2d(c);
  g.scale(dpr, dpr);

  // Distant swell dissolving into the water haze
  let gr = g.createLinearGradient(0, far.base - far.amp, 0, main.base + main.amp);
  gr.addColorStop(0, mix(deep, sand, 0.3, 0.2));
  gr.addColorStop(1, mix(deep, sand, 0.45, 0.65));
  g.fillStyle = gr; g.fill(ridgePath(far, w, h, true));

  // One cohesive sand surface: hazy at the far edge, warmest mid-way, slightly deeper at the bottom
  const mainP = ridgePath(main, w, h, true);
  gr = g.createLinearGradient(0, top, 0, h);
  gr.addColorStop(0, mix(sand, deep, 0.3));
  gr.addColorStop(0.2, mix(sand, deep, 0.12));
  gr.addColorStop(0.55, sand);
  gr.addColorStop(1, mix(sand, deep, 0.13));
  g.fillStyle = gr; g.fill(mainP);

  g.save(); g.clip(mainP);
  slopeShade(g, w, surf, sh * 0.5, sand, deep);
  tonalPatches(g, rnd, w, top + sh * 0.15, h, sand, deep, w < 700 ? 5 : 8);
  const dunes = w < 700 ? 3 : 5;
  for (let i = 0; i < dunes; i++) {
    const p = curve(rnd() * w * 0.95 - 60, 180 + rnd() * 260, top + sh * (0.3 + rnd() * 0.5), rnd);
    g.save(); g.translate(0, 5); softStroke(g, p, mix(sand, deep, 0.45), [26, 15, 7], 0.02); g.restore();
    softStroke(g, p, mix(sand, '#ffffff', 0.45), [20, 11, 4], 0.02);
  }
  grain(g, rnd, w, top, h, Math.min(4200, Math.round(w * sh * 0.035)), sand, deep);
  g.restore();

  // Soft water-to-sand transition: diffused edge + restrained haze over the boundary
  softStroke(g, ridgePath(main, w, h, false), mix(deep, '#dff3ea', 0.45), [22, 12, 5], 0.032);
  const hz = g.createLinearGradient(0, top - sh * 0.35, 0, top + sh * 0.35);
  hz.addColorStop(0, mix(deep, '#dff3ea', 0.4, 0));
  hz.addColorStop(0.5, mix(deep, '#dff3ea', 0.4, 0.09));
  hz.addColorStop(1, mix(deep, '#dff3ea', 0.4, 0));
  g.fillStyle = hz; g.fillRect(0, top - sh * 0.35, w, sh * 0.7);

  // Sparse natural details, scaled by distance (smaller & fainter toward the far edge)
  const palette = ['#b9ad98', '#a0a298', '#c6b9a3', '#a69886', '#b3b3aa'];
  const depthAt = (x: number, y: number) => Math.max(0, Math.min(1, (y - surf(x)) / Math.max(1, h - surf(x))));
  const place = (x: number, y: number, r: number, i: number) => {
    const d = depthAt(x, y);
    drawPebble(g, x, y, r * (0.55 + 0.55 * d), palette[i % palette.length], rnd(), 0.7 + 0.3 * d);
  };
  const clusters = w < 700 ? [0.16, 0.8] : [0.12, 0.58, 0.87];
  for (const cx of clusters) {
    const x = w * (cx + (rnd() - 0.5) * 0.08), sy = surf(x), y = sy + (h - sy) * (0.35 + rnd() * 0.45);
    const k = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < k; j++) place(x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 8, 1.4 + rnd() * 2, j + Math.floor(rnd() * 5));
  }
  const lone = Math.round(w / 220) + 2;
  for (let i = 0; i < lone; i++) {
    const x = rnd() * w, sy = surf(x);
    place(x, sy + 8 + rnd() * Math.max(0, h - sy - 14), 1 + rnd() * 1.5, i);
  }
  const sx = w * (0.3 + rnd() * 0.12), ssy = surf(sx);
  drawShell(g, sx, ssy + (h - ssy) * (0.5 + rnd() * 0.3), 4 + rnd() * 1.5, (rnd() - 0.5) * 0.9);
  for (let i = 0; i < 2; i++) {
    const x = w * (i === 0 ? 0.68 + rnd() * 0.1 : 0.05 + rnd() * 0.12), fy = surf(x);
    drawShellFragment(g, x, fy + (h - fy) * (0.3 + rnd() * 0.5), 3 + rnd() * 1.5, rnd() * 6.28);
  }

  return { canvas: c, clip: mainP, top, surfaceY: surf };
}