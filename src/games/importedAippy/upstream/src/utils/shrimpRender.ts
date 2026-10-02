import type { ShrimpPalette, ShrimpPose } from '@/utils/shrimpModel';
import { CARA_R, PHI, PX, PY, Q, SEG_R, SX, SY, YW, buildRig, proj } from '@/utils/shrimpRig';
import { drawAntennae, drawEye, drawLegs, drawSwimmerets } from '@/utils/shrimpLimbs';

const TAU = Math.PI * 2;
const cache = new WeakMap<CanvasRenderingContext2D, { key: string; g: CanvasGradient }>();

/** One unit-space shell gradient per context (light from above, pale underside), reused every frame. */
function bodyGrad(ctx: CanvasRenderingContext2D, pal: ShrimpPalette) {
  const c = cache.get(ctx);
  if (c && c.key === pal.key) return c.g;
  const g = ctx.createLinearGradient(0, -1, 0, 1);
  g.addColorStop(0, pal.shellHi); g.addColorStop(0.32, pal.shell); g.addColorStop(0.62, pal.shellMid);
  g.addColorStop(0.84, pal.belly); g.addColorStop(1, pal.shade);
  cache.set(ctx, { key: pal.key, g });
  return g;
}

/** Rotated ellipse filled with the screen-vertical shell gradient (stretched to its vertical extent). */
function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a: number, g: CanvasGradient, rim: string, lw: number) {
  const sa = Math.sin(a), ca = Math.cos(a);
  const e = Math.max(0.001, Math.sqrt(rx * rx * sa * sa + ry * ry * ca * ca));
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(e, e);
  ctx.beginPath(); ctx.ellipse(0, 0, rx / e, ry / e, a, 0, TAU);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = lw / e; ctx.strokeStyle = rim; ctx.stroke();
  ctx.restore();
}

function seg(ctx: CanvasRenderingContext2D, i: number, j: number, r: number, g: CanvasGradient, pal: ShrimpPalette, S: number, k: number, min: number) {
  const dx = SX[j] - SX[i], dy = SY[j] - SY[i], l = Math.hypot(dx, dy);
  blob(ctx, (SX[i] + SX[j]) / 2, (SY[i] + SY[j]) / 2, Math.max(l * k + r * 0.3, r * min), r, l > 0.001 ? Math.atan2(dy, dx) : 0, g, pal.rim, S * 0.006);
}

function leaf(ctx: CanvasRenderingContext2D, bx: number, by: number, tx: number, ty: number, hw: number) {
  const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * hw * 1.5, ny = (dx / l) * hw * 1.5;
  const mx = bx + dx * 0.55, my = by + dy * 0.55;
  ctx.beginPath(); ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  ctx.quadraticCurveTo(mx - nx, my - ny, bx, by);
  ctx.fill(); ctx.stroke();
}

/** Telson + two uropods; they spread while swimming and snap shut during a tail flick. */
function drawFan(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette, near: number) {
  const yaw = YW[7], phi = PHI[7], bx = PX[7], by = PY[7], S = p.S, spread = 0.16 + 0.32 * p.fan;
  ctx.fillStyle = pal.fan; ctx.strokeStyle = pal.fanEdge; ctx.lineWidth = S * 0.006;
  for (let k = 0; k < 3; k++) {
    const s = k === 0 ? -near : k === 1 ? 0 : near, a = phi + s * spread, len = s === 0 ? 0.11 : 0.125;
    proj(bx, by, s * 0.02, yaw);
    const x0 = Q.x, y0 = Q.y;
    proj(bx + Math.cos(a) * len, by + Math.sin(a) * len, s * (0.03 + 0.05 * p.fan), yaw);
    leaf(ctx, x0, y0, Q.x, Q.y, S * (s === 0 ? 0.026 : 0.036));
  }
}

function path(ctx: CanvasRenderingContext2D, lift: number, S: number, i0: number, i1: number) {
  ctx.beginPath();
  for (let i = i0; i <= i1; i++) {
    const r = (i < 2 ? CARA_R : SEG_R[Math.min(5, i - 2)]) * S * lift;
    if (i === i0) ctx.moveTo(SX[i], SY[i] - r); else ctx.lineTo(SX[i], SY[i] - r);
  }
  ctx.stroke();
}

