import type { AngelPose } from '@/utils/angelModel';
import type { AngelPalette } from '@/utils/angelPalette';
import { halfT, midY, NOSE, P, proj, yawAt } from '@/utils/angelProject';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const sm = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

/**
 * Eye on flank s rides the rotating head: it glides toward the centre, foreshortens, and fades in /
 * out with how much it faces the viewer — both eyes are softly readable at the near-front view.
 */
export function drawEye(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, s: number, al: number) {
  const x = 0.33, q = yawAt(a, x), facing = s * Math.cos(q) * 0.94 + Math.sin(q) * 0.34;
  const k = sm((facing + 0.02) / 0.3);
  if (k < 0.01) return;
  const fr = 0.42 + 0.58 * clamp(facing, 0, 1), r = 0.037;
  proj(x, midY(x) - 0.085, s * halfT(x, q) * 0.84, q);
  const ex = P.x, ey = P.y, look = Math.cos(q) * 0.007;
  ctx.globalAlpha = al * k;
  ctx.fillStyle = pal.socket; ctx.beginPath(); ctx.ellipse(ex, ey, r * 1.32 * fr, r * 1.26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.iris; ctx.beginPath(); ctx.ellipse(ex, ey, r * fr, r, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.irisRing; ctx.lineWidth = 0.007; ctx.stroke();
  ctx.fillStyle = pal.pupil; ctx.beginPath(); ctx.ellipse(ex + look, ey + 0.002, r * 0.55 * fr, r * 0.57, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.glint; ctx.beginPath(); ctx.arc(ex - r * 0.3 * fr, ey - r * 0.35, r * 0.2, 0, TAU); ctx.fill();
}

/** Small mouth at the snout tip: profile shows the gape line, front view a centred soft pucker. */
export function drawMouth(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, al: number) {
  const q = a.yh, c = Math.cos(q), s = Math.abs(Math.sin(q)), g = a.gape, y = midY(NOSE) + 0.008;
  proj(NOSE + 0.004, y, 0, q);
  const mx = P.x, my = P.y;
  ctx.globalAlpha = al; ctx.fillStyle = pal.lip;
  ctx.beginPath(); ctx.ellipse(mx, my, 0.012 + 0.012 * s + g * 0.006, 0.01 + g * 0.015, 0, 0, TAU); ctx.fill();
  if (g > 0.04) {
    ctx.fillStyle = pal.mouthIn;
    ctx.beginPath(); ctx.ellipse(mx + c * 0.003, my, 0.003 + (0.006 + 0.009 * s) * g, 0.002 + 0.011 * g, 0, 0, TAU); ctx.fill();
  }
  proj(NOSE - 0.055, y + 0.012, 0, q);
  ctx.globalAlpha = al * 0.55 * Math.abs(c); ctx.strokeStyle = pal.mouthIn; ctx.lineWidth = 0.006;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(P.x, P.y); ctx.stroke();
}