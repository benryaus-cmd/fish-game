/** Code-drawn aquarium rocks: smooth irregular stones baked once into cached sprites. */
import { mix, mixHex } from '@/utils/colorUtils';

type C = CanvasRenderingContext2D;
export interface RockDef { w: number; h: number; seed: number; tone: number }
const cache = new Map<string, HTMLCanvasElement>();
const PAD = 6;
const N = 16;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function toneOf(base: string, tone: number): string {
  if (tone === 1) return mixHex(base, '#7d6a56', 0.42);
  if (tone === 2) return mixHex(base, '#667a8c', 0.4);
  if (tone === 3) return mixHex(base, '#c4beb2', 0.3);
  return base;
}

function paint(g: C, rw: number, rh: number, seed: number, color: string) {
  const cy = -rh * 0.92, lean = (hash(seed * 7) - 0.5) * 0.35;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = 1 + (hash(seed * 13 + i) - 0.5) * 0.2, sn = Math.sin(a);
    let y = cy - sn * rh * r;
    if (y > 0) y *= 0.2;
    xs.push(Math.cos(a) * rw * r + lean * rw * Math.max(0, sn));
    ys.push(y);
  }
  g.beginPath();
  g.moveTo((xs[N - 1] + xs[0]) / 2, (ys[N - 1] + ys[0]) / 2);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    g.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[j]) / 2, (ys[i] + ys[j]) / 2);
  }
  g.closePath();
  const body = g.createRadialGradient(-rw * 0.35, cy - rh * 0.45, rw * 0.05, -rw * 0.1, cy, Math.max(rw, rh) * 1.6);
  body.addColorStop(0, mix(color, '#f4efe4', 0.38));
  body.addColorStop(0.45, color);
  body.addColorStop(1, mix(color, '#1f2a30', 0.55));
  g.fillStyle = body;
  g.fill();
  g.save();
  g.clip();
  const bs = g.createLinearGradient(0, cy, 0, 0);
  bs.addColorStop(0, 'rgba(20,30,35,0)');
  bs.addColorStop(1, 'rgba(20,30,35,0.34)');
  g.fillStyle = bs; g.fillRect(-rw * 1.4, cy, rw * 2.8, -cy + 2);
  // Mild surface variation: faint mineral speckles and soft weathered patches
  for (let i = 0; i < 12; i++) {
    const px = (hash(seed * 3 + i) - 0.5) * rw * 1.7, py = cy + (hash(seed * 5 + i) - 0.5) * rh * 1.6;
    g.fillStyle = i % 3 === 0 ? 'rgba(255,250,240,0.1)' : 'rgba(30,35,40,0.09)';
    g.beginPath(); g.ellipse(px, py, rw * (0.04 + hash(i + seed) * 0.12), rh * 0.06 + 0.4, hash(i) * 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(92,120,80,0.16)';
  g.beginPath(); g.ellipse(rw * 0.2, -rh * 0.08, rw * 0.7, rh * 0.14, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,250,240,0.17)';
  g.beginPath(); g.ellipse(-rw * 0.28, cy - rh * 0.55, rw * 0.36, rh * 0.15, -0.25, 0, Math.PI * 2); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(30,35,40,0.16)'; g.lineWidth = 0.8; g.stroke();
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = 'rgba(20,40,50,0.3)';
  g.beginPath(); g.ellipse(rw * 0.08, 0.5, rw * 1.14, Math.max(2, rh * 0.16), 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
}

function sprite(rw: number, rh: number, seed: number, color: string, dpr: number) {
  const key = `${seed}|${rw}|${rh}|${color}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 40) cache.clear();
  const cw = rw * 2.7 + PAD * 2, oy = rh * 2.2 + PAD, ch = oy + PAD;
  const c = document.createElement('canvas');
  c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr);
  const g = c.getContext('2d');
  if (g) { g.setTransform(dpr, 0, 0, dpr, (cw / 2) * dpr, oy * dpr); paint(g, rw, rh, seed, color); }
  cache.set(key, c);
  return c;
}

/** x = rock center, baseY = where it rests on the sand; S = shared decor scale (px). */
export function drawRock(ctx: C, x: number, baseY: number, d: RockDef, S: number, base: string, alpha = 1) {
  if (alpha <= 0.001) return;
  const dpr = Math.max(1, Math.min(3, Math.round(ctx.getTransform().a * 2) / 2));
  const rw = Math.max(2, Math.round((d.w * S) / 2)), rh = Math.max(2, Math.round((d.h * S) / 2));
  const img = sprite(rw, rh, d.seed, toneOf(base, d.tone), dpr);
  const cw = rw * 2.7 + PAD * 2, oy = rh * 2.2 + PAD;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - cw / 2, baseY - oy, img.width / dpr, img.height / dpr);
  ctx.globalAlpha = 1;
}