import type { Food } from '@/utils/fishFood';

export type AngelMode = 'cruise' | 'hover' | 'approach' | 'eat';
export interface AngelEnv { w: number; h: number; sandTop: number; L: number }

/**
 * Render pose. Yaw convention: 0 = right profile, π/2 = snout toward viewer, π = left profile.
 * Separate yaws per body region: head (yh), torso (yb), tail base (yp), tail fin (yt), fin tips (yf).
 */
export interface AngelPose {
  x: number; y: number; S: number; fade: number; rot: number; bob: number; sway: number;
  yh: number; yb: number; yp: number; yt: number; yf: number;
  bend: number; drag: number; lift: number;
  finPh: number; tailPh: number; tailAmp: number; gape: number; recoil: number; vary: number[];
}

export interface Angelfish extends AngelPose {
  id: number; size: number; vx: number; vy: number;
  yaw: number[]; yawV: number[]; face: 1 | -1; want: 1 | -1; hold: number;
  turning: boolean; q0: number; q1: number; tt: number; td: number; arc: number;
  clock: number; ph: number; aim: number;
  mode: AngelMode; t: number; dur: number; tx: number; ty: number; ax: number; ay: number;
  pSpeed: number; pDepth: number; pTurn: number; pIdle: number; pReact: number;
  target: Food | null; scan: number; ate: boolean;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
let nextId = 60000;

/** Resting yaw keeps a hint of three-quarter depth so the fish never reads as a flat sticker. */
export const REST = 0.12;
export const restYaw = (dir: number) => (dir > 0 ? REST : Math.PI - REST);
export const angelSize = (L: number, size: number) => L * 0.64 * size;

/** Preferred open-water box (middle / middle-upper), leaving room for the tall fins and rays. */
export const Z = { x0: 0, x1: 0, y0: 0, y1: 0 };
export function setZone(a: { S: number }, env: AngelEnv) {
  const m = a.S * 0.95;
  Z.x0 = m; Z.x1 = Math.max(m, env.w - m);
  Z.y0 = Math.max(a.S * 1.1, env.h * 0.12);
  Z.y1 = Math.max(Z.y0, Math.min(env.h * 0.64, env.sandTop - a.S * 1.25));
}

/** Load: spread over open water. Purchase: faint at a side edge, then glides inward while fading in. */
export function spawnAngel(env: AngelEnv, entering: boolean, i: number, n: number): Angelfish {
  const size = rnd(0.92, 1.06), S = angelSize(env.L, size);
  const a: Angelfish = {
    id: nextId++, size, x: 0, y: 0, S, fade: entering ? 0 : 1, rot: 0, bob: 0, sway: 0,
    yh: 0, yb: 0, yp: 0, yt: 0, yf: 0, bend: 0, drag: 0, lift: 0,
    finPh: rnd(0, 6.3), tailPh: rnd(0, 6.3), tailAmp: 0.12, gape: 0, recoil: 0,
    vary: [rnd(-0.015, 0.015), rnd(-0.02, 0.02), rnd(-0.02, 0.02), 0, rnd(0.85, 1.15)],
    vx: 0, vy: 0, yaw: [0, 0, 0, 0, 0], yawV: [0, 0, 0, 0, 0], face: 1, want: 1, hold: rnd(0.5, 2),
    turning: false, q0: 0, q1: 0, tt: 0, td: 1, arc: 1, clock: rnd(0, 60), ph: rnd(0, 6.3), aim: 0,
    mode: 'hover', t: 0, dur: rnd(1, 4), tx: 0, ty: 0, ax: 0, ay: 0,
    pSpeed: rnd(0.82, 1.15), pDepth: rnd(0.08, 0.72), pTurn: rnd(0.9, 1.15), pIdle: rnd(0.8, 1.4), pReact: rnd(0.8, 1.35),
    target: null, scan: rnd(1, 2.5), ate: false,
  };
  setZone(a, env);
  let dir: 1 | -1;
  if (entering) {
    const left = Math.random() < 0.5;
    dir = left ? 1 : -1;
    a.x = left ? Z.x0 : Z.x1;
    a.y = Z.y0 + (Z.y1 - Z.y0) * clamp(a.pDepth + rnd(-0.1, 0.1), 0, 1);
    a.mode = 'cruise'; a.dur = 12;
    a.tx = clamp(a.x + dir * env.w * rnd(0.25, 0.4), Z.x0, Z.x1); a.ty = a.y;
  } else {
    const slot = clamp((i + 0.5 + rnd(-0.25, 0.25)) / Math.max(1, n), 0, 1);
    a.x = Z.x0 + (Z.x1 - Z.x0) * slot;
    a.y = Z.y0 + (Z.y1 - Z.y0) * clamp(a.pDepth + rnd(-0.15, 0.15), 0, 1);
    dir = Math.random() < 0.5 ? 1 : -1;
    a.tx = a.x; a.ty = a.y;
  }
  a.face = dir; a.want = dir;
  const q = restYaw(dir);
  for (let k = 0; k < 5; k++) a.yaw[k] = q;
  a.yh = a.yb = a.yp = a.yt = a.yf = q;
  a.ax = a.x; a.ay = a.y;
  return a;
}

/** Static three-quarter pose for the shop card. */
export function previewPose(): AngelPose {
  return {
    x: 43, y: 25, S: 21, fade: 1, rot: -0.03, bob: 0, sway: 0,
    yh: 0.5, yb: 0.42, yp: 0.38, yt: 0.36, yf: 0.4, bend: 0, drag: 0.15, lift: 0,
    finPh: 1.1, tailPh: 0.6, tailAmp: 0.12, gape: 0, recoil: 0, vary: [0, 0, 0, 0, 1],
  };
}