import { TAU } from '@/utils/fishModel';

export interface Food {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  r: number; ax: number; z: number; seed: number; wf: number; drift: number; term: number;
  age: number; rest: number; stay: number; alpha: number; landed: boolean; eaten: boolean;
  /** Fading out — can no longer be targeted or reward anything. */
  expired: boolean;
  /** Fish id holding a temporary reservation on this pellet (-1 = free). */
  owner: number;
  col: number; shape: Float32Array;
}

/** Marks food EATEN exactly once; returns true only for the single valid consumption. */
export function consumeFood(p: Food): boolean {
  if (p.eaten || p.expired) return false;
  p.eaten = true;
  return true;
}

export const MAX_FOOD = 18;
export const FOOD_PTS = 7;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Drops a small group (3–5) of pellets near the tap, respecting the active cap. Returns count spawned. */
export function spawnFood(list: Food[], x: number, y: number, L: number, w: number, surfaceY: (x: number) => number): number {
  const room = MAX_FOOD - list.length;
  if (room <= 0) return 0;
  const n = Math.min(room, 3 + Math.floor(Math.random() * 3));
  const m = L * 0.75;
  const cx = clamp(x, m, Math.max(m, w - m));
  const cy = clamp(y, 12, Math.max(12, surfaceY(cx) - L * 0.28));
  const a0 = Math.random() * TAU;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU + rnd(-0.4, 0.4);
    const d = L * rnd(0.03, 0.13);
    const shape = new Float32Array(FOOD_PTS);
    for (let k = 0; k < FOOD_PTS; k++) shape[k] = rnd(0.78, 1.08);
    const sp = L * rnd(0.18, 0.42);
    list.push({
      x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - L * 0.06,
      rot: Math.random() * TAU, vr: rnd(-0.9, 0.9),
      r: L * rnd(0.03, 0.042), ax: rnd(1, 1.35), z: rnd(0.94, 1.06),
      seed: Math.random() * 100, wf: rnd(0.35, 0.8), drift: L * rnd(0.05, 0.13), term: L * rnd(0.2, 0.34),
      age: 0, rest: 0, stay: rnd(3.5, 6), alpha: 1, landed: false, eaten: false, expired: false, owner: -1,
      col: Math.floor(Math.random() * 4), shape,
    });
  }
  return n;
}

/** Slow suspended fall with gentle individual drift; rests on the sand, then fades. */
export function updateFood(list: Food[], dtRaw: number, w: number, surfaceY: (x: number) => number, L: number, fallMul: number) {
  const dt = Math.min(dtRaw, 0.05);
  const m = L * 0.6;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.age += dt;
    if (!p.landed && !p.eaten) {
      const dx = Math.sin(p.age * p.wf + p.seed) * p.drift + Math.sin(p.age * 0.21 + p.seed * 1.7) * p.drift * 0.45;
      p.vx += (dx - p.vx) * ease(1.1, dt);
      // Half the previous sink speed; drift / wobble unchanged
      const tv = p.term * 0.5 * fallMul * (1 + 0.28 * Math.sin(p.age * p.wf * 1.4 + p.seed * 0.5));
      p.vy += (tv - p.vy) * ease(0.85, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt * (0.6 + 0.4 * Math.sin(p.age * 0.9 + p.seed));
      if (p.x < m) { p.x = m; p.vx = Math.abs(p.vx) * 0.3; }
      else if (p.x > w - m) { p.x = w - m; p.vx = -Math.abs(p.vx) * 0.3; }
      const g = surfaceY(p.x) - p.r * 0.5;
      if (p.y >= g) { p.y = g; p.landed = true; p.vx = 0; p.vy = 0; }
      else if (p.age > 80) { p.expired = true; p.alpha -= dt / 2; }
    } else if (p.landed) {
      p.rest += dt;
      if (p.rest > p.stay) { p.expired = true; p.alpha -= dt / 1.8; }
    }
    if (p.eaten || p.alpha <= 0) list.splice(i, 1);
  }
}