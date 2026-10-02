import type { SeaPose } from '@/utils/seahorseModel';
import { yawAt } from '@/utils/seahorseTurn';

/** Projected elliptical cross-section of a tube node. S(φ) = c + cosφ·A + sinφ·B; (c1,s1) = rim angle φ1. */
export interface SNode { cx: number; cy: number; ax: number; ay: number; bx: number; c1: number; s1: number; a: number; dn: number; th: number; tx: number; ty: number; fs: number }
const mk = (): SNode => ({ cx: 0, cy: 0, ax: 0, ay: 0, bx: 0, c1: 1, s1: 0, a: 0.01, dn: 0, th: 0, tx: 0, ty: 1, fs: 1 });
const nodes = (n: number) => Array.from({ length: n }, mk);

// Trunk (neck top → tail root), facing +x, y down, units of H: [x, y, profile half-depth, turn lag]
const BODY = [
  [-0.02, -0.3, 0.048, 0.1], [-0.012, -0.25, 0.058, 0.14], [0.004, -0.19, 0.082, 0.2], [0.026, -0.12, 0.104, 0.26],
  [0.044, -0.05, 0.118, 0.32], [0.048, 0.02, 0.12, 0.38], [0.038, 0.09, 0.108, 0.44], [0.018, 0.15, 0.088, 0.5],
  [-0.006, 0.205, 0.068, 0.56], [-0.025, 0.25, 0.052, 0.62],
];
const TURN = [-0.02, -0.04, -0.08, -0.22, -0.36, -0.44, -0.5, -0.55, -0.6, -0.66, -0.72, -0.78];
const TLEN = [0.045, 0.043, 0.041, 0.039, 0.037, 0.035, 0.033, 0.031, 0.029, 0.027, 0.025, 0.023];
// Head relative to the neck top: [x, y, half-depth, lateral ratio] — occiput → cheek → eye → brow → slender snout → tip
const HEAD = [
  [-0.035, -0.085, 0.05, 0.72], [0.015, -0.075, 0.072, 0.7], [0.07, -0.058, 0.066, 0.68], [0.125, -0.04, 0.048, 0.74],
  [0.175, -0.026, 0.033, 0.85], [0.235, -0.01, 0.025, 0.95], [0.29, 0.005, 0.024, 1], [0.325, 0.014, 0.029, 1],
];
const CROWN = [[-0.005, -0.125, 0.03, 0.8], [-0.013, -0.163, 0.021, 0.8], [-0.02, -0.188, 0.012, 0.9]];

export const NB = BODY.length, NT = TURN.length, NBD = NB + NT;
export const BD = nodes(NBD), HD = nodes(HEAD.length), CR = nodes(CROWN.length);
export const PX = new Float32Array(NBD), PY = new Float32Array(NBD), PZ = new Float32Array(NBD);
export const PA = new Float32Array(NBD), NXA = new Float32Array(NBD), NYA = new Float32Array(NBD);
export const HF = { ox: 0, oy: 0, c: 1, s: 0, pc: 1, ps: 0, push: 0 };
export const HP = { x: 0, y: 0, d: 0, lx: 0, ly: 0 };
export const TIPL = { x: 0, y: 0 };
export const TIPW = { x: 0, y: 0 };
const LX = new Float32Array(8), LY = new Float32Array(8);

/** Head-local 3D point → local screen (pitch, suction push, head yaw). */
export function headProj(lx: number, ly: number, lz: number) {
  const x = lx * HF.pc - ly * HF.ps + HF.push, y = lx * HF.ps + ly * HF.pc;
  HP.lx = x; HP.ly = y;
  HP.x = HF.ox + x * HF.c - lz * HF.s; HP.y = HF.oy + y; HP.d = x * HF.s + lz * HF.c;
}

function setNode(o: SNode, cx: number, cy: number, nx: number, ny: number, a: number, br: number, th: number, prev: SNode | null) {
  const c = Math.cos(th), sn = Math.sin(th), b = a * br;
  o.cx = cx; o.cy = cy; o.a = a; o.th = th; o.dn = nx * sn;
  o.ax = a * nx * c; o.ay = a * ny; o.bx = -b * sn;
  let vx = a * c, vy = -b * nx * sn, l = Math.hypot(vx, vy);
  const lim = 0.15 * a;
  if (prev && l < lim) { const w = ((lim - l) / lim) * a; vx += prev.c1 * w; vy += prev.s1 * w; l = Math.hypot(vx, vy); }
  if (l < 1e-9) { vx = 1; vy = 0; l = 1; }
  o.c1 = vx / l; o.s1 = vy / l;
}

