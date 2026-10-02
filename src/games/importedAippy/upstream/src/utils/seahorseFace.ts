import type { SeaPose } from '@/utils/seahorseModel';
import type { SeaPalette } from '@/utils/seahorsePalette';
import { HD, HF, HP, headProj } from '@/utils/seahorseGeom';
import { sstep } from '@/utils/seahorsePath';

const TAU = Math.PI * 2, R = 0.021;

/** Two real eyes on either side of the head: each slides and foreshortens with the head yaw, fading at the rim. */
export function drawEyes(ctx: CanvasRenderingContext2D, s: SeaPose, pal: SeaPalette, al: number) {
  for (let q = 0; q < 2; q++) {
    const sg = q === 0 ? 1 : -1, nd = sg * HF.c * 0.92 + 0.38 * HF.s, v = sstep(0.02, 0.3, nd);
    if (v <= 0.01) continue;
    headProj(0.074, -0.074, sg * 0.036);
    const x = HP.x, y = HP.y, sq = 0.3 + 0.7 * Math.min(1, nd), op = 1 - 0.85 * s.blink;
    ctx.globalAlpha = al * v;
    ctx.fillStyle = pal.orbit; ctx.beginPath(); ctx.ellipse(x, y, R * 1.5 * sq, R * 1.38, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.iris; ctx.beginPath(); ctx.ellipse(x, y, R * sq, R * op, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.irisRing; ctx.lineWidth = 0.0035; ctx.stroke();
    if (op > 0.3) {
      const px = x + HF.c * R * 0.22 * sq + s.look * R * 0.1;
      ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.ellipse(px, y + R * 0.05, R * 0.5 * sq, R * 0.55 * op, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x - R * 0.32 * sq, y - R * 0.36 * op, R * 0.24, 0, TAU); ctx.fill();
    }
    if (s.blink > 0.05) {
      ctx.strokeStyle = pal.lid; ctx.lineWidth = 0.005;
      ctx.beginPath(); ctx.ellipse(x, y, R * sq, Math.max(0.001, R * op), 0, Math.PI, TAU); ctx.stroke();
    }
  }
}

/** Tiny mouth at the snout tip: a slit in profile, a small "o" when the snout points at the viewer; suction ripple. */
export function drawMouth(ctx: CanvasRenderingContext2D, s: SeaPose, pal: SeaPalette, al: number) {
  const o = HD[HD.length - 1], k = o.a * o.fs * 0.78, sk = Math.max(0, s.suck);
  const x = o.cx + o.tx * k, y = o.cy + o.ty * k;
  const along = o.a * (0.12 + 0.45 * HF.s * HF.s) * (1 + 0.5 * sk), across = o.a * 0.5 * (1 + 0.35 * sk);
  ctx.globalAlpha = al; ctx.fillStyle = pal.mouth;
  ctx.beginPath(); ctx.ellipse(x, y, along, across, Math.atan2(o.ty, o.tx), 0, TAU); ctx.fill();
  if (sk > 0.05) {
    ctx.globalAlpha = al * 0.45 * sk;
    ctx.strokeStyle = pal.ripple; ctx.lineWidth = 0.004;
    ctx.beginPath(); ctx.arc(x + o.tx * o.a * 1.2, y + o.ty * o.a * 1.2, o.a * (1 + 1.6 * sk), 0, TAU); ctx.stroke();
  }
}