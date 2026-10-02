import type { AngelPose } from '@/utils/angelModel';
import type { AngelPalette } from '@/utils/angelPalette';
import { halfH, halfT, midY, P, proj, yawAt } from '@/utils/angelProject';
import { mix } from '@/utils/colorUtils';
import { bodyPath, HB } from '@/utils/angelHull';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const sm = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
/** x, half-width, strength, top v, bottom v — eye bar, main bar, rear bar, tail-base bar. */
const STRIPES = [[0.31, 0.02, 0.7, -1.05, 1.05], [0.04, 0.05, 0.62, -1.1, 1.1], [-0.22, 0.04, 0.55, -1.1, 1.1], [-0.385, 0.016, 0.35, -1.2, 1.2]];

/** Point on one flank's curved surface; v = −1 back edge … +1 belly edge. Bars bow back slightly. */
function surf(a: AngelPose, x0: number, v: number, s: number) {
  const x = x0 - 0.035 * v * v, q = yawAt(a, x), r = 1 - v * v;
  proj(x, midY(x) + halfH(x) * v, s * halfT(x, q) * Math.sqrt(r > 0 ? r : 0), q);
}

function band(ctx: CanvasRenderingContext2D, a: AngelPose, x0: number, w: number, s: number, v0: number, v1: number) {
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) { surf(a, x0 - w, v0 + ((v1 - v0) * i) / 8, s); if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y); }
  for (let i = 8; i >= 0; i--) { surf(a, x0 + w, v0 + ((v1 - v0) * i) / 8, s); ctx.lineTo(P.x, P.y); }
  ctx.closePath(); ctx.fill();
}

/** Asymmetric rounded pigment islands, following the flank rather than screen-space rectangles. */
function patch(ctx: CanvasRenderingContext2D, a: AngelPose, x: number, w: number, s: number, v0: number, v1: number) {
  ctx.beginPath();
  for (const edge of [-1,1]) for (let j=0;j<=16;j++) {
    const u = edge < 0 ? j/16 : 1-j/16, v=v0+(v1-v0)*u;
    const radius = Math.sqrt(Math.max(0,1-(u*2-1)**2)) * (0.85+0.15*Math.sin(u*11+x*9));
    surf(a,x+edge*w*radius+0.02*Math.sin(u*5),v,s);
    if(edge===-1&&j===0)ctx.moveTo(P.x,P.y);else ctx.lineTo(P.x,P.y);
  }
  ctx.closePath();ctx.fill();
}

/** Bars and gill cover live ON each flank: they narrow, crowd and fade with perspective. */
function marks(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, s: number, al: number) {
  const vis = sm((s * Math.cos(a.yb) + 0.3) / 0.75);
  if (vis < 0.02) return;
  ctx.fillStyle = pal.stripe;
  if (pal.pattern === 'rainbow') {
    const spectrum = ['#ed7568','#e6b966','#a5c886','#62bdb3','#7298d1','#b28dcc'];
    for (let i = 0; i < 20; i++) {
      const u = i / 19 * 5, k = Math.floor(u);
      ctx.fillStyle = mix(spectrum[k], spectrum[Math.min(5,k+1)],u-k);
      ctx.globalAlpha = al * vis * 0.18;
      band(ctx,a,0.4-i/19*0.78,0.07,s,-1.1,1.1);
    }
  }
  if (pal.pattern === 'koi') {
    for (const [x, w, v0, v1, color] of [[0.26,0.09,-0.9,-0.05,pal.accent], [0.02,0.1,-0.7,0.4,pal.accent], [-0.2,0.07,-0.4,0.65,pal.stripe], [0.15,0.035,0.25,0.85,pal.stripe]] as const) {
      ctx.fillStyle = color ?? pal.gold; ctx.globalAlpha = al * vis * 0.8;
      patch(ctx, a, x, w, s, v0, v1);
    }
  }
  for (let i = 0; i < (pal.pattern && pal.pattern !== 'banded' ? 0 : STRIPES.length); i++) {
    const d = STRIPES[i], x0 = d[0] + (a.vary[i] ?? 0), w = d[1] * (i === 1 ? a.vary[4] ?? 1 : 1);
    ctx.globalAlpha = al * vis * d[2] * 0.35; band(ctx, a, x0, w * 1.8, s, d[3], d[4]);
    ctx.globalAlpha = al * vis * d[2]; band(ctx, a, x0, w, s, d[3], d[4]);
  }
  ctx.globalAlpha = al * vis * 0.4; ctx.strokeStyle = pal.gill; ctx.lineWidth = 0.008;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const v = -0.55 + i * 0.19, x = 0.215 - 0.035 * (1 - v * v), q = yawAt(a, x);
    proj(x, midY(x) + halfH(x) * v, s * halfT(x, q) * Math.sqrt(1 - v * v) * 1.01, q);
    if (i === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y);
  }
  ctx.stroke();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
}

/** Lighting follows orientation: near flank lit, far flank shadowed, frontal ridge catches light. */
function shading(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, al: number) {
  const c = Math.cos(a.yb), sn = Math.sin(a.yb), ac = Math.abs(c), side = clamp(c * 2.2, -1, 1), T0 = halfT(0, a.yb);
  ctx.globalAlpha = al; ctx.fillStyle = pal.vig;
  blob(ctx, (HB.x0 + HB.x1) / 2, 0.02, Math.max(0.08, (HB.x1 - HB.x0) * 0.56), 0.44);
  if (sn > 0.12) {
    proj(-0.02, midY(0) + 0.04, -side * T0 * 1.05, a.yb);
    ctx.globalAlpha = al * 0.5 * sn * Math.abs(side); ctx.fillStyle = pal.shadeG;
    blob(ctx, P.x, P.y, 0.07 + 0.1 * sn, 0.4);
  }
  proj(0.06, -0.09, side * T0 * 0.7, a.yb);
  ctx.globalAlpha = al * (0.6 + 0.4 * ac); ctx.fillStyle = pal.hi;
  blob(ctx, P.x, P.y, 0.08 + 0.16 * ac, 0.17);
  proj(0.05, 0.2, side * T0 * 0.5, a.yb);
  ctx.globalAlpha = al * 0.45; ctx.fillStyle = pal.belly;
  blob(ctx, P.x, P.y, 0.06 + 0.14 * ac, 0.1);
  if (sn > 0.2) {
    const q = yawAt(a, 0.24);
    proj(0.24, midY(0.24) - 0.03, 0, q);
    ctx.globalAlpha = al * 0.5 * sn * sn; ctx.fillStyle = pal.hi;
    blob(ctx, P.x, P.y, 0.04 + 0.04 * sn, 0.2);
  }
}

export function drawBody(ctx: CanvasRenderingContext2D, a: AngelPose, pal: AngelPalette, al: number) {
  bodyPath(ctx, a);
  ctx.globalAlpha = al;
  ctx.strokeStyle = pal.rim; ctx.lineWidth = 0.018; ctx.stroke();
  ctx.fillStyle = pal.bodyG; ctx.fill();
  ctx.save(); ctx.clip();
  marks(ctx, a, pal, 1, al);
  marks(ctx, a, pal, -1, al);
  shading(ctx, a, pal, al);
  ctx.restore();
}