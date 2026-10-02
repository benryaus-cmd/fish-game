import { P, toWorld, type Crab, type CrabPalette } from '@/utils/crabModel';
import { drawClaws } from '@/utils/crabClaws';
import { drawLegs, taper } from '@/utils/crabLegs';
import { SH_H, SH_W, SH_X, SH_Y, shellSprite } from '@/utils/crabShell';
import { MOUTH_Y } from '@/utils/crabRig';

const TAU = Math.PI * 2;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill();
}

/** Small mouthparts and short eye stalks with glossy, softly blinking eyes. */
function drawFace(ctx: CanvasRenderingContext2D, c: Crab, pal: CrabPalette) {
  const S = c.S;
  toWorld(c, 0, MOUTH_Y, 1);
  const mx = P.x, my = P.y, ch = c.chew * 0.01 * S;
  ctx.globalAlpha = 0.55; ctx.fillStyle = pal.mark;
  disc(ctx, mx, my, 0.05 * S, 0.02 * S, c.rot);
  ctx.globalAlpha = 1; ctx.fillStyle = pal.bellyDark;
  disc(ctx, mx - 0.019 * S, my + ch * 0.4, 0.017 * S, 0.02 * S, 0.25);
  disc(ctx, mx + 0.019 * S, my + ch * 0.4, 0.017 * S, 0.02 * S, -0.25);
  const blink = Math.pow(Math.max(0, Math.sin(c.clock * 0.35 + c.seed * 2.3)), 60);
  const open = 1 - 0.85 * blink;
  for (let s = 0; s < 2; s++) {
    const sg = s ? 1 : -1, e = s ? c.eyeR : c.eyeL;
    toWorld(c, sg * 0.07, -0.235, 1); const bx = P.x, by = P.y;
    toWorld(c, sg * 0.092 + e * 0.025, -0.322 - c.eyeLift * 0.035, 1); const tx = P.x, ty = P.y;
    ctx.fillStyle = pal.outline; taper(ctx, bx, by, tx, ty, 0.046 * S, 0.036 * S);
    ctx.fillStyle = pal.base; taper(ctx, bx, by, tx, ty, 0.033 * S, 0.025 * S);
    ctx.fillStyle = pal.outline; disc(ctx, tx, ty, 0.036 * S, 0.036 * S);
    ctx.fillStyle = pal.light; disc(ctx, tx, ty, 0.031 * S, 0.031 * S);
    ctx.fillStyle = pal.eye; disc(ctx, tx + e * 0.005 * S, ty - 0.003 * S, 0.026 * S, 0.027 * S * open);
    if (open > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      disc(ctx, tx - 0.009 * S + e * 0.005 * S, ty - 0.013 * S, 0.008 * S, 0.008 * S);
    }
  }
}

/** Shadow → legs → shell → face → claws (claws in front so a grabbed pellet reads clearly). */
export function drawCrab(ctx: CanvasRenderingContext2D, c: Crab, pal: CrabPalette) {
  const S = c.S, spr = shellSprite(pal, S);
  ctx.fillStyle = 'rgba(28,46,44,0.12)';
  disc(ctx, c.cx, c.footY - 0.012 * S, 0.78 * S, 0.07 * S);
  disc(ctx, c.cx, c.footY - 0.016 * S, 0.4 * S, 0.045 * S);
  drawLegs(ctx, c, pal);
  const breath = 1 + 0.005 * Math.sin(c.clock * 1.3 + c.seed);
  ctx.save();
  ctx.translate(c.cx, c.cy);
  ctx.rotate(c.rot);
  // matches the per-side foreshortening used for the limbs, so the shell never detaches from them
  ctx.translate(-0.025 * c.yaw * S, 0);
  ctx.scale(1 - 0.07 * Math.abs(c.yaw), breath);
  ctx.drawImage(spr, -SH_X * S, -SH_Y * S, SH_W * S, SH_H * S);
  ctx.restore();
  drawFace(ctx, c, pal);
  drawClaws(ctx, c, pal);
}