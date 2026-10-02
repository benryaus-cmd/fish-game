import type { Food } from '@/utils/fishFood';
import { SQ, spawnStarfish, type StarEnv, type Starfish, type StarPalette } from '@/utils/starfishModel';
import { clampPos, updateStarfish, type StarEat } from '@/utils/starfishBrain';
import { drawStarfish } from '@/utils/starfishRender';

/** Load spreads owned starfish over the floor; purchases settle into a free spot. */
export function syncStarfish(list: Starfish[], owned: number, env: StarEnv, initial: boolean) {
  if (initial) { for (let i = 0; i < owned; i++) list.push(spawnStarfish(env, false, i, owned, list)); }
  else if (list.length < owned) list.push(spawnStarfish(env, true, 0, 1, list));
}

/** Very gentle spacing; a crawler heading into a neighbour simply pauses. */
function separate(list: Starfish[], dt: number, env: StarEnv) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, dv = (b.z - a.z) / SQ, d = Math.hypot(dx, dv), R = a.R + b.R;
      if (d >= R) continue;
      const k = 1 - d / R, nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dv / d : 0, push = k * k * a.R * 0.25 * dt;
      if (a.mode !== 'cover') { a.x -= nx * push; a.z -= ny * push * SQ; }
      if (b.mode !== 'cover') { b.x += nx * push; b.z += ny * push * SQ; }
      if (k > 0.3) {
        if (a.mode === 'crawl' && Math.cos(a.moveDir) * nx + Math.sin(a.moveDir) * ny > 0.5) a.t = a.dur + 1;
        if (b.mode === 'crawl' && Math.cos(b.moveDir) * nx + Math.sin(b.moveDir) * ny < -0.5) b.t = b.dur + 1;
      }
      clampPos(a, env);
      clampPos(b, env);
    }
  }
}

export function updateStarfishes(list: Starfish[], food: Food[], dt: number, env: StarEnv, onEat: StarEat, onPulse: () => void) {
  const d = Math.min(dt, 0.05);
  for (const s of list) updateStarfish(s, food, d, env, onEat, onPulse);
  separate(list, d, env);
}

/** Starfish farther back on the sand draw first. */
export function drawStarfishes(ctx: CanvasRenderingContext2D, list: Starfish[], pal: StarPalette, env: StarEnv) {
  list.sort((a, b) => a.z - b.z);
  for (const s of list) drawStarfish(ctx, s, pal, env.surfaceY(s.x) + s.z);
}