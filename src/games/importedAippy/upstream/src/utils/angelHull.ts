import type { AngelPose } from '@/utils/angelModel';
import { halfH, halfT, midY, NOSE, P, proj, yawAt } from '@/utils/angelProject';

/**
 * Volumetric silhouette: the body is a stack of elliptical cross-sections, each rotated by its own
 * yaw. The outline is the convex wrap of the projected rings — main torso and slim tail base are
 * wrapped separately and filled as a union so the tail-base waist stays concave.
 */
const R = 14, MAIN = 13, PED = 5, NP = (MAIN + PED) * R;
const px = new Float32Array(NP), py = new Float32Array(NP);
const CS = new Float32Array(R), SN = new Float32Array(R);
for (let j = 0; j < R; j++) { CS[j] = Math.cos((j / R) * Math.PI * 2); SN[j] = Math.sin((j / R) * Math.PI * 2); }
const idx: number[] = [];
const hA = new Int16Array(MAIN * R + 4), hB = new Int16Array(PED * R + 4);
export const HB = { x0: 0, x1: 0 };

const cmp = (i: number, j: number) => px[i] - px[j] || py[i] - py[j];
const cross = (o: number, p: number, q: number) => (px[p] - px[o]) * (py[q] - py[o]) - (py[p] - py[o]) * (px[q] - px[o]);

function rings(a: AngelPose, slot: number, n: number, x0: number, x1: number) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1), q = yawAt(a, x), h = halfH(x), m = midY(x), t = halfT(x, q);
    for (let j = 0; j < R; j++) {
      proj(x, m + h * SN[j], t * CS[j], q);
      const k = (slot + i) * R + j;
      px[k] = P.x; py[k] = P.y;
    }
  }
}

function wrap(from: number, count: number, out: Int16Array) {
  idx.length = 0;
  for (let k = from; k < from + count; k++) idx.push(k);
  idx.sort(cmp);
  let m = 0;
  for (let n = 0; n < count; n++) { const p = idx[n]; while (m >= 2 && cross(out[m - 2], out[m - 1], p) <= 0) m--; out[m++] = p; }
  for (let n = count - 2, lo = m + 1; n >= 0; n--) { const p = idx[n]; while (m >= lo && cross(out[m - 2], out[m - 1], p) <= 0) m--; out[m++] = p; }
  return Math.max(3, m - 1);
}

function trace(ctx: CanvasRenderingContext2D, out: Int16Array, n: number) {
  const l = out[n - 1], f = out[0];
  ctx.moveTo((px[l] + px[f]) / 2, (py[l] + py[f]) / 2);
  for (let i = 0; i < n; i++) {
    const p = out[i], q = out[(i + 1) % n];
    ctx.quadraticCurveTo(px[p], py[p], (px[p] + px[q]) / 2, (py[p] + py[q]) / 2);
  }
  ctx.closePath();
}

/** Builds the current body outline as the active path (body-unit space). */
export function bodyPath(ctx: CanvasRenderingContext2D, a: AngelPose) {
  rings(a, 0, MAIN, -0.32, NOSE);
  rings(a, MAIN, PED, -0.45, -0.24);
  const nA = wrap(0, MAIN * R, hA), nB = wrap(MAIN * R, PED * R, hB);
  let x0 = 9, x1 = -9;
  for (let i = 0; i < nA; i++) { const v = px[hA[i]]; if (v < x0) x0 = v; if (v > x1) x1 = v; }
  HB.x0 = x0; HB.x1 = x1;
  ctx.beginPath();
  trace(ctx, hA, nA);
  trace(ctx, hB, nB);
}