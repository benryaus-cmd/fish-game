import type { SeaPose } from '@/utils/seahorseModel';
import { seaGrads, type SeaPalette } from '@/utils/seahorsePalette';
import { BD, buildGeo, CR, HD, type SNode } from '@/utils/seahorseGeom';
import { traceTube } from '@/utils/seahorsePath';
import { drawBodySkin, drawCrownSkin, drawHeadSkin, drawKnobs } from '@/utils/seahorseSkin';
import { buildDorsal, drawDorsal, drawPecs } from '@/utils/seahorseFins';
import { drawEyes, drawMouth } from '@/utils/seahorseFace';

type Skin = (ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) => void;

/** Soft rim → gradient fill → clipped volumetric shading for one tube part. */
function part(ctx: CanvasRenderingContext2D, N: SNode[], pal: SeaPalette, al: number, skin: Skin) {
  ctx.beginPath(); traceTube(ctx, N, 0, N.length - 1);
  ctx.globalAlpha = al; ctx.strokeStyle = pal.outline; ctx.lineWidth = 0.016; ctx.stroke();
  ctx.fillStyle = pal.grad; ctx.fill();
  ctx.save(); ctx.clip(); skin(ctx, pal, al); ctx.restore();
}

/** Layered draw: far fin → dorsal → trunk/tail → ridge knobs → coronet → head → near fin → eyes → mouth. */
export function drawSeahorse(ctx: CanvasRenderingContext2D, s: SeaPose, pal: SeaPalette) {
  seaGrads(ctx, pal);
  buildGeo(s);
  buildDorsal(s);
  const f = s.fade, al = f * f * (3 - 2 * f);
  ctx.save();
  ctx.translate(s.x, s.y + s.bob);
  ctx.rotate(s.rot);
  ctx.scale(s.H, s.H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawPecs(ctx, s, pal, al, false);
  drawDorsal(ctx, pal, al);
  part(ctx, BD, pal, al, drawBodySkin);
  drawKnobs(ctx, pal, al);
  part(ctx, CR, pal, al, drawCrownSkin);
  part(ctx, HD, pal, al, drawHeadSkin);
  drawPecs(ctx, s, pal, al, true);
  drawEyes(ctx, s, pal, al);
  drawMouth(ctx, s, pal, al);
  ctx.restore();
}