import { mix } from '@/utils/colorUtils';
import type { Food } from '@/utils/fishFood';

export const ARMS = 5;
export const BUMPS = 6;
/** Vertical squash of the flat body seen from the aquarium's shallow viewing angle. */
export const SQ = 0.46;
const TAU = Math.PI * 2;

export type StarMode = 'rest' | 'crawl' | 'approach' | 'cover' | 'settle';
export interface StarArm { base: number; len: number; wid: number; bend: number; f1: number; f2: number; p1: number; p2: number }
export interface StarEnv { w: number; h: number; surfaceY: (x: number) => number; sandTop: number; span: number; L: number }

/** Flat bottom-dweller. `z` = screen px below the sand surface line; `R` = arm reach in px. */
export interface Starfish {
  id: number; x: number; z: number; R: number; size: number;
  heading: number; moveDir: number; stride: number; phase: number; clock: number;
  mode: StarMode; t: number; dur: number; tx: number; tz: number; fade: number;
  arms: StarArm[]; bumps: Float32Array;
  pSpeed: number; pIdle: number; homeX: number; seed: number;
  target: Food | null; cover: number; scan: number;
}

export interface StarPalette {
  key: string; core: string; base: string; light: string; tip: string; shade: string; rim: string;
  bump: string; bumpDark: string; ridge: string; humpA: string; humpB: string;
}

/** Warm coral / peach family derived from the tweakable starfish colour. */
export function makeStarPalette(c: string): StarPalette {
  return {
    key: c, core: mix(c, '#b4533c', 0.28), base: c, light: mix(c, '#ffd9c2', 0.38), tip: mix(c, '#ffc2a6', 0.5),
    shade: mix(c, '#7a3426', 0.5), rim: mix(c, '#5e2a1c', 0.55, 0.4),
    bump: mix(c, '#fff0e2', 0.58, 0.8), bumpDark: mix(c, '#8a3c2a', 0.5, 0.35), ridge: mix(c, '#fff3e6', 0.55, 0.2),
    humpA: mix(c, '#fff2e4', 0.5, 0.42), humpB: mix(c, '#fff2e4', 0.5, 0),
  };
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
let nextId = 20000;
export const starRadius = (L: number, size: number) => L * 0.36 * size;

/** Depth range that keeps the whole body on the sand and on screen (written to ZB). */
export const ZB = { z0: 0, z1: 0 };
export function setZBounds(s: Starfish, env: StarEnv) {
  ZB.z0 = s.R * (s.mode === 'cover' || s.mode === 'settle' ? 0.02 : 0.14);
  const room = env.h - env.surfaceY(s.x) - s.R * SQ * 1.1 - 8;
  ZB.z1 = Math.max(ZB.z0, Math.min(env.span * 0.6, room));
}

function makeArms(): StarArm[] {
  const arms: StarArm[] = [];
  for (let k = 0; k < ARMS; k++) {
    arms.push({
      base: (k / ARMS) * TAU + rnd(-0.1, 0.1), len: rnd(0.9, 1.07), wid: rnd(0.25, 0.29), bend: rnd(-0.14, 0.14),
      f1: rnd(0.22, 0.42), f2: rnd(0.15, 0.3), p1: rnd(0, TAU), p2: rnd(0, TAU),
    });
  }
  return arms;
}

/** Per arm: (sv, lateral offset) pairs for the tiny surface bumps. */
function makeBumps(): Float32Array {
  const b = new Float32Array(ARMS * BUMPS * 2);
  for (let i = 0; i < ARMS * BUMPS; i++) { b[i * 2] = rnd(0.2, 0.86); b[i * 2 + 1] = rnd(-0.5, 0.5); }
  return b;
}

/** Load: spread over the floor. Purchase: a free spot, fading/settling in. */
export function spawnStarfish(env: StarEnv, entering: boolean, i: number, n: number, others: Starfish[]): Starfish {
  const size = rnd(0.92, 1.08), R = starRadius(env.L, size), m = R * 1.15;
  const span = Math.max(0, env.w - 2 * m);
  let x = m + span * Math.min(1, Math.max(0, (i + 0.5 + rnd(-0.25, 0.25)) / Math.max(1, n)));
  if (entering) {
    let best = -1;
    for (let k = 0; k < 10; k++) {
      const cx = m + span * Math.random();
      let d = Infinity;
      for (const o of others) d = Math.min(d, Math.abs(o.x - cx));
      if (d > best) { best = d; x = cx; }
    }
  }
  const s: Starfish = {
    id: nextId++, x, z: 0, R, size, heading: rnd(0, TAU), moveDir: rnd(0, TAU), stride: 0, phase: rnd(0, TAU), clock: rnd(0, 60),
    mode: 'rest', t: 0, dur: entering ? rnd(6, 10) : rnd(3, 20), tx: x, tz: 0, fade: entering ? 0 : 1,
    arms: makeArms(), bumps: makeBumps(), pSpeed: rnd(0.8, 1.2), pIdle: rnd(0.8, 1.3), homeX: rnd(0.15, 0.85), seed: rnd(0, 100),
    target: null, cover: 0, scan: rnd(1, 3),
  };
  setZBounds(s, env);
  s.z = ZB.z0 + (ZB.z1 - ZB.z0) * rnd(0.15, 0.8);
  s.tz = s.z;
  return s;
}