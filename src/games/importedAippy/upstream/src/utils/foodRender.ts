import { FOOD_PTS, type Food } from '@/utils/fishFood';
import { TAU } from '@/utils/fishModel';
import { mix } from '@/utils/colorUtils';

export interface FoodPalette { fills: string[]; edge: string; hi: string; speck: string; ground: string }

export function makeFoodPalette(base: string): FoodPalette {
  return {
    fills: [mix(base, base, 0), mix(base, '#5a3a1c', 0.2), mix(base, '#e8c89a', 0.18), mix(base, '#6b5a2a', 0.16)],
    edge: mix(base, '#3a2410', 0.5, 0.4),
    hi: mix(base, '#fff1d6', 0.7),
    speck: mix(base, '#3a2410', 0.45, 0.45),
    ground: 'rgba(60,42,22,1)',
  };
}

const STEP = TAU / FOOD_PTS;
const X = new Float32Array(FOOD_PTS);
const Y = new Float32Array(FOOD_PTS);

function pelletPath(ctx: CanvasRenderingContext2D, p: Food) {
  for (let k = 0; k < FOOD_PTS; k++) {
    X[k] = Math.cos(k * STEP) * p.shape[k] * p.ax;
    Y[k] = Math.sin(k * STEP) * p.shape[k];
  }
  const l = FOOD_PTS - 1;
  ctx.beginPath();
  ctx.moveTo((X[l] + X[0]) * 0.5, (Y[l] + Y[0]) * 0.5);
  for (let k = 0; k < FOOD_PTS; k++) {
    const n = k === l ? 0 : k + 1;
    ctx.quadraticCurveTo(X[k], Y[k], (X[k] + X[n]) * 0.5, (Y[k] + Y[n]) * 0.5);
  }
  ctx.closePath();
}

/** Small organic pellets; `front` selects the layer in front of (z ≥ 1) or behind the fish. */
export function drawFood(ctx: CanvasRenderingContext2D, list: Food[], pal: FoodPalette, front: boolean) {
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.eaten || (p.z >= 1) !== front) continue;
    const a = p.alpha * Math.min(1, p.age / 0.3);
    if (a <= 0.01) continue;
    const s = p.r * p.z;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);
    if (p.landed) {
      ctx.globalAlpha = 0.16 * a;
      ctx.fillStyle = pal.ground;
      ctx.beginPath(); ctx.ellipse(0.1, 0.6, 1.35, 0.35, 0, 0, TAU); ctx.fill();
    }
    ctx.rotate(p.rot);
    pelletPath(ctx, p);
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.fills[p.col];
    ctx.fill();
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 0.22;
    ctx.stroke();
    ctx.fillStyle = pal.speck;
    ctx.beginPath(); ctx.arc(0.3, 0.22, 0.17, 0, TAU); ctx.fill();
    ctx.rotate(-p.rot);
    ctx.globalAlpha = a * 0.45;
    ctx.fillStyle = pal.hi;
    ctx.beginPath(); ctx.ellipse(-0.18, -0.38, 0.42, 0.2, -0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}