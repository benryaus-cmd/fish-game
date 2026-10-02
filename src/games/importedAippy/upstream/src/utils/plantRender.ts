/** Code-drawn aquatic plants: anchored leaves/blades with delayed base-to-tip sway. */
import { mix, mixHex } from '@/utils/colorUtils';

type C = CanvasRenderingContext2D;
export type PlantKind = 'leafy' | 'grass' | 'tall';
export interface PlantDef { kind: PlantKind; h: number; seed: number; tone: number }
interface Leaf { a: number; len: number; w: number; bend: number; ph: number; amp: number; ox: number; front: boolean }

const leafCache = new WeakMap<PlantDef, Leaf[]>();
const colorCache = new Map<string, [string, string, string]>();
const SEG = 9;
const PX = new Float32Array(SEG + 1), PY = new Float32Array(SEG + 1), PA = new Float32Array(SEG + 1);
const rand = (seed: number, i: number) => { const s = Math.sin(seed * 91.7 + i * 47.3) * 43758.5453; return s - Math.floor(s); };

function leaves(d: PlantDef): Leaf[] {
  const hit = leafCache.get(d);
  if (hit) return hit;
  const n = d.kind === 'leafy' ? 7 : d.kind === 'grass' ? 11 : 5;
  const out: Leaf[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5, r = rand(d.seed, i), q = rand(d.seed + 5, i), ph = r * 6.28;
    if (d.kind === 'leafy') out.push({ a: u * 1.8 + (r - 0.5) * 0.15, len: 1 - Math.abs(u) * 0.8, w: 0.26, bend: u * 0.7, ph, amp: 0.05, ox: u * 0.1, front: i % 2 === 1 });
    else if (d.kind === 'grass') out.push({ a: u * 0.8 + (r - 0.5) * 0.2, len: 0.55 + q * 0.45, w: 0.055, bend: (r - 0.5) * 0.6 + u * 0.3, ph, amp: 0.08, ox: u * 0.25, front: r > 0.45 });
    else out.push({ a: u * 0.4 + (r - 0.5) * 0.15, len: 0.7 + q * 0.3, w: 0.085, bend: (q - 0.5) * 0.5 + u * 0.2, ph, amp: 0.12, ox: u * 0.12, front: i % 2 === 0 });
  }
  out.sort((a, b) => Number(a.front) - Number(b.front));
  leafCache.set(d, out);
  return out;
}

function colors(base: string, tone: number): [string, string, string] {
  const key = `${base}|${tone}`;
  const hit = colorCache.get(key);
  if (hit) return hit;
  if (colorCache.size > 24) colorCache.clear();
  const c = tone === 1 ? mixHex(base, '#3d8a80', 0.45) : tone === 2 ? mixHex(base, '#2b4a30', 0.4) : base;
  const v: [string, string, string] = [mix(c, '#1c2e26', 0.35, 0.92), mix(c, '#d8e6c0', 0.12, 0.95), mix(c, '#eef6dc', 0.5, 0.3)];
  colorCache.set(key, v);
  return v;
}

function halfWidth(kind: PlantKind, s: number): number {
  if (kind === 'leafy') return Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.04)), 0.7) * 0.5 + 0.04;
  if (kind === 'grass') return Math.pow(1 - s, 0.9) * 0.5 + 0.02;
  return (0.75 + 0.25 * Math.sin(Math.PI * s)) * (s > 0.85 ? (1 - s) / 0.15 : 1) * 0.5 + 0.03;
}

/** x = plant root, baseY = sand contact; t = scene time for the sway. */
export function drawPlant(ctx: C, x: number, baseY: number, d: PlantDef, S: number, base: string, t: number, alpha = 1) {
  if (alpha <= 0.001) return;
  const H = d.h * S * (0.85 + 0.15 * alpha), pal = colors(base, d.tone), f = 0.8 + rand(d.seed, 99) * 0.35;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(20,40,40,0.16)';
  ctx.beginPath(); ctx.ellipse(x, baseY + 1, Math.max(4, S * (d.kind === 'tall' ? 0.3 : 0.45)), Math.max(1.5, S * 0.07), 0, 0, Math.PI * 2); ctx.fill();
  for (const lf of leaves(d)) {
    const seg = (lf.len * H) / SEG, w = lf.w * H;
    let px = x + lf.ox * S, py = baseY + 1;
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      const ang = lf.a + lf.bend * s + lf.amp * Math.sin(t * f + lf.ph - s * 1.4) * Math.pow(s, 1.5);
      PX[i] = px; PY[i] = py; PA[i] = ang;
      px += Math.sin(ang) * seg; py -= Math.cos(ang) * seg;
    }
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const hw = halfWidth(d.kind, i / SEG) * w;
      const lx = PX[i] + Math.cos(PA[i]) * hw, ly = PY[i] + Math.sin(PA[i]) * hw;
      if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    for (let i = SEG; i >= 0; i--) {
      const hw = halfWidth(d.kind, i / SEG) * w;
      ctx.lineTo(PX[i] - Math.cos(PA[i]) * hw, PY[i] - Math.sin(PA[i]) * hw);
    }
    ctx.closePath();
    ctx.fillStyle = lf.front ? pal[1] : pal[0];
    ctx.fill();
    if (d.kind !== 'grass' && lf.front) {
      ctx.strokeStyle = pal[2]; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(PX[0], PY[0]);
      for (let i = 1; i < SEG; i++) ctx.lineTo(PX[i], PY[i]);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}