import { mix } from '@/utils/colorUtils';
import type { Food } from '@/utils/fishFood';
import { ARM1, ARM2, EDGE, ELBOW_QX, ELBOW_QY, GRIP, IK, REST_A, REST_X, REST_Y, SHOULDER_X, SHOULDER_Y, YAW, solve2 } from '@/utils/crabRig';

export type CrabMode = 'walk' | 'idle' | 'turn' | 'approach' | 'wait' | 'eat';
export type IdleAct = 'none' | 'lift' | 'pinch' | 'eyes' | 'groom' | 'shift';
/** Claw pose in body space: wrist, side-relative pointing angle (0 = outward, −π/2 = up) and pincer opening. */
export interface ClawPose { x: number; y: number; a: number; open: number }
/** World-planted foot. q < 0 = planted; 0..1 = swing progress (after `wait`). */
export interface Foot { x: number; y: number; sx: number; sy: number; q: number; wait: number; dur: number; lift: number }
export interface CrabEnv { w: number; h: number; surfaceY: (x: number) => number; sandTop: number; span: number; L: number; speed: number }

/** Floor-bound crab. Local units are multiples of S; origin = shell centre. */
export interface Crab {
  id: number; x: number; lane: number; laneT: number; vx: number; ax: number; tx: number; dir: number;
  yaw: number; yaw0: number; rot: number; bob: number; swing: number; cx: number; cy: number; footY: number;
  mode: CrabMode; resume: CrabMode; t: number; dur: number; clock: number; act: IdleAct; actSide: number;
  gait: number; lastGroup: number; fade: number; size: number; S: number;
  pSpeed: number; pIdle: number; pClaw: number; pReact: number; home: number; seed: number;
  feet: Foot[]; claws: ClawPose[]; eyeL: number; eyeR: number; eyeLift: number; chew: number;
  target: Food | null; side: number; scan: number; held: boolean; bitten: boolean;
  rw: number; rx: number; ry: number; ra: number; ro: number; gx0: number; gy0: number;
}

export interface CrabPalette {
  key: string; base: string; light: string; shade: string; dark: string; belly: string; bellyDark: string;
  leg: string; legBack: string; legDark: string; legLight: string; joint: string; tip: string;
  claw: string; clawLight: string; clawDark: string; finger: string; mark: string; eye: string; outline: string;
}

/** Soft coral / peach family derived from the tweakable shell colour. */
export function makeCrabPalette(c: string): CrabPalette {
  return {
    key: c, base: mix(c, '#ff9a76', 0.08), light: mix(c, '#ffe6cf', 0.55), shade: mix(c, '#9a4230', 0.32), dark: mix(c, '#5a2418', 0.52),
    belly: mix(c, '#fdeedd', 0.72), bellyDark: mix(c, '#c07a5c', 0.45),
    leg: mix(c, '#d77a58', 0.28), legBack: mix(c, '#8a4432', 0.4), legDark: mix(c, '#5a2418', 0.5, 0.32), legLight: mix(c, '#fff1e4', 0.55, 0.45),
    joint: mix(c, '#50221a', 0.55), tip: mix(c, '#4e2219', 0.6),
    claw: mix(c, '#e87c5a', 0.2), clawLight: mix(c, '#fff3e6', 0.55), clawDark: mix(c, '#5e2519', 0.45), finger: mix(c, '#8e3c28', 0.42),
    mark: mix(c, '#6a2a1a', 0.55), eye: '#231719', outline: mix(c, '#43190f', 0.62, 0.55),
  };
}

let nextId = 10000;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const crabScale = (L: number, size: number) => L * 0.74 * size;

