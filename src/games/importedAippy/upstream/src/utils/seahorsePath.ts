import type { SNode } from '@/utils/seahorseGeom';

export const HALF = Math.PI / 2;
export const Q = { x: 0, y: 0 };
const XS = new Float32Array(72), YS = new Float32Array(72);

export const sstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Surface point at φ = φ1 + δ (relative to the silhouette rim). */
export function rel(o: SNode, cd: number, sd: number) {
  const c = o.c1 * cd - o.s1 * sd, s = o.s1 * cd + o.c1 * sd;
  Q.x = o.cx + c * o.ax + s * o.bx; Q.y = o.cy + c * o.ay;
}
/** Surface point at absolute φ (0 = belly/ventral line, π = back/dorsal line). */
export function absPt(o: SNode, c: number, s: number) { Q.x = o.cx + c * o.ax + s * o.bx; Q.y = o.cy + c * o.ay; }

export function smoothClosed(ctx: CanvasRenderingContext2D, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number) {
  ctx.moveTo((xs[n - 1] + xs[0]) / 2, (ys[n - 1] + ys[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[j]) / 2, (ys[i] + ys[j]) / 2);
  }
  ctx.closePath();
}

export function smoothOpen(ctx: CanvasRenderingContext2D, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number) {
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
  ctx.lineTo(xs[n - 1], ys[n - 1]);
}

/** Smooth silhouette of a tube: rim side A, rounded end cap, rim side B, rounded start cap. */
export function traceTube(ctx: CanvasRenderingContext2D, N: SNode[], i0: number, i1: number) {
  let k = 0;
  for (let i = i0; i <= i1; i++) { rel(N[i], 1, 0); XS[k] = Q.x; YS[k++] = Q.y; }
  const e = N[i1], ce = e.a * e.fs;
  XS[k] = e.cx + e.tx * ce; YS[k++] = e.cy + e.ty * ce;
  for (let i = i1; i >= i0; i--) { rel(N[i], -1, 0); XS[k] = Q.x; YS[k++] = Q.y; }
  const b = N[i0], cb = b.a * b.fs;
  XS[k] = b.cx + b.tx * cb; YS[k++] = b.cy + b.ty * cb;
  smoothClosed(ctx, XS, YS, k);
}

export function strokeRel(ctx: CanvasRenderingContext2D, N: SNode[], i0: number, i1: number, d: number) {
  const cd = Math.cos(d), sd = Math.sin(d);
  let k = 0;
  for (let i = i0; i <= i1; i++) { rel(N[i], cd, sd); XS[k] = Q.x; YS[k++] = Q.y; }
  ctx.beginPath(); smoothOpen(ctx, XS, YS, k); ctx.stroke();
}

export function strokeAbs(ctx: CanvasRenderingContext2D, N: SNode[], i0: number, i1: number, c: number, s: number) {
  let k = 0;
  for (let i = i0; i <= i1; i++) { absPt(N[i], c, s); XS[k] = Q.x; YS[k++] = Q.y; }
  ctx.beginPath(); smoothOpen(ctx, XS, YS, k); ctx.stroke();
}

const R: SNode = { cx: 0, cy: 0, ax: 0, ay: 0, bx: 0, c1: 1, s1: 0, a: 0.01, dn: 0, th: 0, tx: 0, ty: 1, fs: 1 };
export function lerpNode(N: SNode[], f: number): SNode {
  const i = Math.max(0, Math.min(N.length - 2, Math.floor(f))), t = f - i, A = N[i], B = N[i + 1];
  R.cx = A.cx + (B.cx - A.cx) * t; R.cy = A.cy + (B.cy - A.cy) * t;
  R.ax = A.ax + (B.ax - A.ax) * t; R.ay = A.ay + (B.ay - A.ay) * t; R.bx = A.bx + (B.bx - A.bx) * t;
  R.a = A.a + (B.a - A.a) * t; R.dn = A.dn + (B.dn - A.dn) * t;
  const c = A.c1 + (B.c1 - A.c1) * t, s = A.s1 + (B.s1 - A.s1) * t, l = Math.hypot(c, s) || 1;
  R.c1 = c / l; R.s1 = s / l;
  return R;
}

const RC = Math.cos(0.22), RS = Math.sin(0.22);
/** Visible half of a body ring — it bows as the body rotates, which reads as real volume. */
export function ringPath(ctx: CanvasRenderingContext2D, o: SNode, dx: number, dy: number) {
  rel(o, RC, RS); const x0 = Q.x + dx, y0 = Q.y + dy;
  rel(o, 0, 1); const xm = Q.x + dx, ym = Q.y + dy;
  rel(o, -RC, RS); const x1 = Q.x + dx, y1 = Q.y + dy;
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(2 * xm - (x0 + x1) / 2, 2 * ym - (y0 + y1) / 2, x1, y1);
}

const LC = Math.cos(HALF - 0.6), LS = Math.sin(HALF - 0.6), MC = Math.cos(HALF + 0.6), MS = Math.sin(HALF + 0.6);
/** Continuous −1..1: which side of the visible surface faces the upper-left key light. */
export function litSign(o: SNode) {
  rel(o, LC, LS); const la = -Q.x - 0.7 * Q.y;
  rel(o, MC, MS); const lb = -Q.x - 0.7 * Q.y;
  const v = (lb - la) / (0.5 * o.a);
  return v < -1 ? -1 : v > 1 ? 1 : v;
}