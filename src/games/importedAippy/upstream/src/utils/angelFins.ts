import type { AngelPose } from '@/utils/angelModel';
import type { AngelPalette } from '@/utils/angelPalette';
import { halfH, midY, P, proj, yawAt } from '@/utils/angelProject';

/** Sail fin surface F(u, v): u runs along the base (front → rear), v from base (0) out to the edge (1). */
interface Fin { b0: number; b1: number; dir: number; tx: number; ty: number; ex: number; ey: number; ph: number; bands: number[][] }
export const DORSAL: Fin = { b0: 0.17, b1: -0.3, dir: -1, tx: -0.42, ty: -1.0, ex: -0.44, ey: -0.42, ph: 0, bands: [[0.2, 0.36, 0.5], [0.78, 0.9, 0.35]] };
export const ANAL: Fin = { b0: 0.09, b1: -0.3, dir: 1, tx: -0.37, ty: 0.97, ex: -0.44, ey: 0.44, ph: 1.4, bands: [[0.05, 0.22, 0.5], [0.72, 0.86, 0.35]] };

/** Base leads, middle follows, tip lags last: drag, lift, flutter wave, turn bend and lagged yaw grow with v. */
function finPt(a: AngelPose, f: Fin, u: number, v: number) {
  const bx = f.b0 + (f.b1 - f.b0) * u, by = midY(bx) + f.dir * halfH(bx) * 0.94;
  const scale = a.finScale ?? 1;
  const w = 1 - u, cx = (f.tx + f.ex) * 0.5 + 0.06, cy = (f.ty + f.ey) * 0.4;
  const ox = w * w * f.tx + 2 * u * w * cx + u * u * f.ex, oy = w * w * f.ty + 2 * u * w * cy + u * u * f.ey;
  const vv = v * v, wave = Math.sin(a.finPh + f.ph - v * 2.4 - u * 1.7);
  const x = bx + (ox - bx) * v + 0.07 * Math.sin(Math.PI * v) * w * w - a.drag * vv * 0.1;
  const y = by + (oy - by) * v * scale - a.lift * vv * 0.1 + f.dir * 0.012 * wave * v;
  const z = 0.05 * wave * Math.pow(v, 1.4) + a.bend * Math.pow(v, 1.5) * 0.3;
  const q = yawAt(a, bx);
  proj(x, y, z, q + (a.yf - a.yb) * Math.pow(v, 1.3));
}

function finPath(ctx: CanvasRenderingContext2D, a: AngelPose, f: Fin) {
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) { finPt(a, f, 0, i / 10); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
  for (let i = 1; i <= 10; i++) { finPt(a, f, i / 10, 1); ctx.lineTo(P.x, P.y); }
  for (let i = 9; i >= 0; i--) { finPt(a, f, 1, i / 10); ctx.lineTo(P.x, P.y); }
  for (let i = 7; i >= 1; i--) { finPt(a, f, i / 8, 0); ctx.lineTo(P.x, P.y); }
  ctx.closePath();
}

export function drawFin(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, f: Fin, al: number) {
  finPath(ctx, a, f);
  ctx.globalAlpha = al * 0.92; ctx.fillStyle = f.dir < 0 ? pal.finUp : pal.finDn; ctx.fill();
  ctx.globalAlpha = al * 0.6; ctx.strokeStyle = pal.finEdge; ctx.lineWidth = 0.006; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = pal.stripe;
  for (const b of !pal.pattern || pal.pattern === 'banded' ? f.bands : []) {
    ctx.globalAlpha = al * b[2];
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { finPt(a, f, b[0], i / 6); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
    for (let i = 6; i >= 0; i--) { finPt(a, f, b[1], i / 6); ctx.lineTo(P.x, P.y); }
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = al * 0.5; ctx.strokeStyle = pal.ray; ctx.lineWidth = 0.0045;
  for (let r = 0; r < 5; r++) {
    const u = 0.1 + r * 0.18;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) { finPt(a, f, u, 0.08 + i * 0.22); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
    ctx.stroke();
  }
  ctx.restore();
}

/** Fan tail: beats laterally about the tail base and inherits the most delayed yaw of the body. */
function tailPt(a: AngelPose, u: number, v: number) {
  const m = midY(-0.42), by = m + u * 0.07;
  const ex = -0.42 - (0.27 + 0.11 * u * u) * (a.tailLength ?? 1), ey = m + u * 0.31 * (a.tailWidth ?? 1);
  const wave = Math.sin(a.finPh * 1.3 - v * 2 + u * 0.8);
  let x = -0.42 + (ex + 0.42) * v - a.drag * v * v * 0.04;
  const y = by + (ey - by) * v - a.lift * v * v * 0.05 + 0.01 * wave * v;
  const ang = a.tailAmp * Math.sin(a.tailPh - v * 1.5) * (0.35 + 0.65 * v), dx = x + 0.4;
  x = -0.4 + dx * Math.cos(ang);
  proj(x, y, -dx * Math.sin(ang) + 0.012 * wave * v, a.yp + 1.6 * a.sway + (a.yt - a.yp) * v);
}

export function drawTail(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, al: number) {
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) { tailPt(a, -1, i / 6); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
  for (let i = 1; i <= 10; i++) { tailPt(a, -1 + i / 5, 1); ctx.lineTo(P.x, P.y); }
  for (let i = 5; i >= 0; i--) { tailPt(a, 1, i / 6); ctx.lineTo(P.x, P.y); }
  ctx.closePath();
  ctx.globalAlpha = al * 0.9; ctx.fillStyle = pal.tailG; ctx.fill();
  ctx.globalAlpha = al * 0.55; ctx.strokeStyle = pal.finEdge; ctx.lineWidth = 0.006; ctx.stroke();
  ctx.globalAlpha = al * 0.45; ctx.strokeStyle = pal.ray; ctx.lineWidth = 0.004;
  for (let r = 0; r < 5; r++) {
    const u = -0.8 + r * 0.4;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) { tailPt(a, u, 0.1 + i * 0.21); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
    ctx.stroke();
  }
}