/** Layered, depth-ordered shrimp: far limbs → tail fan → abdomen (tail first) → carapace → near limbs. */
export function drawShrimp(ctx: CanvasRenderingContext2D, p: ShrimpPose, pal: ShrimpPalette) {
  buildRig(p);
  const S = p.S, near = Math.cos(YW[0]) >= 0 ? 1 : -1, g = bodyGrad(ctx, pal), f = p.fade, a0 = f * f * (3 - 2 * f);
  ctx.globalAlpha = a0;
  const lift = Math.max(0, p.gy - 0.19);
  if (lift < 1.2) {
    ctx.fillStyle = `rgba(20,40,40,${(0.13 * (1 - lift / 1.2)).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(SX[2], p.y + p.gy * S, S * 0.42, S * 0.05, 0, 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawAntennae(ctx, p, pal, -near, false);
  drawLegs(ctx, p, pal, -near, false);
  drawSwimmerets(ctx, p, pal, -near, false);
  drawEye(ctx, p, pal, -near);
  drawFan(ctx, p, pal, near);
  for (let k = 5; k >= 0; k--) seg(ctx, k + 1, k + 2, SEG_R[k] * S, g, pal, S, 0.62, 0.9);
  seg(ctx, 0, 1, CARA_R * S, g, pal, S, 0.5, 0.95);
  // Rostrum: slender, slightly upturned
  const hy = YW[0];
  ctx.beginPath();
  proj(0.05, -0.078, 0, hy); ctx.moveTo(Q.x, Q.y);
  proj(0.2, -0.1, 0, hy); const cx = Q.x, cy = Q.y;
  proj(0.32, -0.082, 0, hy); ctx.quadraticCurveTo(cx, cy, Q.x, Q.y);
  proj(0.22, -0.048, 0, hy); const dx = Q.x, dy = Q.y;
  proj(0.15, -0.03, 0, hy); ctx.quadraticCurveTo(dx, dy, Q.x, Q.y);
  ctx.closePath();
  ctx.fillStyle = pal.shell; ctx.fill();
  ctx.strokeStyle = pal.rim; ctx.lineWidth = S * 0.006; ctx.stroke();
  // Shell details: groove, translucent gut line, soft dorsal highlight, carapace gloss
  ctx.strokeStyle = pal.seg; ctx.lineWidth = S * 0.008;
  ctx.beginPath();
  proj(0.02, -0.082, 0, hy); ctx.moveTo(Q.x, Q.y);
  proj(0.065, -0.02, 0, hy); const gx = Q.x, gy = Q.y;
  proj(0.035, 0.05, 0, hy); ctx.quadraticCurveTo(gx, gy, Q.x, Q.y);
  ctx.stroke();
  const side = Math.abs(Math.cos(YW[3]));
  ctx.globalAlpha = a0 * (0.35 + 0.65 * side);
  ctx.strokeStyle = pal.gut; ctx.lineWidth = S * 0.014; path(ctx, 0.08, S, 1, 7);
  ctx.strokeStyle = pal.shellHi; ctx.lineWidth = S * 0.02; path(ctx, 0.58, S, 0, 6);
  ctx.globalAlpha = a0;
  ctx.fillStyle = pal.spot;
  ctx.beginPath();
  ctx.ellipse((SX[0] + SX[1]) / 2 + (SX[0] - SX[1]) * 0.15, (SY[0] + SY[1]) / 2 - CARA_R * S * 0.5, CARA_R * S * 0.5, CARA_R * S * 0.16, Math.atan2(SY[0] - SY[1], SX[0] - SX[1] || 0.001) * 0.4, 0, TAU);
  ctx.fill();
  drawSwimmerets(ctx, p, pal, near, true);
  drawLegs(ctx, p, pal, near, true);
  drawEye(ctx, p, pal, near);
  drawAntennae(ctx, p, pal, near, true);
  ctx.globalAlpha = 1;
}