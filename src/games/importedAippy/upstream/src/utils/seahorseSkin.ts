import type { SeaPalette } from '@/utils/seahorsePalette';
import { BD, CR, HD, NB, NBD } from '@/utils/seahorseGeom';
import { absPt, HALF, lerpNode, litSign, Q, ringPath, rel, sstep, strokeAbs, strokeRel } from '@/utils/seahorsePath';

const TAU = Math.PI * 2;

function lightOverlay(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  ctx.globalAlpha = al; ctx.fillStyle = pal.lit; ctx.fillRect(-0.5, -0.6, 1, 1.2);
}

function rings(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number, dx: number, dy: number) {
  ctx.beginPath();
  for (let f = 1.3; f < NB - 0.6; f += 0.68) ringPath(ctx, lerpNode(BD, f), dx, dy);
  for (let f = NB - 0.4; f < NBD - 1.5; f += 0.9) ringPath(ctx, lerpNode(BD, f), dx, dy);
  ctx.globalAlpha = al; ctx.stroke();
}

/** Trunk + tail shading (clipped): dorsal shadow, ventral cream, rotating highlight/shadow bands, bony rings, key light. */
export function drawBodySkin(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  const m = BD[4], sg = litSign(m), last = NBD - 1;
  ctx.strokeStyle = pal.shade;
  ctx.globalAlpha = al * 0.85 * sstep(-0.7, 0.15, -m.dn); ctx.lineWidth = 0.075; strokeAbs(ctx, BD, 0, NB, -1, 0);
  ctx.globalAlpha = al * 0.6; ctx.lineWidth = 0.034; strokeAbs(ctx, BD, NB - 1, last, -1, 0);
  ctx.globalAlpha = al * 0.7; ctx.lineWidth = 0.08; strokeRel(ctx, BD, 0, NB, HALF - 0.95 * sg);
  ctx.lineWidth = 0.03; strokeRel(ctx, BD, NB - 1, last, HALF - 0.9 * sg);
  ctx.strokeStyle = pal.cream;
  ctx.globalAlpha = al * sstep(-0.5, 0.3, m.dn); ctx.lineWidth = 0.08; strokeAbs(ctx, BD, 1, NB - 1, 1, 0);
  ctx.globalAlpha = al * 0.7; ctx.lineWidth = 0.03; strokeAbs(ctx, BD, NB - 1, NB + 5, 1, 0);
  ctx.strokeStyle = pal.sheen; ctx.globalAlpha = al;
  ctx.lineWidth = 0.032; strokeRel(ctx, BD, 1, NB - 1, HALF + 0.6 * sg);
  ctx.lineWidth = 0.013; strokeRel(ctx, BD, NB - 1, last - 1, HALF + 0.6 * sg);
  ctx.strokeStyle = pal.ring; ctx.lineWidth = 0.009; rings(ctx, pal, al, 0, 0);
  ctx.strokeStyle = pal.ringHi; ctx.lineWidth = 0.005; rings(ctx, pal, al, -0.003, -0.007);
  lightOverlay(ctx, pal, al);
}

/** Tubercles along the dorsal ridge — they ride the silhouette in profile and fade as the back turns away. */
export function drawKnobs(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  const v = sstep(-0.55, -0.05, -BD[4].dn);
  if (v < 0.02) return;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let f = 1.3; f < NB + 5; f += 0.68) {
      const o = lerpNode(BD, f), r = (f < NB ? 0.0085 : 0.006) * (pass ? 0.45 : 1);
      absPt(o, -1, 0);
      const x = Q.x - (pass ? 0.003 : 0), y = Q.y - (pass ? 0.003 : 0);
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.globalAlpha = al * v; ctx.fillStyle = pass ? pal.knobHi : pal.knob; ctx.fill();
  }
}

/** Head (clipped): crown shadow, creamy jaw, rotating highlight, cheek blush, gill arc, snout rings, key light. */
export function drawHeadSkin(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  const L = HD.length - 1, sg = litSign(HD[2]);
  ctx.strokeStyle = pal.shade;
  ctx.globalAlpha = al * 0.6; ctx.lineWidth = 0.045; strokeAbs(ctx, HD, 0, 4, -1, 0);
  ctx.globalAlpha = al * 0.5; ctx.lineWidth = 0.05; strokeRel(ctx, HD, 0, L, HALF - 0.95 * sg);
  ctx.strokeStyle = pal.cream; ctx.globalAlpha = al * 0.75; ctx.lineWidth = 0.035; strokeAbs(ctx, HD, 1, L - 1, 1, 0);
  rel(lerpNode(HD, 1.4), 0, 1);
  ctx.globalAlpha = al; ctx.fillStyle = pal.blush; ctx.beginPath(); ctx.arc(Q.x, Q.y + 0.012, 0.032, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.sheen; ctx.lineWidth = 0.022; strokeRel(ctx, HD, 0, L, HALF + 0.6 * sg);
  ctx.strokeStyle = pal.ring; ctx.lineWidth = 0.011;
  ctx.beginPath(); ringPath(ctx, lerpNode(HD, 0.85), 0, 0); ctx.stroke();
  ctx.lineWidth = 0.006;
  ctx.beginPath(); ringPath(ctx, lerpNode(HD, 4.5), 0, 0); ringPath(ctx, lerpNode(HD, 5.4), 0, 0); ctx.stroke();
  ctx.strokeStyle = pal.ringHi; ctx.lineWidth = 0.006;
  ctx.beginPath(); ringPath(ctx, lerpNode(HD, 0.85), -0.004, -0.004); ctx.stroke();
  lightOverlay(ctx, pal, al);
}

export function drawCrownSkin(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  ctx.globalAlpha = al; ctx.strokeStyle = pal.sheen; ctx.lineWidth = 0.012;
  strokeRel(ctx, CR, 0, CR.length - 1, HALF + 0.6 * litSign(CR[1]));
  lightOverlay(ctx, pal, al);
}