import type { Food } from '@/utils/fishFood';
import { restYaw } from '@/utils/seahorseTurn';
export { makeSeaPalette, type SeaPalette } from '@/utils/seahorsePalette';

export type SeaMode = 'hover' | 'drift' | 'approach' | 'eat';
export interface SeaEnv { w: number; h: number; sandTop: number; surfaceY: (x: number) => number; L: number }

/** Everything the renderer needs (live seahorse or shop preview). H = body height px; origin = mid-belly. */
export interface SeaPose {
  x: number; y: number; bob: number; H: number; fade: number; rot: number;
  controlledYaw?: [number, number, number];
  yawFrom: number; yawTo: number; turnP: number; look: number; head: number; suck: number; breath: number;
  bend: number; sway: number; curl: number; swing: number; wave: number; finPh: number; finAmp: number; pecPh: number; blink: number;
}

export interface Seahorse extends SeaPose {
  id: number; vx: number; vy: number; size: number; face: 1 | -1; want: 1 | -1; hold: number; turnDur: number; pTurn: number;
  swingV: number; clock: number; ph: number; tailPh: number; aim: number; lookT: number; lookTo: number; blinkT: number;
  mode: SeaMode; t: number; dur: number; tx: number; ty: number; ax: number; ay: number;
  pSpeed: number; pIdle: number; pReact: number; homeX: number; homeY: number; roam: number;
  target: Food | null; scan: number; ate: boolean;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
let nextId = 30000;
export const seaHeight = (L: number, size: number) => L * 1.02 * size;

/** Preferred middle-lower water box for this seahorse (written to Z): never the surface, never the sand. */
export const Z = { x0: 0, x1: 0, y0: 0, y1: 0 };
export function setZone(s: Seahorse, env: SeaEnv) {
  const m = s.H * 0.34 + 6;
  Z.x0 = m; Z.x1 = Math.max(m, env.w - m);
  const floor = Math.min(env.sandTop, env.surfaceY(s.x));
  Z.y1 = Math.max(s.H * 0.5 + 4, floor - s.H * 0.54 - Math.max(6, s.H * 0.06));
  Z.y0 = Math.min(Z.y1, Math.max(s.H * 0.6 + 8, env.h * 0.42));
}

/** Load: spread over the zone. Purchase: fades in near a side edge, already upright, then drifts inward. */
export function spawnSeahorse(env: SeaEnv, entering: boolean, i: number, n: number): Seahorse {
  const size = rnd(0.9, 1.08), H = seaHeight(env.L, size), left = Math.random() < 0.5;
  const s: Seahorse = {
    id: nextId++, x: 0, y: 0, vx: 0, vy: 0, H, size, fade: entering ? 0 : 1, bob: 0, rot: 0,
    yawFrom: 0, yawTo: 0, turnP: 1, face: 1, want: 1, hold: 0, turnDur: 2, pTurn: rnd(0.9, 1.15),
    look: 0, head: 0, suck: 0, breath: 0, bend: 0, sway: 0, curl: 1, swing: 0, swingV: 0, wave: rnd(0, 6.3),
    finPh: rnd(0, 6.3), finAmp: 0.5, pecPh: rnd(0, 6.3), blink: 0, blinkT: rnd(1, 6), lookTo: 0, lookT: rnd(1, 3),
    clock: rnd(0, 60), ph: rnd(0, 6.3), tailPh: rnd(0, 6.3), aim: 0,
    mode: 'hover', t: 0, dur: rnd(2, 7), tx: 0, ty: 0, ax: 0, ay: 0,
    pSpeed: rnd(0.8, 1.2), pIdle: rnd(0.8, 1.35), pReact: rnd(0.8, 1.3), homeX: rnd(0.15, 0.85), homeY: rnd(0.25, 0.95), roam: rnd(0.7, 1.2),
    target: null, scan: rnd(1, 2.5), ate: false,
  };
  setZone(s, env);
  let dir: 1 | -1;
  if (entering) {
    dir = left ? 1 : -1;
    s.x = left ? Z.x0 : Z.x1;
    s.y = Z.y0 + (Z.y1 - Z.y0) * rnd(0.35, 0.85);
    s.mode = 'drift'; s.dur = 14;
    s.tx = clamp(s.x + dir * env.w * rnd(0.18, 0.3), Z.x0, Z.x1);
    s.ty = s.y;
  } else {
    const slot = clamp((i + 0.5 + rnd(-0.22, 0.22)) / Math.max(1, n), 0, 1);
    s.x = Z.x0 + (Z.x1 - Z.x0) * slot;
    s.y = Z.y0 + (Z.y1 - Z.y0) * clamp(s.homeY + rnd(-0.2, 0.2), 0, 1);
    dir = Math.random() < 0.5 ? 1 : -1;
    s.tx = s.x; s.ty = s.y;
  }
  s.face = dir; s.want = dir;
  s.yawFrom = restYaw(dir); s.yawTo = s.yawFrom;
  s.ax = s.x; s.ay = s.y;
  return s;
}