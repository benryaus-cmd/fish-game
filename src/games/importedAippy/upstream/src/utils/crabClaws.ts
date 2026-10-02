import { clawGeom, G, P, toWorld, type Crab, type CrabPalette } from '@/utils/crabModel';
import { CLAW_SCALE, DACTYL_D, FINGER_D, HINGE_X, HINGE_Y, PALM_D } from '@/utils/crabRig';
import { taper } from '@/utils/crabLegs';

const TAU = Math.PI * 2, RES = 3;
/** Sprite boxes in claw space [x, y, w, h] (x along the claw, wrist at origin). */
const HB = [-0.04, -0.1, 0.4, 0.19] as const;
const DB = [-0.03, -0.07, 0.21, 0.11] as const;
interface Sprites { hand: HTMLCanvasElement; dac: HTMLCanvasElement }
const cache = new Map<string, Sprites>();

function canvasFor(b: readonly number[], k: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.ceil(b[2] * k)); cv.height = Math.max(2, Math.ceil(b[3] * k));
  const g = cv.getContext('2d');
  if (g) g.setTransform(k, 0, 0, k, -b[0] * k, -b[1] * k);
  return { cv, g };
}

function paint(g: CanvasRenderingContext2D, path: Path2D, fill: CanvasGradient, pal: CrabPalette) {
  g.strokeStyle = pal.outline; g.lineWidth = 0.016; g.lineJoin = 'round'; g.stroke(path);
  g.fillStyle = fill; g.fill(path);
}
function spot(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
}

/** Plump rounded palm + fixed finger, and the movable finger — baked once per palette and size. */
function bake(pal: CrabPalette, q: number): Sprites {
  const k = q * RES, H = canvasFor(HB, k), D = canvasFor(DB, k);
  if (H.g) {
    const g = H.g, fing = new Path2D(FINGER_D), palm = new Path2D(PALM_D);
    const fg = g.createLinearGradient(0.16, 0, 0.345, 0);
    fg.addColorStop(0, pal.claw); fg.addColorStop(0.55, pal.finger); fg.addColorStop(1, pal.tip);
    paint(g, fing, fg, pal);
    g.fillStyle = pal.clawLight; g.globalAlpha = 0.5;
    for (const x of [0.2, 0.245, 0.285]) spot(g, x, -0.012 - (x - 0.2) * 0.12, 0.007, 0.007);
    g.globalAlpha = 1;
    const pg = g.createRadialGradient(0.07, -0.045, 0.008, 0.09, 0, 0.17);
    pg.addColorStop(0, pal.clawLight); pg.addColorStop(0.45, pal.claw); pg.addColorStop(1, pal.clawDark);
    paint(g, palm, pg, pal);
    g.save(); g.clip(palm);
    g.globalAlpha = 0.3; g.fillStyle = pal.clawDark; spot(g, 0.1, 0.062, 0.12, 0.03);
    g.globalAlpha = 0.45; g.fillStyle = '#fff6ea'; spot(g, 0.08, -0.052, 0.07, 0.017, -0.08);
    g.globalAlpha = 0.22; g.fillStyle = pal.clawDark;
    spot(g, 0.12, -0.062, 0.0055, 0.0055); spot(g, 0.15, -0.045, 0.0055, 0.0055); spot(g, 0.095, -0.07, 0.005, 0.005);
    g.restore();
    g.globalAlpha = 1;
  }
  if (D.g) {
    const g = D.g, dac = new Path2D(DACTYL_D);
    const dg = g.createLinearGradient(0, 0, 0.17, 0);
    dg.addColorStop(0, pal.claw); dg.addColorStop(0.55, pal.finger); dg.addColorStop(1, pal.tip);
    paint(g, dac, dg, pal);
    g.globalAlpha = 0.4; g.strokeStyle = pal.clawLight; g.lineWidth = 0.009; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0.012, -0.03); g.quadraticCurveTo(0.08, -0.046, 0.135, -0.018); g.stroke();
    g.globalAlpha = 1;
  }
  return { hand: H.cv, dac: D.cv };
}

function sprites(pal: CrabPalette, S: number): Sprites {
  const q = Math.max(4, Math.round(S / 4) * 4), key = pal.key + ':' + q;
  let sp = cache.get(key);
  if (!sp) {
    if (cache.size > 10) cache.clear();
    sp = bake(pal, q);
    cache.set(key, sp);
  }
  return sp;
}

/** Relaxed jointed chelipeds hanging low at the front sides; trailing claw drawn first. Right claw slightly larger. */
export function drawClaws(ctx: CanvasRenderingContext2D, c: Crab, pal: CrabPalette) {
  const S = c.S, sp = sprites(pal, S);
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const s = c.dir > 0 ? i : 1 - i;
    clawGeom(c, s);
    const k = G.sz * S, armK = k * 1.12, ang = G.ang + c.rot, open = c.claws[s].open;
    toWorld(c, G.sx, G.sy); const sx = P.x, sy = P.y;
    toWorld(c, G.ex, G.ey); const ex = P.x, ey = P.y;
    toWorld(c, G.hx, G.hy); const hx = P.x, hy = P.y;
    ctx.fillStyle = pal.outline;
    taper(ctx, sx, sy, ex, ey, 0.088 * armK, 0.08 * armK);
    taper(ctx, ex, ey, hx, hy, 0.078 * armK, 0.096 * armK);
    ctx.fillStyle = pal.claw;
    taper(ctx, sx, sy, ex, ey, 0.07 * armK, 0.063 * armK);
    taper(ctx, ex, ey, hx, hy, 0.061 * armK, 0.079 * armK);
    ctx.globalAlpha = 0.45; ctx.fillStyle = pal.clawDark;
    ctx.beginPath(); ctx.arc(ex, ey, 0.022 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.clawLight; ctx.lineWidth = 0.014 * k;
    ctx.beginPath();
    ctx.moveTo(sx + (ex - sx) * 0.25, sy + (ey - sy) * 0.25 - 0.012 * k); ctx.lineTo(sx + (ex - sx) * 0.75, sy + (ey - sy) * 0.75 - 0.012 * k);
    ctx.moveTo(ex + (hx - ex) * 0.25, ey + (hy - ey) * 0.25 - 0.012 * k); ctx.lineTo(ex + (hx - ex) * 0.7, ey + (hy - ey) * 0.7 - 0.012 * k);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.scale(k * CLAW_SCALE, s ? k * CLAW_SCALE : -k * CLAW_SCALE);
    ctx.save();
    ctx.translate(HINGE_X, HINGE_Y); ctx.rotate(-open * 0.55);
    ctx.drawImage(sp.dac, DB[0], DB[1], DB[2], DB[3]);
    ctx.restore();
    ctx.drawImage(sp.hand, HB[0], HB[1], HB[2], HB[3]);
    ctx.restore();
  }
}