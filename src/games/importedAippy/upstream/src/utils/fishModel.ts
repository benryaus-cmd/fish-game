import { mix } from '@/utils/colorUtils';
import { ctx2d, makeCanvas } from '@/utils/aquaTextures';
import { LAST, N, STARTER, TAU, type SpeciesTraits } from '@/utils/fishSpecies';

/** Spine sample count (head → tail). All pose data lives in unit space (1 = body length). */
export { N, LAST, TAU };

/** Starter Fish half body height / half lateral thickness per spine point. */
export const HH = STARTER.hh;
export const WW = STARTER.ww;

export interface Fish {
  x: number; y: number; L: number; depth: number; depthTarget: number;
  speed: number; cruise: number; accel: number; vy: number; pitch: number; tilt: number;
  dir: 1 | -1; yaw: number; yawVel: number; yawBody: number; yawTail: number;
  tx: number; ty: number; prefY: number; rest: number; decide: number; turnCool: number;
  turnLift: number; wander: number; seek: boolean; mouth: number; burst: number;
  phase: number; amp: number; finPhase: number; finBoost: number;
  /** Species traits (shape, fins, movement personality). */
  tr: SpeciesTraits;
  /** Identity + personality (speed, preferred height, turn/rest timing, curiosity, reaction). */
  id: number; pSpeed: number; pHeight: number; pTurn: number; pRest: number; pCurious: number; pReact: number;
  /** Entering from off-screen after purchase; fade 0→1. */
  entering: boolean; fade: number;
  px: Float32Array; py: Float32Array; pz: Float32Array; ya: Float32Array;
}

export function fishBaseLength(w: number, h: number): number {
  return Math.max(54, Math.min(118, Math.min(w, h * 0.8) * 0.17));
}

export function createFish(w: number, floorY: number, L: number, tr: SpeciesTraits = STARTER): Fish {
  return {
    x: w * 0.4, y: floorY * 0.45, L, depth: 1, depthTarget: 1,
    speed: L * 0.3, cruise: 0.6, accel: 0, vy: 0, pitch: 0, tilt: 0,
    dir: 1, yaw: 0, yawVel: 0, yawBody: 0, yawTail: 0,
    tx: w * 0.72, ty: floorY * 0.45, prefY: 0.45, rest: 0, decide: 4, turnCool: 2,
    turnLift: 0, wander: 0, seek: false, mouth: 0, burst: 0,
    phase: 0, amp: 0.2, finPhase: 0, finBoost: 0,
    tr,
    id: 0, pSpeed: 1, pHeight: 0.45, pTurn: 1, pRest: 1, pCurious: 1, pReact: 1,
    entering: false, fade: 1,
    px: new Float32Array(N), py: new Float32Array(N), pz: new Float32Array(N), ya: new Float32Array(N),
  };
}

/** On-screen pixel size of one body length, incl. a slight "closer" swell mid-turn. */
export function fishScale(f: Fish): number {
  const s = Math.sin(Math.min(Math.PI, Math.max(0, f.yawBody)));
  return f.L * f.depth * (1 + 0.04 * s);
}

/**
 * Builds the 3D spine: head leads, body and tail follow with lagging yaw, plus a
 * travelling lateral wave. Projected orthographically (x, y), z kept for ordering.
 */
export function computePose(f: Fish): void {
  const seg = 1 / LAST;
  const pitch = f.pitch + f.tilt;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const wave = f.tr.wave;
  let x = 0, y = 0, z = 0, prev = 0;
  for (let i = 0; i < N; i++) {
    const t = i / LAST;
    const base = t < 0.5
      ? f.yaw + (f.yawBody - f.yaw) * t * 2
      : f.yawBody + (f.yawTail - f.yawBody) * (t - 0.5) * 2;
    const a = base + f.amp * (0.06 + t * t) * Math.sin(f.phase - t * wave);
    if (i > 0) {
      const am = (a + prev) * 0.5;
      x -= Math.cos(am) * cp * seg;
      z -= Math.sin(am) * cp * seg;
      y += sp * seg;
    }
    prev = a;
    f.ya[i] = a;
    f.px[i] = x;
    f.pz[i] = z;
    f.py[i] = y + 0.03 * t * t * Math.sin(f.phase - t * wave - 0.9) * (0.4 + f.amp);
  }
  const ox = Math.cos(f.yaw) * cp * 0.42, oz = Math.sin(f.yaw) * cp * 0.42, oy = -sp * 0.42;
  for (let i = 0; i < N; i++) { f.px[i] += ox; f.py[i] += oy; f.pz[i] += oz; }
}

export interface FishPalette {
  top: string; mid: string; low: string; belly: string;
  fin: string; ray: string; mark: string; iris: string; accent: string; gh: number; grad: CanvasGradient | null;
}

export function makePalette(base: string): FishPalette {
  return {
    top: mix(base, '#5a3418', 0.4), mid: mix(base, base, 0), low: mix(base, '#fff0d8', 0.42),
    belly: mix(base, '#fff7ec', 0.74), fin: mix(base, '#ffe2c0', 0.35, 0.6),
    ray: mix(base, '#7a3e1c', 0.45, 0.28), mark: mix(base, '#6a3214', 0.55),
    iris: mix(base, '#f3e2b0', 0.6), accent: mix(base, '#6a3214', 0.55), gh: 0.21, grad: null,
  };
}

/** Colorful Fish: cool blue body, warm golden accents on belly, band and fins. */
export function makeColorfulPalette(base: string, accent: string): FishPalette {
  return {
    top: mix(base, '#18324f', 0.48), mid: mix(base, base, 0), low: mix(base, accent, 0.3),
    belly: mix(accent, '#fff6e2', 0.58), fin: mix(accent, '#fff0cf', 0.22, 0.62),
    ray: mix(accent, '#8a4a1a', 0.45, 0.3), mark: mix(base, '#122840', 0.62),
    iris: mix(accent, '#fff3d0', 0.4), accent: mix(accent, accent, 0), gh: 0.17, grad: null,
  };
}

export function bodyGradient(ctx: CanvasRenderingContext2D, p: FishPalette): CanvasGradient {
  if (!p.grad) {
    const g = ctx.createLinearGradient(0, -p.gh, 0, p.gh);
    g.addColorStop(0, p.top); g.addColorStop(0.36, p.mid);
    g.addColorStop(0.66, p.low); g.addColorStop(1, p.belly);
    p.grad = g;
  }
  return p.grad;
}

function blob(rgb: string): HTMLCanvasElement {
  const c = makeCanvas(64, 64);
  const g = ctx2d(c);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.5, `rgba(${rgb},0.45)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return c;
}

let sprites: { light: HTMLCanvasElement; shade: HTMLCanvasElement; cool: HTMLCanvasElement; ground: HTMLCanvasElement } | null = null;
export function fishSprites() {
  if (!sprites) sprites = { light: blob('255,250,238'), shade: blob('52,26,12'), cool: blob('14,30,54'), ground: blob('18,48,58') };
  return sprites;
}