import { ctx2d, makeCanvas, mulberry } from '@/utils/aquaTextures';
import { mix } from '@/utils/colorUtils';

export interface WaterColors { top: string; mid: string; deep: string; sand: string }

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Static far-background layer: layered water gradient, surface glow, volumes, haze, dither. */
export function buildBackdrop(w: number, h: number, dpr: number, c: WaterColors, sandTop: number): HTMLCanvasElement {
  const cv = makeCanvas(w * dpr, h * dpr);
  const g = ctx2d(cv);
  g.scale(dpr, dpr);

  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, mix(c.top, '#ffffff', 0.22));
  lg.addColorStop(0.18, mix(c.top, '#ffffff', 0.02));
  lg.addColorStop(0.52, mix(c.mid, c.top, 0.1));
  lg.addColorStop(0.8, mix(c.deep, c.mid, 0.35));
  lg.addColorStop(1, mix(c.deep, c.deep, 0));
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);

  // Soft brightness from the surface above
  const R = Math.max(w, h) * 0.8;
  g.save();
  g.translate(w * 0.4, -h * 0.06);
  g.scale(1.25, 0.6);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, R);
  rg.addColorStop(0, 'rgba(255,255,244,0.30)');
  rg.addColorStop(0.45, 'rgba(236,255,248,0.09)');
  rg.addColorStop(1, 'rgba(236,255,248,0)');
  g.fillStyle = rg;
  g.fillRect(-R, -R, R * 2, R * 2);
  g.restore();

  // Broad, barely-there water volumes for depth
  const M = Math.max(w, h);
  blob(g, w * 0.1, h * 0.5, M * 0.45, mix(c.deep, '#0b3440', 0.25, 0.1), mix(c.deep, '#0b3440', 0.25, 0));
  blob(g, w * 0.92, h * 0.62, M * 0.4, mix(c.deep, '#0b3440', 0.2, 0.08), mix(c.deep, '#0b3440', 0.2, 0));
  blob(g, w * 0.62, h * 0.32, M * 0.35, mix(c.top, '#ffffff', 0.3, 0.06), mix(c.top, '#ffffff', 0.3, 0));

  // Distant seabed silhouettes lost in the haze
  const rnd = mulberry(5);
  for (let L = 0; L < 2; L++) {
    const by = sandTop - h * (0.1 - L * 0.045);
    const amp = h * 0.03, p1 = rnd() * 6, p2 = rnd() * 6;
    g.beginPath();
    g.moveTo(-4, h);
    for (let x = -4; x <= w + 8; x += 8) {
      g.lineTo(x, by + Math.sin(x / (380 + L * 120) + p1) * amp + Math.sin(x / 150 + p2) * amp * 0.35);
    }
    g.lineTo(w + 8, h);
    g.closePath();
    g.fillStyle = mix(c.deep, c.mid, 0.5 - L * 0.2, 0.14 + L * 0.1);
    g.fill();
  }

  // Atmospheric haze toward the floor
  const hy = sandTop - h * 0.3;
  const hz = g.createLinearGradient(0, hy, 0, sandTop + 20);
  hz.addColorStop(0, mix(c.mid, '#dff3ea', 0.3, 0));
  hz.addColorStop(1, mix(c.mid, '#dff3ea', 0.3, 0.3));
  g.fillStyle = hz;
  g.fillRect(0, hy, w, h - hy);

  // Fine dither to prevent gradient banding
  const n = makeCanvas(96, 96);
  const ng = ctx2d(n);
  const id = ng.createImageData(96, 96);
  for (let i = 0; i < 96 * 96; i++) {
    const v = rnd() < 0.5 ? 255 : 0;
    id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v;
    id.data[i * 4 + 3] = Math.floor(rnd() * 9);
  }
  ng.putImageData(id, 0, 0);
  const pat = g.createPattern(n, 'repeat');
  if (pat) { g.fillStyle = pat; g.fillRect(0, 0, w, h); }
  return cv;
}