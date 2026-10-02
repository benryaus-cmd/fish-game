import { mix } from '@/utils/colorUtils';
import type { Food } from '@/utils/fishFood';
import { restYaw } from '@/utils/shrimpTurn';

export type ShrimpMode = 'rest' | 'walk' | 'hover' | 'flick' | 'approach' | 'eat';
export interface ShrimpEnv { w: number; h: number; sandTop: number; surfaceY: (x: number) => number; L: number }

/** Everything the renderer needs (live shrimp or shop preview). S = body length px; origin = carapace centre. */
export interface ShrimpPose {
  x: number; y: number; S: number; fade: number; tilt: number;
  yawFrom: number; yawTo: number; turnP: number;
  curl: number; fan: number; wave: number; clock: number; swim: number; step: number; stride: number; ground: number; gy: number;
  antA: number; antB: number; antTrail: number; antAim: number; feed: number; feedPh: number;
}

export interface Shrimp extends ShrimpPose {
  id: number; vx: number; vy: number; size: number; face: 1 | -1; want: 1 | -1; hold: number; turnDur: number; pTurn: number;
  mode: ShrimpMode; t: number; dur: number; tx: number; ty: number; kicked: boolean; lastStep: number;
  pSpeed: number; pIdle: number; pReact: number; pAnt: number; homeX: number; flickIn: number;
  target: Food | null; scan: number; ate: boolean;
}

export interface ShrimpPalette {
  key: string; shellHi: string; shell: string; shellMid: string; belly: string; shade: string; rim: string; seg: string; gut: string;
  leg: string; legFar: string; ant: string; antFar: string; eye: string; eyeHi: string; fan: string; fanEdge: string; spot: string;
}

/** Soft translucent coral / peach family derived from the tweakable shell colour. */
export function makeShrimpPalette(color: string | undefined): ShrimpPalette {
  const c = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#f29a80';
  return {
    key: c, shellHi: mix(c, '#fff4ea', 0.6, 0.94), shell: mix(c, '#ffb59a', 0.12, 0.9), shellMid: mix(c, '#e8826a', 0.25, 0.9),
    belly: mix(c, '#fff1e2', 0.6, 0.86), shade: mix(c, '#a8483a', 0.4, 0.92), rim: mix(c, '#7a2e22', 0.5, 0.42), seg: mix(c, '#8e3a2c', 0.45, 0.45),
    gut: mix(c, '#9a5a3c', 0.5, 0.2), leg: mix(c, '#ffd8c6', 0.3, 0.9), legFar: mix(c, '#b8604c', 0.3, 0.7),
    ant: mix(c, '#ffdccc', 0.3, 0.85), antFar: mix(c, '#c27060', 0.3, 0.55), eye: '#1e1416', eyeHi: 'rgba(255,255,255,0.75)',
    fan: mix(c, '#ffc2a8', 0.25, 0.82), fanEdge: mix(c, '#c84a36', 0.4, 0.65), spot: mix(c, '#fffaf2', 0.75, 0.55),
  };
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
let nextId = 40000;

/** Height of the carapace centre above the sand when standing (units of S). */
export const REST_H = 0.19;
export const shrimpSize = (L: number, size: number) => L * 0.55 * size;
export const floorAt = (env: ShrimpEnv, x: number, S: number) => env.surfaceY(x) - S * REST_H;
export const margin = (S: number) => S * 0.9 + 6;

const basePose = (S: number, dir: number): ShrimpPose => ({
  x: 0, y: 0, S, fade: 1, tilt: 0, yawFrom: restYaw(dir), yawTo: restYaw(dir), turnP: 1,
  curl: 0.04, fan: 0.65, wave: rnd(0, 6.3), clock: rnd(0, 60), swim: 0, step: rnd(0, 4), stride: 0.15, ground: 1, gy: REST_H,
  antA: rnd(0, 6.3), antB: rnd(0, 6.3), antTrail: 0, antAim: 0, feed: 0, feedPh: 0,
});

/** Static pose for the shop preview. */
export function previewPose(): ShrimpPose {
  return { ...basePose(28, 1), x: 30, y: 27, wave: 1, clock: 0.6, swim: 0.3, ground: 0, gy: 0.3, antA: 0.6, antB: 2.1, antTrail: 0.15, step: 0.2 };
}

/** Load: rests spread over the sand. Purchase: fades in low near a side edge, then hovers inward. */
export function spawnShrimp(env: ShrimpEnv, entering: boolean, i: number, n: number): Shrimp {
  const size = rnd(0.88, 1.1), S = shrimpSize(env.L, size), m = margin(S), left = Math.random() < 0.5;
  const slot = clamp((i + 0.5 + rnd(-0.25, 0.25)) / Math.max(1, n), 0, 1);
  const x = entering ? (left ? m : env.w - m) : m + Math.max(0, env.w - 2 * m) * slot;
  const dir: 1 | -1 = entering ? (left ? 1 : -1) : Math.random() < 0.5 ? 1 : -1;
  const fy = floorAt(env, x, S), y = entering ? fy - S * rnd(0.35, 0.6) : fy;
  return {
    ...basePose(S, dir), x, y, fade: entering ? 0 : 1, ground: entering ? 0 : 1, swim: entering ? 1 : 0,
    id: nextId++, vx: 0, vy: 0, size, face: dir, want: dir, hold: 0, turnDur: 1.2, pTurn: rnd(0.85, 1.15),
    mode: entering ? 'hover' : 'rest', t: 0, dur: entering ? 10 : rnd(1, 5),
    tx: entering ? clamp(x + dir * env.w * rnd(0.15, 0.25), m, Math.max(m, env.w - m)) : x, ty: entering ? fy - S * 0.3 : y,
    kicked: false, lastStep: 0, pSpeed: rnd(0.8, 1.2), pIdle: rnd(0.8, 1.3), pReact: rnd(0.8, 1.3), pAnt: rnd(0.8, 1.2),
    homeX: rnd(0.15, 0.85), flickIn: rnd(8, 30), target: null, scan: rnd(0.5, 2), ate: false,
  };
}