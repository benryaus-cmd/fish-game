import { LAST, TAU, fishSprites, type Fish, type FishPalette } from '@/utils/fishModel';

function blit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, w: number, h: number, a: number) {
  if (a <= 0.005) return;
  ctx.globalAlpha = a;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

/** Layered tropical markings + volume shading for the Colorful Fish (drawn inside the body clip). */
export function drawColorfulShading(ctx: CanvasRenderingContext2D, f: Fish, p: FishPalette, near: number, lw: number) {
  const HH = f.tr.hh, WW = f.tr.ww;
  const { light, cool } = fishSprites();
  // Warm golden lateral band from gill to tail stem — shifts onto the near flank while turning
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  const i0 = 5, i1 = 19;
  for (let i = i0; i <= i1; i++) {
    const a = f.ya[i], c = Math.abs(Math.cos(a));
    const off = -near * Math.sin(a) * WW[i] * 0.55;
    const u = (i - i0) / (i1 - i0);
    const th = HH[i] * (0.2 + 0.1 * Math.sin(Math.PI * u)) * (0.35 + 0.65 * c);
    const y = f.py[i] + HH[i] * 0.08 - th;
    if (i === i0) ctx.moveTo(f.px[i] + off, y); else ctx.lineTo(f.px[i] + off, y);
  }
  for (let i = i1; i >= i0; i--) {
    const a = f.ya[i], c = Math.abs(Math.cos(a));
    const off = -near * Math.sin(a) * WW[i] * 0.55;
    const u = (i - i0) / (i1 - i0);
    const th = HH[i] * (0.2 + 0.1 * Math.sin(Math.PI * u)) * (0.35 + 0.65 * c);
    ctx.lineTo(f.px[i] + off, f.py[i] + HH[i] * 0.08 + th);
  }
  ctx.closePath();
  const cm = Math.abs(Math.cos(f.ya[11]));
  ctx.globalAlpha = 0.5 * (0.25 + 0.75 * cm);
  ctx.fill();
  // Dark saddle bars with a pale halo (layered), fading when seen head-on
  for (const t of [0.3, 0.56]) {
    const i = Math.round(t * LAST), a = f.ya[i];
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    if (c < 0.12) continue;
    const rx = 0.03 * c + WW[i] * s * 0.6;
    ctx.fillStyle = p.belly;
    ctx.globalAlpha = 0.16 * c * c;
    ctx.beginPath(); ctx.ellipse(f.px[i], f.py[i] - HH[i] * 0.25, rx * 1.9, HH[i] * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = p.mark;
    ctx.globalAlpha = 0.26 * c * c;
    ctx.beginPath(); ctx.ellipse(f.px[i], f.py[i] - HH[i] * 0.35, rx, HH[i] * 0.85, 0, 0, TAU); ctx.fill();
  }
  // Tail-stem eyespot
  {
    const i = 18, c = Math.abs(Math.cos(f.ya[i]));
    ctx.fillStyle = p.mark;
    ctx.globalAlpha = 0.34 * c;
    ctx.beginPath(); ctx.ellipse(f.px[i], f.py[i] - HH[i] * 0.1, 0.03 * c + 0.008, HH[i] * 0.7, 0, 0, TAU); ctx.fill();
  }
  // Volume: back light, belly glow, underside + tail shade
  const q = (i: number) => ({ a: f.ya[i], c: Math.abs(Math.cos(f.ya[i])), s: Math.abs(Math.sin(f.ya[i])) });
  let k = q(8);
  blit(ctx, light, f.px[8] - near * Math.sin(k.a) * WW[8] * 0.3, f.py[8] - HH[8] * 0.55, 0.5 * k.c + WW[8] * 1.2 * k.s, 0.06, 0.32);
  k = q(10);
  blit(ctx, light, f.px[10], f.py[10] + HH[10] * 0.6, 0.55 * k.c + WW[10] * 1.5 * k.s, 0.08, 0.18);
  k = q(11);
  blit(ctx, cool, f.px[11], f.py[11] + HH[11] * 1.05, 0.8 * k.c + WW[11] * 2.2 * k.s, 0.085, 0.24);
  k = q(17);
  blit(ctx, cool, f.px[17], f.py[17], 0.36 * k.c + WW[17] * 2 * k.s, HH[17] * 2.6, 0.2);
  const fr = Math.pow(Math.sin(Math.max(0, Math.min(Math.PI, f.ya[3]))), 3);
  if (fr > 0.02) {
    blit(ctx, cool, f.px[9] - WW[9] * 1.05, f.py[9], WW[9] * 1.1, HH[9] * 2.2, 0.3 * fr);
    blit(ctx, cool, f.px[9] + WW[9] * 1.05, f.py[9], WW[9] * 1.1, HH[9] * 2.2, 0.3 * fr);
    blit(ctx, light, f.px[2], f.py[2] - HH[2] * 0.2, WW[2] * 1.4, HH[2] * 1.2, 0.2 * fr);
  }
  // Gill cover arc
  const gc = Math.cos(f.ya[6]);
  ctx.globalAlpha = 0.24 * Math.abs(gc);
  ctx.strokeStyle = p.mark;
  ctx.lineWidth = 1 * lw;
  ctx.beginPath();
  ctx.moveTo(f.px[6], f.py[6] - HH[6] * 0.6);
  ctx.quadraticCurveTo(f.px[6] - gc * 0.04, f.py[6], f.px[6] - gc * 0.01, f.py[6] + HH[6] * 0.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}