import type { Food } from '@/utils/fishFood';
import { spawnCrab, type Crab, type CrabEnv, type CrabPalette } from '@/utils/crabModel';
import { updateCrab } from '@/utils/crabBrain';
import type { CrabBite } from '@/utils/crabFeeding';
import { drawCrab } from '@/utils/crabRender';
import { EDGE } from '@/utils/crabRig';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Load spreads owned crabs over the floor; later purchases walk in from a side edge. */
export function syncCrabs(list: Crab[], owned: number, env: CrabEnv, initial: boolean) {
  if (initial) { for (let i = 0; i < owned; i++) list.push(spawnCrab(env.w, env.L, false, i, owned)); }
  else if (list.length < owned) list.push(spawnCrab(env.w, env.L, true, 0, 1));
}

/** Gentle floor spacing — soft nudges only, no bouncing. */
function separate(list: Crab[], dt: number, env: CrabEnv) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, R = (a.S + b.S) * 0.8;
      if (Math.abs(dx) >= R || Math.abs(a.lane - b.lane) > 0.3) continue;
      const k = 1 - Math.abs(dx) / R, sg = dx >= 0 ? 1 : -1, push = k * k * R * 0.9 * dt;
      a.x -= sg * push; b.x += sg * push;
      const up = a.lane <= b.lane ? -1 : 1;
      if (a.mode === 'walk' || a.mode === 'idle') a.laneT = clamp(a.laneT + up * 0.12 * k * dt, 0.05, 0.7);
      if (b.mode === 'walk' || b.mode === 'idle') b.laneT = clamp(b.laneT - up * 0.12 * k * dt, 0.05, 0.7);
      a.x = clamp(a.x, a.S * EDGE, Math.max(a.S * EDGE, env.w - a.S * EDGE));
      b.x = clamp(b.x, b.S * EDGE, Math.max(b.S * EDGE, env.w - b.S * EDGE));
    }
  }
}

export function updateCrabs(list: Crab[], food: Food[], dt: number, env: CrabEnv, onBite: CrabBite, onStep: () => void) {
  for (const c of list) updateCrab(c, food, dt, env, onBite, onStep);
  separate(list, Math.min(dt, 0.05), env);
}

let off: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;

/** Entering crab fades in as one layer so legs never show through the shell. */
function drawFaded(ctx: CanvasRenderingContext2D, c: Crab, pal: CrabPalette) {
  const S = c.S, hw = 1.1 * S, top = 0.7 * S, bot = 0.55 * S;
  const scale = ctx.getTransform().a || 1;
  const pw = Math.ceil(hw * 2 * scale), ph = Math.ceil((top + bot) * scale);
  if (!off) { off = document.createElement('canvas'); offCtx = off.getContext('2d'); }
  if (!offCtx) { drawCrab(ctx, c, pal); return; }
  if (off.width < pw || off.height < ph) { off.width = Math.max(off.width, pw); off.height = Math.max(off.height, ph); }
  const ox = c.cx - hw, oy = c.cy - top;
  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, pw, ph);
  offCtx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale);
  drawCrab(offCtx, c, pal);
  const f = c.fade;
  ctx.globalAlpha = f * f * (3 - 2 * f);
  ctx.drawImage(off, 0, 0, pw, ph, ox, oy, hw * 2, top + bot);
  ctx.globalAlpha = 1;
}

/** Crabs farther back on the sand draw first. */
export function drawCrabs(ctx: CanvasRenderingContext2D, list: Crab[], pal: CrabPalette) {
  list.sort((a, b) => a.lane - b.lane);
  for (const c of list) {
    if (c.fade < 1) drawFaded(ctx, c, pal);
    else drawCrab(ctx, c, pal);
  }
}