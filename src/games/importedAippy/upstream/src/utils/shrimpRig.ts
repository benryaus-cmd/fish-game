import type { ShrimpPose } from '@/utils/shrimpModel';
import { yawAt } from '@/utils/shrimpTurn';

/** Spine nodes: 0 carapace front, 1 carapace back, 2–7 ends of the six abdomen segments. */
export const N = 8;
export const SEG_R = [0.08, 0.077, 0.071, 0.062, 0.052, 0.041];
export const CARA_R = 0.09;
export const MOUTH_X = 0.17;
export const MOUTH_Y = 0.055;
const SEG_LEN = [0.1, 0.1, 0.095, 0.088, 0.078, 0.085];
const BEND = [-0.04, -0.12, -0.15, -0.17, -0.17, -0.12];
const LAG = [0, 0.12, 0.25, 0.38, 0.5, 0.63, 0.77, 0.92];
const PITCH = 0.24; // camera looks slightly down: nearer points sit a little lower

/** Profile spine (x forward, y down, units of S, before tilt) + direction of each abdomen segment. */
export const PX = new Float32Array(N);
export const PY = new Float32Array(N);
export const PHI = new Float32Array(N);
/** Projected screen spine and each node's own yaw (the turn travels head → tail). */
export const SX = new Float32Array(N);
export const SY = new Float32Array(N);
export const YW = new Float32Array(N);
export const Q = { x: 0, y: 0, d: 0 };
let ct = 1, st = 0, ox = 0, oy = 0, sc = 1;

export function frame(p: ShrimpPose) {
  ct = Math.cos(p.tilt); st = Math.sin(p.tilt); ox = p.x; oy = p.y; sc = p.S;
}

/** Profile point (x, y) with lateral offset w → screen, rotated about the vertical axis by yaw (never mirrored). */
export function proj(x: number, y: number, w: number, yaw: number) {
  const rx = x * ct - y * st, ry = x * st + y * ct;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const d = rx * sy + w * cy;
  Q.x = ox + (rx * cy - w * sy) * sc;
  Q.y = oy + (ry + d * PITCH) * sc;
  Q.d = d;
}

/** Builds the gently curved, articulated spine: curl tucks the tail under, wave adds delayed segment motion. */
export function buildRig(p: ShrimpPose) {
  frame(p);
  PX[0] = 0.15; PY[0] = -0.004; PX[1] = -0.13; PY[1] = -0.012;
  PHI[0] = Math.PI; PHI[1] = Math.PI;
  let x = PX[1], y = PY[1], phi = Math.PI + 0.1 - p.curl * 0.1;
  for (let k = 0; k < 6; k++) {
    phi += BEND[k] * (1 - 0.3 * p.curl) - p.curl * 0.3 + Math.sin(p.wave - k * 0.75) * 0.03 * (0.4 + k * 0.15);
    x += Math.cos(phi) * SEG_LEN[k];
    y += Math.sin(phi) * SEG_LEN[k];
    PX[k + 2] = x; PY[k + 2] = y; PHI[k + 2] = phi;
  }
  for (let i = 0; i < N; i++) {
    YW[i] = yawAt(p, LAG[i]);
    proj(PX[i], PY[i], 0, YW[i]);
    SX[i] = Q.x; SY[i] = Q.y;
  }
}

/** World position of the mouth (written to Q). */
export function mouthAt(p: ShrimpPose) {
  frame(p);
  proj(MOUTH_X, MOUTH_Y, 0, yawAt(p, 0));
}