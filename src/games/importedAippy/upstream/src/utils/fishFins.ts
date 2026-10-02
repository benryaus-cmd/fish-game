import { LAST, type Fish } from '@/utils/fishModel';

const sx = new Float32Array(32);
const sy = new Float32Array(32);

/**
 * Dorsal (side = -1) or lower fins (side = 1) standing in the spine's vertical plane.
 * `skew` > 1 sweeps the fin's peak toward the rear for a sharper, pointed silhouette.
 */
export function drawMedianFin(ctx: CanvasRenderingContext2D, f: Fish, t0: number, t1: number, side: number, height: number, skew = 0.65) {
  const HH = f.tr.hh;
  const i0 = Math.round(t0 * LAST), i1 = Math.round(t1 * LAST);
  const n = i1 - i0 + 1;
  if (n < 3) return;
  const lean = Math.max(-0.035, Math.min(0.035, f.yawVel * 0.02));
  const sharp = skew > 1 ? 1.3 : 0.8;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    const by = f.py[i] + side * HH[i] * 0.7;
    if (k === 0) ctx.moveTo(f.px[i], by);
    else ctx.lineTo(f.px[i], by);
  }
  for (let k = 0; k < n; k++) {
    const i = i0 + k, u = k / (n - 1);
    const shape = Math.pow(Math.sin(Math.PI * Math.pow(u, skew)), sharp);
    const hgt = height * shape * (1 + 0.08 * Math.sin(f.finPhase * 0.8 - u * 5));
    const sweep = skew > 1 ? 0.05 * u * u : 0;
    sx[k] = f.px[i] - Math.cos(f.ya[i]) * (0.05 * u + sweep + lean * u);
    sy[k] = f.py[i] + side * (HH[i] * 0.7 + hgt);
  }
  ctx.lineTo(sx[n - 1], sy[n - 1]);
  for (let k = n - 1; k > 0; k--) {
    ctx.quadraticCurveTo(sx[k], sy[k], (sx[k] + sx[k - 1]) * 0.5, (sy[k] + sy[k - 1]) * 0.5);
  }
  ctx.lineTo(sx[0], sy[0]);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let k = 1; k < n - 1; k += 2) {
    const i = i0 + k;
    ctx.moveTo(f.px[i], f.py[i] + side * HH[i] * 0.7);
    ctx.lineTo(sx[k] * 0.9 + sx[k + 1] * 0.1, sy[k]);
  }
  ctx.stroke();
}

/** Forked tail fin in the tail's vertical plane; foreshortens as the tail sways/turns. */
export function drawTail(ctx: CanvasRenderingContext2D, f: Fish) {
  const i = LAST;
  const Px = f.px[i], Py = f.py[i];
  let bx = Px - f.px[i - 1], by = Py - f.py[i - 1];
  const bz = f.pz[i] - f.pz[i - 1];
  const bl = Math.hypot(bx, by, bz) || 1;
  bx /= bl; by /= bl;
  const aT = f.ya[i] + f.amp * 0.55 * Math.sin(f.phase - 3.3);
  const tdx = -Math.cos(aT) * Math.cos(f.pitch), tdy = Math.sin(f.pitch);
  const flex = 0.03 * Math.sin(f.phase - 3.6) * (0.5 + f.amp);
  const { TL, TH, notch, lower } = f.tr.tail;
  const hr = f.tr.hh[LAST] * 1.15;
  const X = (u: number) => { const d = u / TL; return Px + (bx + (tdx - bx) * d) * u; };
  const Y = (u: number, v: number) => { const d = u / TL; return Py + (by + (tdy - by) * d) * u + v + flex * d * d; };
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0, -hr));
  ctx.quadraticCurveTo(X(TL * 0.45), Y(TL * 0.45, -TH * 0.55), X(TL), Y(TL, -TH));
  ctx.quadraticCurveTo(X(TL * 0.8), Y(TL * 0.8, -TH * 0.3), X(TL * notch), Y(TL * notch, 0));
  ctx.quadraticCurveTo(X(TL * 0.8), Y(TL * 0.8, TH * 0.3), X(TL * lower), Y(TL * lower, TH * 0.95));
  ctx.quadraticCurveTo(X(TL * 0.45), Y(TL * 0.45, TH * 0.55), X(0), Y(0, hr));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let r = -2; r <= 2; r++) {
    const v = (r / 2) * TH * 0.8;
    const u = TL * (notch + (0.96 - notch) * Math.abs(r / 2)) * 0.92;
    ctx.moveTo(X(0.02), Y(0.02, v * 0.1));
    ctx.lineTo(X(u), Y(u, v));
  }
  ctx.stroke();
}

/** Side (pectoral) fin on one flank; side = +1 is the flank facing the viewer when heading right. */
export function drawPectoral(ctx: CanvasRenderingContext2D, f: Fish, side: number) {
  const i = 6, a = f.ya[i];
  const Lx = -side * Math.sin(a);
  const rx = f.px[i] + Lx * f.tr.ww[i] * 0.85, ry = f.py[i] + f.tr.hh[i] * 0.3;
  const q = 0.5 + f.finBoost + 0.28 * Math.sin(f.finPhase + (side > 0 ? 0 : 1.1));
  const cq = Math.cos(q), sq = Math.sin(q);
  const len = f.tr.pectLen;
  const tipX = rx + (-Math.cos(a) * cq + Lx * sq) * len;
  const tipY = ry + 0.06 + 0.018 * Math.sin(f.finPhase + 0.6);
  const vx = tipX - rx, vy = tipY - ry;
  const vl = Math.hypot(vx, vy) || 1e-3;
  const nx = -vy / vl, ny = vx / vl;
  const wd = f.tr.pectWidth + 0.03 * sq;
  const mx = rx + vx * 0.5, my = ry + vy * 0.5;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.quadraticCurveTo(mx + nx * wd, my + ny * wd, tipX, tipY);
  ctx.quadraticCurveTo(mx - nx * wd * 0.35, my - ny * wd * 0.35, rx, ry);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.quadraticCurveTo(mx + nx * wd * 0.4, my + ny * wd * 0.4, tipX, tipY);
  ctx.stroke();
}