function capDir(o: SNode, from: SNode, len3: number) {
  const dx = o.cx - from.cx, dy = o.cy - from.cy, l = Math.hypot(dx, dy);
  if (l > 1e-5) { o.tx = dx / l; o.ty = dy / l; } else { o.tx = 0; o.ty = 1; }
  o.fs = Math.min(1, Math.max(0.6, l / Math.max(1e-5, len3)));
}

function headChain(N: SNode[], T: number[][], th: number, flare: number) {
  const n = T.length;
  for (let j = 0; j < n; j++) { headProj(T[j][0], T[j][1], 0); LX[j] = HP.lx; LY[j] = HP.ly; N[j].cx = HP.x; N[j].cy = HP.y; }
  for (let j = 0; j < n; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(n - 1, j + 1);
    let tx = LX[j1] - LX[j0], ty = LY[j1] - LY[j0];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    setNode(N[j], N[j].cx, N[j].cy, -ty, tx, T[j][2] * (j === n - 1 ? flare : 1), T[j][3], th, j > 0 ? N[j - 1] : null);
  }
  capDir(N[n - 1], N[n - 2], Math.hypot(LX[n - 1] - LX[n - 2], LY[n - 1] - LY[n - 2]));
  capDir(N[0], N[1], Math.hypot(LX[0] - LX[1], LY[0] - LY[1]));
}

/** Builds the whole pseudo-3D seahorse; each segment gets its own yaw so the turn travels head → tail. */
export function buildGeo(s: SeaPose) {
  for (let i = 0; i < NB; i++) {
    const r = BODY[i], w = Math.sin((Math.PI * i) / (NB - 1));
    PX[i] = r[0] + s.bend * 0.02 * w; PY[i] = r[1]; PZ[i] = s.sway * 0.028 * w;
    PA[i] = r[2] * (1 + s.breath * 0.035 * w);
  }
  let ang = Math.atan2(PY[NB - 1] - PY[NB - 2], PX[NB - 1] - PX[NB - 2]) + s.swing * 0.2;
  for (let k = 1; k <= NT; k++) {
    const i = NB - 1 + k, u = k / NT;
    ang += TURN[k - 1] * s.curl + Math.sin(s.wave - k * 0.55) * 0.05 * u;
    PX[i] = PX[i - 1] + TLEN[k - 1] * Math.cos(ang); PY[i] = PY[i - 1] + TLEN[k - 1] * Math.sin(ang);
    PZ[i] = PZ[NB - 1] * (1 - u) + 0.045 * u * u;
    PA[i] = 0.05 - 0.039 * Math.pow(u, 0.8);
  }
  for (let i = 0; i < NBD; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(NBD - 1, i + 1);
    let tx = PX[i1] - PX[i0], ty = PY[i1] - PY[i0];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    NXA[i] = ty; NYA[i] = -tx;
    const th = yawAt(s, i < NB ? BODY[i][3] : 0.64 + 0.36 * ((i - NB + 1) / NT)), c = Math.cos(th), sn = Math.sin(th);
    const cx = i < NB ? PX[i] * c - PZ[i] * sn : BD[i - 1].cx + (PX[i] - PX[i - 1]) * c - (PZ[i] - PZ[i - 1]) * sn;
    setNode(BD[i], cx, PY[i], ty, -tx, PA[i], i < 2 ? 0.62 : 0.56, th, i > 0 ? BD[i - 1] : null);
  }
  capDir(BD[NBD - 1], BD[NBD - 2], TLEN[NT - 1]);
  capDir(BD[0], BD[1], 0.05);

  const thH = yawAt(s, 0) + s.look * 0.13, sk = Math.max(0, s.suck);
  HF.ox = BD[0].cx; HF.oy = BD[0].cy; HF.c = Math.cos(thH); HF.s = Math.sin(thH);
  HF.pc = Math.cos(s.head); HF.ps = Math.sin(s.head); HF.push = s.suck * 0.022;
  headChain(CR, CROWN, thH, 1);
  headChain(HD, HEAD, thH, 1 + 0.4 * sk);
  const o = HD[HD.length - 1], k = o.a * o.fs * 0.85;
  TIPL.x = o.cx + o.tx * k; TIPL.y = o.cy + o.ty * k;
}

/** World-space snout tip (for aiming and suction). */
export function snoutTip(s: SeaPose) {
  buildGeo(s);
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  TIPW.x = s.x + (TIPL.x * c - TIPL.y * sn) * s.H;
  TIPW.y = s.y + s.bob + (TIPL.x * sn + TIPL.y * c) * s.H;
}