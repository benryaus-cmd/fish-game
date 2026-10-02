import type { AngelPose } from '@/utils/angelModel';

/** Local body units (× S): x forward (snout +0.52, tail base −0.44), y down, z = fish's right flank. */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const NOSE = 0.52;

/** Tall diamond profile: half-height along the spine, with a gentle forehead and slim tail base. */
export function halfH(x: number) {
  if (x >= 0) { const u = Math.min(1, x / NOSE); return 0.034 + 0.326 * Math.pow(1 - Math.pow(u, 1.7), 1.15); }
  if (x >= -0.4) { const u = -x / 0.4; return 0.058 + 0.302 * Math.pow(1 - u * u, 1.35); }
  return 0.058 + (-0.4 - x) * 0.55;
}
export const midY = (x: number) => 0.02 - 0.062 * (x > 0 ? x : 0);

/**
 * Lateral half-thickness. Thin in profile like a real angelfish; as each slice rotates toward the
 * viewer its visible depth swells so the torso keeps about half its breadth and the head keeps more.
 */
export function halfT(x: number, q: number) {
  const g = (x - 0.14) / 0.32, t0 = 0.018 + 0.085 * Math.exp(-g * g), s = Math.sin(q);
  return t0 * (1 + s * s * (1.35 + 0.3 * clamp((x + 0.05) / 0.45, 0, 1)));
}

/** Rotation wave along the spine: head leads, torso holds the middle, tail base trails. */
export function yawAt(a: AngelPose, x: number) {
  if (x > 0.08) return a.yb + (a.yh - a.yb) * Math.min(1, (x - 0.08) / 0.44);
  if (x > -0.26) return a.yb + a.sway * ((0.08 - x) / 0.34);
  const k = Math.min(1, (-0.26 - x) / 0.18);
  return a.yb + a.sway * (1 + 0.6 * k) + (a.yp - a.yb) * k;
}

/** Rotate a local point about the vertical axis by yaw q, with soft perspective (near parts grow). */
export const P = { x: 0, y: 0, d: 0 };
const PK = 0.13;
let pitch = 0;
/** Each synchronous angel render installs its own 3D pitch; legacy colonies default to zero. */
export function setAngelPitch(value = 0) { pitch = value; }
export function proj(x: number, y: number, z: number, q: number) {
  const c = Math.cos(q), s = Math.sin(q), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const forward = x * cp + y * sp;
  const d = forward * s + z * c, k = 1 / (1 - PK * d);
  P.x = (forward * c - z * s) * k; P.y = (-x * sp + y * cp) * k; P.d = d;
}

/** World position of the mouth (written to M). */
export const M = { x: 0, y: 0 };
export function mouthWorld(a: AngelPose) {
  setAngelPitch(a.pitch);
  proj(NOSE + 0.006, midY(NOSE) + 0.008, 0, a.yh);
  const c = Math.cos(a.rot), s = Math.sin(a.rot);
  M.x = a.x - Math.cos(a.yb) * a.recoil * a.S + (P.x * c - P.y * s) * a.S;
  M.y = a.y + a.bob + (P.x * s + P.y * c) * a.S;
  setAngelPitch();
}