import { mix, hexToRgb } from '@/utils/colorUtils';
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

/** Projected orthonormal body axes: forward, local down and lateral. */
export function fishFrame(f: Fish, i: number) {
  const a = f.ya[i], p = f.pitch + f.tilt;
  const ca = Math.cos(a), sa = Math.sin(a), cp = Math.cos(p), sp = Math.sin(p);
  return { fx: ca * cp, fy: -sp, fz: sa * cp,
    dx: ca * sp, dy: cp, dz: sa * sp, lx: -sa, ly: 0, lz: ca };
}

export function fishPoint(f: Fish, i: number, forward = 0, down = 0, lateral = 0) {
  const b = fishFrame(f, i);
  return { x: f.px[i] + b.fx * forward + b.dx * down + b.lx * lateral,
    y: f.py[i] + b.fy * forward + b.dy * down,
    z: f.pz[i] + b.fz * forward + b.dz * down + b.lz * lateral };
}

/** Covariance of a projected 3D ellipsoid, used for body sections and markings. */
export function fishEllipse(ctx: CanvasRenderingContext2D, f: Fish, i: number,
  forward: number, down: number, lateral = 0, offsetDown = 0, offsetLateral = 0) {
  const b = fishFrame(f, i), q = fishPoint(f, i, 0, offsetDown, offsetLateral);
  const xx = (b.fx * forward) ** 2 + (b.dx * down) ** 2 + (b.lx * lateral) ** 2;
  const yy = (b.fy * forward) ** 2 + (b.dy * down) ** 2;
  const xy = b.fx * b.fy * forward ** 2 + b.dx * b.dy * down ** 2;
  const delta = Math.hypot(xx - yy, 2 * xy);
  const rx = Math.sqrt(Math.max(0.000001, (xx + yy + delta) * 0.5));
  const ry = Math.sqrt(Math.max(0.000001, (xx + yy - delta) * 0.5));
  const angle = Math.atan2(2 * xy, xx - yy) * 0.5;
  ctx.moveTo(q.x + Math.cos(angle) * rx, q.y + Math.sin(angle) * rx);
  ctx.ellipse(q.x, q.y, rx, ry, angle, 0, TAU);
}

/** Soft surface shading rotates with the local frame, not the screen. */
export function fishBlit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, f: Fish,
  i: number, down: number, lateral: number, w: number, h: number, alpha: number) {
  if (alpha <= 0.005) return;
  const q = fishPoint(f, i, 0, down, lateral);
  const p = f.pitch + f.tilt, facing = Math.cos(f.ya[i]) >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(q.x, q.y);
  ctx.rotate(-facing * p);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
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
    const bob = 0.03 * t * t * Math.sin(f.phase - t * wave - 0.9) * (0.4 + f.amp);
    f.px[i] = x + Math.cos(a) * sp * bob;
    f.pz[i] = z + Math.sin(a) * sp * bob;
    f.py[i] = y + cp * bob;
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

/** Palette colours are rgba strings; the shared mix utility accepts hex only. */
function blendPaletteColor(a: string,b: string,t: number): string {
  if(t===0)return a;
  const channels=(c:string)=>c.startsWith('rgb') ? c.match(/[\d.]+/g)!.slice(0,3).map(Number) : hexToRgb(c);
  const A=channels(a),B=channels(b);
  return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`;
}

export function bodyGradient(ctx: CanvasRenderingContext2D, p: FishPalette, f?: Fish): CanvasGradient {
  if (!p.grad || f) {
    const b = f ? fishFrame(f, Math.round(LAST * 0.5)) : { dx: 0, dy: 1 };
    // The local down axis becomes depth in a dorsal view. Blend to width lighting
    // instead of collapsing its gradient into a harsh belly-coloured stripe.
    const frame = f ? fishFrame(f, Math.round(LAST * 0.5)) : null;
    const view = frame ? Math.max(0,Math.min(1,(Math.abs(frame.dz)-0.25)/0.65)) : 0;
    const radius = f ? f.tr.ww[Math.round(LAST*0.5)] * 1.4 : p.gh;
    const gx = b.dx*p.gh*(1-view) + (frame?.lx ?? 0)*radius*view;
    const gy = b.dy*p.gh*(1-view);
    const g = ctx.createLinearGradient(-gx,-gy,gx,gy);
    const dorsal = (frame?.dz ?? 0)<0;
    const edge = dorsal ? p.top : p.low;
    const centre = dorsal ? blendPaletteColor(p.mid,p.top,0.35) : p.belly;
    g.addColorStop(0,blendPaletteColor(p.top,edge,view)); g.addColorStop(0.36,blendPaletteColor(p.mid,centre,view));
    g.addColorStop(0.66,blendPaletteColor(p.low,centre,view)); g.addColorStop(1,blendPaletteColor(p.belly,edge,view));
    if (f) return g;
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
