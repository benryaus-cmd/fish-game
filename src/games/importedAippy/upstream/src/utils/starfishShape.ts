import { ARMS, type StarArm } from '@/utils/starfishModel';

export interface StarPose { heading: number; clock: number; stride: number; phase: number; moveDir: number; cover: number; breathe: number }
const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.round(a / TAU);

/** Live per-arm values: angle, length, bend, tip curl. */
export const AL = new Float32Array(ARMS * 4);

/** Independent slow arm motion + a crawl "pull": forward arms reach, rear contract, side arms sweep back. */
export function computeArms(arms: StarArm[], p: StarPose) {
  const pulse = Math.sin(p.phase);
  for (let i = 0; i < ARMS; i++) {
    const a = arms[i], ang = p.heading + a.base;
    const align = Math.cos(ang - p.moveDir), side = Math.sin(ang - p.moveDir);
    AL[i * 4] = ang;
    AL[i * 4 + 1] = a.len * (1 + 0.028 * Math.sin(p.clock * a.f1 + a.p1) + p.stride * 0.11 * align * pulse + 0.012 * p.breathe) * (1 - 0.08 * p.cover);
    AL[i * 4 + 2] = a.bend + 0.05 * Math.sin(p.clock * a.f2 + a.p2) + p.stride * 0.13 * side * pulse;
    AL[i * 4 + 3] = 0.04 * Math.sin(p.clock * a.f1 * 0.6 + a.p2) + p.cover * 0.12 * (a.bend >= 0 ? 1 : -1);
  }
}

/** Centreline point + normal of arm i at fraction sv (written to C). */
export const C = { x: 0, y: 0, nx: 0, ny: 0 };
export function centerAt(i: number, sv: number) {
  const ang = AL[i * 4], len = AL[i * 4 + 1], bend = AL[i * 4 + 2], curl = AL[i * 4 + 3];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const al = sv * len, lat = (bend * sv * sv + curl * sv * sv * sv) * len;
  C.x = ca * al - sa * lat;
  C.y = sa * al + ca * lat;
  const tl = (2 * bend * sv + 3 * curl * sv * sv) * len;
  let tx = ca * len - sa * tl, ty = sa * len + ca * tl;
  const n = Math.hypot(tx, ty) || 1;
  tx /= n; ty /= n;
  C.nx = -ty; C.ny = tx;
}

export const widthAt = (arms: StarArm[], i: number, sv: number, p: StarPose) =>
  arms[i].wid * (1 - 0.8 * sv) * (1 + 0.02 * p.breathe + 0.08 * p.cover);

const SV = [0.36, 0.55, 0.73, 0.88];
export const OUTLINE_LEN = ARMS * 20;

/** Organic outline control points (unit space), smoothed later by tracePath. */
export function buildOutline(out: Float32Array, arms: StarArm[], p: StarPose) {
  let k = 0;
  for (let i = 0; i < ARMS; i++) {
    for (let j = 0; j < SV.length; j++) {
      centerAt(i, SV[j]);
      const w = widthAt(arms, i, SV[j], p);
      out[k++] = C.x - C.nx * w; out[k++] = C.y - C.ny * w;
    }
    centerAt(i, 1.02);
    out[k++] = C.x; out[k++] = C.y;
    for (let j = SV.length - 1; j >= 0; j--) {
      centerAt(i, SV[j]);
      const w = widthAt(arms, i, SV[j], p);
      out[k++] = C.x + C.nx * w; out[k++] = C.y + C.ny * w;
    }
    const a0 = AL[i * 4], a1 = AL[((i + 1) % ARMS) * 4];
    const mid = a0 + wrap(a1 - a0) / 2, r = 0.3 * (1 + 0.02 * p.breathe) * (1 + 0.06 * p.cover);
    out[k++] = Math.cos(mid) * r; out[k++] = Math.sin(mid) * r;
  }
}

/** Closed smooth path through midpoints (quadratic), giving soft organic curvature. */
export function tracePath(ctx: CanvasRenderingContext2D, out: Float32Array) {
  const n = out.length / 2;
  ctx.beginPath();
  ctx.moveTo((out[(n - 1) * 2] + out[0]) / 2, (out[(n - 1) * 2 + 1] + out[1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = ((i + 1) % n) * 2;
    ctx.quadraticCurveTo(out[i * 2], out[i * 2 + 1], (out[i * 2] + out[j]) / 2, (out[i * 2 + 1] + out[j + 1]) / 2);
  }
  ctx.closePath();
}

/** Same smoothed outline as an SVG path string (shop preview). */
export function outlineD(out: Float32Array): string {
  const n = out.length / 2, f = (v: number) => v.toFixed(3);
  let d = `M${f((out[(n - 1) * 2] + out[0]) / 2)} ${f((out[(n - 1) * 2 + 1] + out[1]) / 2)}`;
  for (let i = 0; i < n; i++) {
    const j = ((i + 1) % n) * 2;
    d += `Q${f(out[i * 2])} ${f(out[i * 2 + 1])} ${f((out[i * 2] + out[j]) / 2)} ${f((out[i * 2 + 1] + out[j + 1]) / 2)}`;
  }
  return `${d}Z`;
}