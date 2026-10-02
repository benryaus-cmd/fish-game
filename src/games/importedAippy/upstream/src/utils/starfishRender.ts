import { ARMS, BUMPS, SQ, type Starfish, type StarPalette } from '@/utils/starfishModel';
import { C, OUTLINE_LEN, buildOutline, centerAt, computeArms, tracePath, widthAt, type StarPose } from '@/utils/starfishShape';

const TAU = Math.PI * 2;
const OUT = new Float32Array(OUTLINE_LEN);
const POSE: StarPose = { heading: 0, clock: 0, stride: 0, phase: 0, moveDir: 0, cover: 0, breathe: 0 };
const RIDGE = [0.32, 0.52, 0.7, 0.84];

interface Grads { key: string; body: CanvasGradient; shadow: CanvasGradient; hump: CanvasGradient }
let grads: Grads | null = null;

/** Unit-space gradients cached per palette (reused every frame via transforms). */
function getGrads(ctx: CanvasRenderingContext2D, pal: StarPalette): Grads {
  if (grads && grads.key === pal.key) return grads;
  const body = ctx.createRadialGradient(0, -0.08, 0.02, 0, 0, 1.05);
  body.addColorStop(0, pal.core);
  body.addColorStop(0.3, pal.base);
  body.addColorStop(0.68, pal.light);
  body.addColorStop(1, pal.tip);
  const shadow = ctx.createRadialGradient(0, 0.16, 0.25, 0, 0.16, 1.15);
  shadow.addColorStop(0, 'rgba(40,45,35,0.26)');
  shadow.addColorStop(1, 'rgba(40,45,35,0)');
  const hump = ctx.createRadialGradient(-0.03, -0.08, 0, -0.03, -0.06, 0.36);
  hump.addColorStop(0, pal.humpA);
  hump.addColorStop(1, pal.humpB);
  grads = { key: pal.key, body, shadow, hump };
  return grads;
}

function bumpPath(ctx: CanvasRenderingContext2D, s: Starfish, dx: number, dy: number, rm: number) {
  ctx.beginPath();
  for (let i = 0; i < ARMS; i++) {
    for (let b = 0; b < BUMPS; b++) {
      const k = (i * BUMPS + b) * 2, sv = s.bumps[k];
      centerAt(i, sv);
      const w = widthAt(s.arms, i, sv, POSE), r = (0.034 - sv * 0.018) * rm;
      const x = C.x + C.nx * s.bumps[k + 1] * w + dx, y = C.y + C.ny * s.bumps[k + 1] * w + dy;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
  }
}

/** Flat five-armed body projected onto the sand: shadow, thickness, soft gradient, ridges, bumps. */
export function drawStarfish(ctx: CanvasRenderingContext2D, s: Starfish, pal: StarPalette, sy: number) {
  POSE.heading = s.heading; POSE.clock = s.clock; POSE.stride = s.stride; POSE.phase = s.phase;
  POSE.moveDir = s.moveDir; POSE.cover = s.cover; POSE.breathe = Math.sin(s.clock * 0.5 * s.pIdle + s.seed);
  computeArms(s.arms, POSE);
  buildOutline(OUT, s.arms, POSE);
  const g = getGrads(ctx, pal);
  const f = s.fade, e = f * f * (3 - 2 * f), sc = s.R * (0.9 + 0.1 * e);
  ctx.save();
  ctx.globalAlpha = e;
  ctx.translate(s.x, sy);
  ctx.scale(sc, sc * SQ);
  ctx.fillStyle = g.shadow;
  ctx.beginPath();
  ctx.arc(0, 0.16, 1.15, 0, TAU);
  ctx.fill();
  // Body thickness seen from the shallow viewing angle
  ctx.translate(0, 0.13);
  tracePath(ctx, OUT);
  ctx.fillStyle = pal.shade;
  ctx.fill();
  ctx.translate(0, -0.13);
  tracePath(ctx, OUT);
  ctx.fillStyle = g.body;
  ctx.fill();
  ctx.lineWidth = 0.028;
  ctx.strokeStyle = pal.rim;
  ctx.stroke();
  // Soft raised ridge along each arm
  ctx.beginPath();
  for (let i = 0; i < ARMS; i++) {
    centerAt(i, 0.12);
    ctx.moveTo(C.x, C.y);
    for (const sv of RIDGE) { centerAt(i, sv); ctx.lineTo(C.x, C.y); }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.ridge;
  ctx.lineWidth = 0.09;
  ctx.stroke();
  bumpPath(ctx, s, 0.008, 0.02, 0.8);
  ctx.fillStyle = pal.bumpDark;
  ctx.fill();
  bumpPath(ctx, s, 0, 0, 1);
  ctx.fillStyle = pal.bump;
  ctx.fill();
  // Centre disc: gently rises while covering food
  ctx.globalAlpha = e * (0.6 + 0.4 * s.cover);
  ctx.fillStyle = g.hump;
  ctx.beginPath();
  ctx.arc(-0.03, -0.06, 0.36, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = e;
  ctx.fillStyle = pal.bump;
  ctx.beginPath();
  ctx.arc(0.1, 0.04, 0.035, 0, TAU);
  ctx.fill();
  ctx.restore();
}