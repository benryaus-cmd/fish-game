import {
  LAST, N, TAU, bodyGradient, computePose, fishBlit, fishEllipse, fishFrame, fishPoint, fishScale, fishSprites, type Fish, type FishPalette,
} from '@/utils/fishModel';
import { drawMedianFin, drawPectoral, drawTail, medianFinFacesCamera } from '@/utils/fishFins';
import { drawInheritedPattern } from '@/utils/specimenPattern';
import { drawColorfulShading } from '@/utils/colorfulRender';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Union of projected cross-section ellipses → silhouette that rotates believably in 3D. */
function bodyPath(ctx: CanvasRenderingContext2D, f: Fish) {
  const seg = 1 / LAST;
  const hh = f.tr.hh, ww = f.tr.ww;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const sm = Math.min(1.9 * seg, hh[i] * 1.6);
    fishEllipse(ctx, f, i, sm, hh[i], ww[i]);
  }
}

function drawShading(ctx: CanvasRenderingContext2D, f: Fish, p: FishPalette, near: number, lw: number, pattern?: string) {
  const HH = f.tr.hh, WW = f.tr.ww;
  const { light, shade } = fishSprites();
  // Soft species bands (fade out when seen head-on)
  ctx.fillStyle = p.mark;
  for (const t of pattern && pattern !== 'banded' ? [] : [0.34, 0.63]) {
    const i = Math.round(t * LAST), a = f.ya[i];
    const c = Math.abs(Math.cos(a));
    if (c < 0.12) continue;
    for (let k = 0; k < 2; k++) {
      ctx.globalAlpha = (k === 0 ? 0.09 : 0.12) * c * c;
      ctx.beginPath();
      fishEllipse(ctx, f, i, k === 0 ? 0.05 : 0.028, HH[i] * 1.05, WW[i] * 0.6);
      ctx.fill();
    }
  }
  const at = (i: number) => ({ a: f.ya[i], c: Math.abs(Math.cos(f.ya[i])), s: Math.abs(Math.sin(f.ya[i])) });
  let q = at(7);
  fishBlit(ctx, light, f, 7, -HH[7] * 0.52, near * WW[7] * 0.3, 0.42 * q.c + WW[7] * 1.2 * q.s, 0.075, 0.3);
  q = at(9);
  fishBlit(ctx, light, f, 9, HH[9] * 0.55, 0, 0.5 * q.c + WW[9] * 1.5 * q.s, 0.1, 0.2);
  q = at(10);
  fishBlit(ctx, shade, f, 10, HH[10] * 1.02, 0, 0.75 * q.c + WW[10] * 2.2 * q.s, 0.1, 0.22);
  q = at(17);
  fishBlit(ctx, shade, f, 17, 0, 0, 0.36 * q.c + WW[17] * 2 * q.s, HH[17] * 2.6, 0.2);
  // Head-on roundness: soft edge shade + face light
  const fr = Math.pow(Math.sin(Math.max(0, Math.min(Math.PI, f.ya[3]))), 3);
  if (fr > 0.02) {
    fishBlit(ctx, shade, f, 8, 0, WW[8] * 1.05, WW[8] * 1.1, HH[8] * 2.2, 0.28 * fr);
    fishBlit(ctx, shade, f, 8, 0, -WW[8] * 1.05, WW[8] * 1.1, HH[8] * 2.2, 0.28 * fr);
    fishBlit(ctx, light, f, 2, -HH[2] * 0.2, 0, WW[2] * 1.4, HH[2] * 1.2, 0.18 * fr);
  }
  // Gill cover arc
  const g = f.ya[5], gc = Math.cos(g);
  ctx.globalAlpha = 0.2 * Math.abs(gc);
  ctx.strokeStyle = p.mark;
  ctx.lineWidth = 1.1 * lw;
  ctx.beginPath();
  const g0 = fishPoint(f, 5, 0, -HH[5] * 0.6), g1 = fishPoint(f, 5, -0.045), g2 = fishPoint(f, 5, -0.012, HH[5] * 0.6);
  ctx.moveTo(g0.x, g0.y);
  ctx.quadraticCurveTo(g1.x, g1.y, g2.x, g2.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFace(ctx: CanvasRenderingContext2D, f: Fish, p: FishPalette, lw: number) {
  const hh = f.tr.hh, ww = f.tr.ww;
  const i = 3, a = f.ya[i], ca = Math.cos(a), sa = Math.sin(a);
  const r = f.tr.eyeR;
  for (const side of [1, -1]) {
    const zc = side * ca;
    const vis = smooth(-0.25, 0.3, zc);
    if (vis < 0.02) continue;
    const eye = fishPoint(f, i, 0, -hh[i] * 0.2, side * ww[i] * 0.78);
    const ex = eye.x, ey = eye.y;
    const sq = 0.3 + 0.7 * clamp01(zc + 0.1);
    // A flank eye is a disk in the forward/down plane, including during yaw lag.
    const facing = ca >= 0 ? 1 : -1;
    const b = fishFrame(f, i);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.transform(b.fx, b.fy, b.dx, b.dy, 0, 0);
    ctx.globalAlpha = vis;
    ctx.fillStyle = p.iris;
    ctx.beginPath(); ctx.ellipse(0, 0, r * sq, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = p.mark; ctx.lineWidth = 0.8 * lw;
    ctx.globalAlpha = vis * 0.45; ctx.stroke();
    ctx.globalAlpha = vis;
    ctx.fillStyle = '#1b2630';
    ctx.beginPath();
    ctx.ellipse(r * 0.16 * sq, 0, r * 0.64 * sq, r * 0.66, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc((0.05 - facing * 0.12) * r * sq, -r * 0.32, r * 0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // Small mouth
  const a0 = f.ya[0], c0 = Math.cos(a0), lx = -Math.sin(a0);
  const mo = f.mouth;
  if (mo > 0.02) {
    // Soft open mouth for the bite
    ctx.globalAlpha = 0.7 * Math.min(1, mo * 1.5);
    ctx.fillStyle = '#4a2616';
    ctx.beginPath();
    const opening = fishPoint(f, 0, -0.022, hh[1] * 0.35 - 0.004);
    ctx.save(); ctx.translate(opening.x, opening.y);
    const angle = Math.atan2(-Math.sin(f.pitch + f.tilt), c0 * Math.cos(f.pitch + f.tilt));
    ctx.rotate(angle);
    ctx.ellipse(0, 0, 0.012 + 0.012 * Math.abs(lx) + 0.004 * mo, 0.004 + 0.018 * mo, 0, 0, TAU);
    ctx.restore();
    ctx.fill();
  }
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = p.mark; ctx.lineWidth = 1 * lw;
  ctx.beginPath();
  const start = fishPoint(f, 0, -0.045, hh[1] * 0.35 + 0.004, 0.028);
  const mid = fishPoint(f, 0, 0.01, hh[1] * 0.35 + 0.012 + mo * 0.014);
  const end = fishPoint(f, 0, -0.045, hh[1] * 0.35 + 0.004, -0.028);
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawFish(ctx: CanvasRenderingContext2D, f: Fish, p: FishPalette, pattern?: string, quality = 1) {
  computePose(f);
  const S = fishScale(f);
  const lw = 1 / S;
  const near = Math.cos(f.ya[6]) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(S, S);
  ctx.fillStyle = p.fin; ctx.strokeStyle = p.ray; ctx.lineWidth = 0.8 * lw;
  drawTail(ctx, f);
  for (const fin of f.tr.fins) if (!medianFinFacesCamera(f, fin.t0, fin.t1, fin.side))
    drawMedianFin(ctx, f, fin.t0, fin.t1, fin.side, fin.h, fin.skew);
  ctx.globalAlpha = 0.6;
  drawPectoral(ctx, f, -near);
  ctx.globalAlpha = 1;
  bodyPath(ctx, f);
  ctx.fillStyle = bodyGradient(ctx, p, f);
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawInheritedPattern(ctx, f, p, pattern, quality);
  if (f.tr.id === 'colorful') drawColorfulShading(ctx, f, p, near, lw, pattern);
  else drawShading(ctx, f, p, near, lw, pattern);
  ctx.restore();
  drawFace(ctx, f, p, lw);
  ctx.fillStyle = p.fin; ctx.strokeStyle = p.ray; ctx.lineWidth = 0.8 * lw;
  for (const fin of f.tr.fins) if (medianFinFacesCamera(f, fin.t0, fin.t1, fin.side))
    drawMedianFin(ctx, f, fin.t0, fin.t1, fin.side, fin.h, fin.skew);
  ctx.globalAlpha = 0.85;
  drawPectoral(ctx, f, near);
  ctx.restore();
}

/** Faint soft shadow on the sand below the fish. */
export function drawFishShadow(ctx: CanvasRenderingContext2D, f: Fish, surfaceY: (x: number) => number) {
  const S = fishScale(f);
  const gy = surfaceY(f.x);
  const k = clamp01(1 - (gy - f.y) / (S * 6));
  if (k <= 0.02) return;
  const w = S * (0.5 + 0.6 * Math.abs(Math.cos(f.yawBody))) * (1.3 - 0.3 * k);
  const h = S * 0.12;
  ctx.globalAlpha = 0.16 * k;
  ctx.drawImage(fishSprites().ground, f.x - w / 2, gy + S * 0.04 - h / 2, w, h);
  ctx.globalAlpha = 1;
}