/** Load: spread across the floor. Purchase: enters from a lower side edge, fading in. */
export function spawnCrab(w: number, L: number, entering: boolean, i: number, n: number): Crab {
  const size = rnd(0.94, 1.06), S = crabScale(L, size), m = S * EDGE;
  const left = Math.random() < 0.5;
  const slot = Math.min(1, Math.max(0, (i + 0.5 + rnd(-0.22, 0.22)) / Math.max(1, n)));
  const x = entering ? (left ? m : w - m) : m + Math.max(0, w - 2 * m) * slot;
  const dir = entering ? (left ? 1 : -1) : Math.random() < 0.5 ? 1 : -1;
  const lane = rnd(0.12, 0.6);
  const claw = (sg: number): ClawPose => ({ x: sg * REST_X, y: REST_Y, a: REST_A, open: 0.08 });
  return {
    id: nextId++, x, lane, laneT: lane, vx: 0, ax: 0, tx: entering ? x + dir * w * rnd(0.14, 0.28) : x, dir,
    yaw: dir * YAW, yaw0: 0, rot: 0, bob: 0, swing: 0, cx: x, cy: 0, footY: 0,
    mode: entering ? 'walk' : 'idle', resume: 'walk', t: 0, dur: rnd(0.8, 2.6), clock: rnd(0, 50), act: 'none', actSide: 0,
    gait: 0, lastGroup: 1, fade: entering ? 0 : 1, size, S,
    pSpeed: rnd(0.85, 1.15), pIdle: rnd(0.8, 1.3), pClaw: rnd(0.6, 1.2), pReact: rnd(0.8, 1.25), home: rnd(0.2, 0.8), seed: rnd(0, 100),
    feet: [], claws: [claw(-1), claw(1)], eyeL: 0, eyeR: 0, eyeLift: 0, chew: 0,
    target: null, side: 0, scan: rnd(0.4, 1.2), held: false, bitten: false,
    rw: 0, rx: 0, ry: 0, ra: REST_A, ro: 0, gx0: 0, gy0: 0,
  };
}

/** Shared scratch point (copy values immediately after each call). */
export const P = { x: 0, y: 0 };
const squeeze = (c: Crab, x: number) => (x * c.yaw > 0 ? 1 - 0.22 * Math.abs(c.yaw) : 1 + 0.08 * Math.abs(c.yaw));

/** Local → world with soft yaw foreshortening (never mirrored) and body roll. */
export function toWorld(c: Crab, lx: number, ly: number, front = 0) {
  const x = lx * squeeze(c, lx) + c.yaw * (0.05 + 0.07 * front);
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  P.x = c.cx + (x * cs - ly * sn) * c.S;
  P.y = c.cy + (x * sn + ly * cs) * c.S;
}

/** Exact inverse of toWorld (front = 0). */
export function toLocal(c: Crab, wx: number, wy: number) {
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  const dx = (wx - c.cx) / c.S, dy = (wy - c.cy) / c.S;
  const xr = dx * cs + dy * sn - c.yaw * 0.05;
  P.x = xr / squeeze(c, xr);
  P.y = -dx * sn + dy * cs;
}

/** Cheliped geometry in local space: shoulder, elbow, wrist, claw angle, size and grip point. */
export const G = { sx: 0, sy: 0, ex: 0, ey: 0, hx: 0, hy: 0, ang: 0, gx: 0, gy: 0, sz: 1 };
export function clawGeom(c: Crab, s: number) {
  const sg = s ? 1 : -1, p = c.claws[s];
  G.sz = s ? 1.06 : 1;
  G.sx = sg * SHOULDER_X; G.sy = SHOULDER_Y;
  solve2(G.sx, G.sy, p.x, p.y, ARM1, ARM2, sg * ELBOW_QX, ELBOW_QY);
  G.ex = IK.kx; G.ey = IK.ky; G.hx = IK.ex; G.hy = IK.ey;
  const dx = sg * Math.cos(p.a), dy = Math.sin(p.a);
  G.ang = Math.atan2(dy, dx);
  G.gx = G.hx + dx * GRIP * G.sz; G.gy = G.hy + dy * GRIP * G.sz;
}