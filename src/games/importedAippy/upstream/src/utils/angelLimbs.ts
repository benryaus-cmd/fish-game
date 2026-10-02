import type { AngelPose } from '@/utils/angelModel';
import type { AngelPalette } from '@/utils/angelPalette';
import { halfH, halfT, midY, P, proj, yawAt } from '@/utils/angelProject';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const sm = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

/** Small balancing side fin on flank s; near side clear, far side faint, both soft at near-front. */
export function drawPec(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, s: number, al: number) {
  const x = 0.17, q = yawAt(a, x), y = midY(x) + 0.07, z = s * halfT(x, q) * 0.95;
  const f = 0.5 + 0.5 * Math.sin(a.finPh * 2.1 + s * 1.3), facing = s * Math.cos(q);
  ctx.globalAlpha = al * (0.3 + 0.55 * sm((facing + 0.3) / 0.8));
  ctx.fillStyle = pal.pec; ctx.strokeStyle = pal.ray; ctx.lineWidth = 0.005;
  ctx.beginPath();
  proj(x, y, z, q); ctx.moveTo(P.x, P.y);
  proj(x - 0.06, y - 0.045, z + s * 0.02, q); let cx = P.x, cy = P.y;
  proj(x - 0.15, y - 0.02, z + s * (0.02 + 0.05 * f), q); ctx.quadraticCurveTo(cx, cy, P.x, P.y);
  proj(x - 0.16, y + 0.03, z + s * (0.02 + 0.045 * f), q); cx = P.x; cy = P.y;
  proj(x - 0.12, y + 0.055, z + s * (0.015 + 0.04 * f), q); ctx.quadraticCurveTo(cx, cy, P.x, P.y);
  proj(x - 0.04, y + 0.04, z, q); cx = P.x; cy = P.y;
  proj(x, y, z, q); ctx.quadraticCurveTo(cx, cy, P.x, P.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

const RN = 9, SEG = 0.085;

/**
 * Long trailing ventral ray on flank s. Each segment angle lags speed/vertical motion more toward
 * the tip and the tip yaw trails the torso, so rays bend and recover instead of swinging rigidly.
 * The angle is clamped so the filament always hangs below / behind the belly.
 */
export function drawRay(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, s: number, al: number) {
  const bx = 0.14, q0 = yawAt(a, bx), facing = s * Math.cos(a.yb);
  const lag = clamp(a.drag * 0.8 + a.lift * 0.6, -0.25, 0.55), vis = 0.55 + 0.35 * sm((facing + 0.3) / 0.8);
  let x = bx, y = midY(bx) + halfH(bx) * 0.9;
  proj(x, y, s * 0.03, q0);
  let lx = P.x, ly = P.y;
  for (let i = 1; i <= RN; i++) {
    const k = i / RN, kp = Math.pow(k, 1.5);
    const th = clamp(1.86 + s * 0.07 + k * 0.22 + lag * kp + Math.sin(a.finPh * 0.75 - k * 3 + s) * 0.07 * k, 1.45, 2.4);
    x += Math.cos(th) * SEG; y += Math.sin(th) * SEG;
    const z = s * (0.03 + 0.05 * k) + a.bend * 0.25 * kp + 0.02 * Math.sin(a.finPh * 0.9 - k * 2.5) * k;
    proj(x, y, z, q0 + (a.yf - a.yb) * Math.pow(k, 1.3));
    ctx.globalAlpha = al * vis * (i === RN ? 0.6 : 1);
    ctx.strokeStyle = k < 0.3 ? pal.pelvicBase : pal.pelvic;
    ctx.lineWidth = 0.013 * (1 - k * 0.7);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(P.x, P.y); ctx.stroke();
    lx = P.x; ly = P.y;
  }
}