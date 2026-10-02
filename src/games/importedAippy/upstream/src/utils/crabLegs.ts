import { P, toWorld, type Crab, type CrabPalette } from '@/utils/crabModel';
import { DAC_X, DAC_Y, HIP_X, HIP_Y, IK, LEG_W, LEN1, LEN2, solve2 } from '@/utils/crabRig';

const TAU = Math.PI * 2;

/** Filled tapered capsule between two points (uses current fillStyle). */
export function taper(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-3;
  const nx = -dy / L, ny = dx / L, a = w0 / 2, b = w1 / 2, an = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.moveTo(x0 + nx * a, y0 + ny * a);
  ctx.lineTo(x1 + nx * b, y1 + ny * b);
  ctx.arc(x1, y1, b, an, an - Math.PI, true);
  ctx.lineTo(x0 - nx * a, y0 - ny * a);
  ctx.arc(x0, y0, a, an - Math.PI, an - 2 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
}

/** Narrow shading strip inside a segment, offset toward its sand-facing edge for volume. */
function under(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-3;
  let nx = -dy / L, ny = dx / L;
  if (ny < 0) { nx = -nx; ny = -ny; }
  taper(ctx, x0 + nx * 0.24 * w0, y0 + ny * 0.24 * w0, x1 + nx * 0.24 * w1, y1 + ny * 0.24 * w1, w0 * 0.42, w1 * 0.42);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/**
 * Eight short, sturdy three-segment legs (merus → carpus → pointed dactyl), knees arched up and out.
 * Hips follow the body; feet come from world-planted footholds, so the shell is visibly carried.
 */
export function drawLegs(ctx: CanvasRenderingContext2D, c: Crab, pal: CrabPalette) {
  const S = c.S, ya = Math.abs(c.yaw);
  ctx.lineCap = 'round';
  for (let k = 3; k >= 0; k--) {
    const w = LEG_W[k] * S, back = k >= 2;
    for (let s = 0; s < 2; s++) {
      const f = c.feet[k * 2 + s];
      if (!f) continue;
      const sg = s ? 1 : -1, sq = sg * c.yaw > 0 ? 1 - 0.22 * ya : 1 + 0.08 * ya;
      toWorld(c, sg * HIP_X[k], HIP_Y[k]);
      const hx = P.x, hy = P.y, fx = f.x, fy = f.y - f.lift, tuck = f.lift / S;
      const ax = fx - sg * (DAC_X + tuck * 0.5) * S * sq, ay = fy - (DAC_Y - tuck * 0.25) * S;
      solve2(hx, hy, ax, ay, LEN1[k] * S * sq, LEN2[k] * S * sq, sg * 0.3, -1);
      const kx = IK.kx, ky = IK.ky, jx = IK.ex, jy = IK.ey;
      ctx.fillStyle = pal.outline;
      taper(ctx, hx, hy, kx, ky, w * 1.26, w * 1.14);
      taper(ctx, kx, ky, jx, jy, w * 1.08, w * 0.94);
      taper(ctx, jx, jy, fx, fy, w * 0.9, w * 0.3);
      ctx.fillStyle = back ? pal.legBack : pal.leg;
      taper(ctx, hx, hy, kx, ky, w, w * 0.9);
      taper(ctx, kx, ky, jx, jy, w * 0.84, w * 0.72);
      taper(ctx, jx, jy, fx, fy, w * 0.66, w * 0.14);
      ctx.fillStyle = pal.legDark;
      under(ctx, hx, hy, kx, ky, w, w * 0.9);
      under(ctx, kx, ky, jx, jy, w * 0.84, w * 0.72);
      ctx.fillStyle = pal.tip;
      taper(ctx, jx + (fx - jx) * 0.5, jy + (fy - jy) * 0.5, fx, fy, w * 0.4, w * 0.12);
      ctx.fillStyle = pal.joint;
      dot(ctx, kx, ky, w * 0.3);
      dot(ctx, jx, jy, w * 0.26);
      ctx.strokeStyle = pal.legLight;
      ctx.lineWidth = w * (back ? 0.14 : 0.2);
      ctx.beginPath();
      ctx.moveTo(hx + (kx - hx) * 0.22, hy + (ky - hy) * 0.22 - w * 0.2);
      ctx.lineTo(hx + (kx - hx) * 0.8, hy + (ky - hy) * 0.8 - w * 0.2);
      ctx.moveTo(kx + (jx - kx) * 0.22, ky + (jy - ky) * 0.22 - w * 0.16);
      ctx.lineTo(kx + (jx - kx) * 0.75, ky + (jy - ky) * 0.75 - w * 0.16);
      ctx.stroke();
    }
  }
}