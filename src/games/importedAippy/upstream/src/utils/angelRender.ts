import type { AngelPose } from '@/utils/angelModel';
import { angelGrads, type AngelPalette } from '@/utils/angelPalette';
import { drawBody } from '@/utils/angelBody';
import { ANAL, DORSAL, drawFin, drawTail } from '@/utils/angelFins';
import { drawPec, drawRay } from '@/utils/angelLimbs';
import { setAngelPitch } from '@/utils/angelProject';
import { drawEye, drawMouth } from '@/utils/angelFace';

/** Layered back → front: far ray/pectoral → tail, anal, dorsal → body → near pectoral/ray → eyes → mouth. */
export function drawAngelfish(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette) {
  const f = a.fade, al = f * f * (3 - 2 * f);
  if (al <= 0.01) return;
  setAngelPitch(a.pitch);
  angelGrads(ctx, pal);
  const c = Math.cos(a.yb), near = c >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(a.x - c * a.recoil * a.S, a.y + a.bob);
  ctx.rotate(a.rot);
  ctx.scale(a.S, a.S);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawRay(ctx, a, pal, -near, al);
  drawPec(ctx, a, pal, -near, al);
  drawTail(ctx, a, pal, al);
  const fin = (base: typeof ANAL) => a.finStyle === 'rounded'
    ? { ...base, tx: -0.18, ty: base.dir * 0.54, ex: -0.4, ey: base.dir * 0.38 }
    : a.finStyle === 'triangle'
      ? { ...base, tx: -0.22, ty: base.dir * 0.78, ex: -0.4, ey: base.dir * 0.38 }
      : base;
  drawFin(ctx, a, pal, fin(ANAL), al);
  drawFin(ctx, a, pal, fin(DORSAL), al);
  drawBody(ctx, a, pal, al);
  drawPec(ctx, a, pal, near, al);
  drawRay(ctx, a, pal, near, al);
  drawEye(ctx, a, pal, 1, al);
  drawEye(ctx, a, pal, -1, al);
  drawMouth(ctx, a, pal, al);
  ctx.restore();
  ctx.globalAlpha = 1;
  setAngelPitch();
}