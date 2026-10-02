import type { ShrimpPalette, ShrimpPose } from '@/utils/shrimpModel';
import { yawAt } from '@/utils/shrimpTurn';
import { MOUTH_X, MOUTH_Y, PHI, PX, PY, Q, SEG_R, YW, proj } from '@/utils/shrimpRig';

const TAU = Math.PI * 2;
const LEG_X = [0.115, 0.075, 0.03, -0.015, -0.06];
const FEMUR = [0, 0, 1.1, 1.5, 1.9];
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

let lx = 0, ly = 0;
function from(x: number, y: number, w: number, yaw: number) { proj(x, y, w, yaw); lx = Q.x; ly = Q.y; }
function to(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, yaw: number, lw: number) {
  proj(x, y, w, yaw);
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(Q.x, Q.y); ctx.stroke();
  lx = Q.x; ly = Q.y;
}

/** Two front feeding legs + three walking legs per side; stepping phases are staggered and never in sync. */
export function drawLegs(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette, side: number, near: boolean) {
  const S = p.S, yaw = yawAt(p, 0.06), w = side * 0.045, free = p.swim * (1 - p.ground);
  ctx.strokeStyle = near ? pal.leg : pal.legFar;
  for (let k = 4; k >= 0; k--) {
    const bx = LEG_X[k], by = 0.055 + k * 0.003;
    if (k < 2) {
      const r = 0.5 + 0.5 * Math.sin(p.feedPh + k * Math.PI + (side > 0 ? 0 : 1.7));
      const fx = lerp(MOUTH_X + 0.01, 0.27, r), fy = lerp(MOUTH_Y + 0.01, 0.12 + 0.015 * k, r);
      const ix = bx + 0.075 + Math.sin(p.clock * 1.3 + k * 2 + side) * 0.008, iy = by + 0.07 - k * 0.01;
      const tx = lerp(ix, fx, p.feed), ty = lerp(iy, fy, p.feed);
      from(bx, by, w, yaw);
      to(ctx, (bx + tx) / 2 - 0.012, Math.max(by, ty) + 0.03, w * 1.15, yaw, S * 0.011);
      to(ctx, tx, ty, w * 1.2, yaw, S * 0.008);
      continue;
    }
    const ph = p.step * TAU + k * 2.1 + (side > 0 ? 0 : Math.PI);
    const a1 = FEMUR[k] + Math.sin(p.clock * 5.5 + k * 1.3 + side) * 0.14 * free;
    const kx = bx + Math.cos(a1) * 0.07, ky = by + Math.sin(a1) * 0.07;
    const a2 = Math.PI / 2 + (1.5 - a1) * 0.6 + 0.3 * free;
    const fx = kx + Math.cos(a2) * 0.08 + Math.sin(ph) * 0.028 * p.stride;
    let fy = ky + Math.sin(a2) * 0.08;
    if (p.ground > 0.01) fy = lerp(fy, clamp(p.gy, ky + 0.03, ky + 0.12), p.ground);
    fy -= Math.max(0, Math.cos(ph)) * 0.02 * p.stride;
    from(bx, by, w, yaw);
    to(ctx, kx, ky, w * 1.2, yaw, S * 0.014);
    to(ctx, fx, fy, w * 1.3, yaw, S * 0.009);
  }
}

/** Tiny paddles under the abdomen; beat faster while suspended in water. */
export function drawSwimmerets(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette, side: number, near: boolean) {
  ctx.strokeStyle = near ? pal.leg : pal.legFar;
  const w = side * 0.028;
  for (let k = 0; k < 5; k++) {
    const i = k + 1, j = k + 2, phi = PHI[j];
    const nx = Math.sin(phi), ny = -Math.cos(phi), fx = -Math.cos(phi), fy = -Math.sin(phi), r = SEG_R[k] * 0.78;
    const mx = (PX[i] + PX[j]) / 2 + nx * r, my = (PY[i] + PY[j]) / 2 + ny * r;
    const a = 0.55 + Math.sin(p.clock * (9 + 7 * p.swim) + k * 0.9 + side * 0.6) * (0.12 + 0.3 * p.swim);
    const len = 0.05 - k * 0.004, ca = Math.cos(a), sa = Math.sin(a);
    from(mx, my, w, YW[j]);
    to(ctx, mx + (nx * ca + fx * sa) * len, my + (ny * ca + fy * sa) * len, w * 1.3, YW[j], p.S * 0.013);
  }
}

/** Long main antenna + short antennule; tips lag through turns and stream with movement. */
export function drawAntennae(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette, side: number, near: boolean) {
  const S = p.S, ph = side > 0 ? p.antA : p.antB;
  ctx.strokeStyle = near ? pal.ant : pal.antFar;
  let x = 0.15, y = -0.03, w = side * 0.02, a = -0.5 + 0.5 * p.antAim + Math.sin(ph * 0.6) * 0.08;
  from(x, y, w, YW[0]);
  for (let j = 0; j < 12; j++) {
    a += 0.055 - p.antTrail * 0.05 - p.antAim * 0.04 + Math.sin(ph - j * 0.5) * 0.022 * (0.4 + j / 12);
    x += Math.cos(a) * 0.1; y += Math.sin(a) * 0.1; w += side * 0.025;
    to(ctx, x, y, w, yawAt(p, j * 0.045), Math.max(0.6, S * (0.011 - j * 0.0007)));
  }
  x = 0.165; y = -0.012; w = side * 0.012; a = -0.15 + Math.sin(ph * 1.7) * 0.06;
  from(x, y, w, YW[0]);
  for (let j = 0; j < 4; j++) {
    a += 0.06 + Math.sin(ph * 2.3 + j) * 0.04;
    x += Math.cos(a) * 0.045; y += Math.sin(a) * 0.045; w += side * 0.012;
    to(ctx, x, y, w, YW[0], Math.max(0.5, S * (0.009 - j * 0.0015)));
  }
}

/** Small dark eye on a short stalk. */
export function drawEye(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette, side: number) {
  const S = p.S, yaw = YW[0];
  proj(0.115, -0.035, side * 0.03, yaw);
  const bx = Q.x, by = Q.y;
  proj(0.14, -0.045, side * 0.062, yaw);
  ctx.strokeStyle = pal.shell; ctx.lineWidth = S * 0.026;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(Q.x, Q.y); ctx.stroke();
  const r = S * 0.027;
  ctx.fillStyle = pal.eye;
  ctx.beginPath(); ctx.arc(Q.x, Q.y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.eyeHi;
  ctx.beginPath(); ctx.arc(Q.x - r * 0.3, Q.y - r * 0.35, r * 0.32, 0, TAU); ctx.fill();
}