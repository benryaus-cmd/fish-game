import type { Food } from '@/utils/fishFood';
import type { SchoolMember } from '@/utils/fishSchool';
import type { Seahorse } from '@/utils/seahorseModel';
import { setZone, spawnAngel, Z, type AngelEnv, type Angelfish } from '@/utils/angelModel';
import { updateAngel, type AngelHooks } from '@/utils/angelBrain';
import { drawAngelfish } from '@/utils/angelRender';
import type { AngelPalette } from '@/utils/angelPalette';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Load spreads owned angelfish over open water; purchases glide in from a side edge. */
export function syncAngels(list: Angelfish[], owned: number, env: AngelEnv, initial: boolean) {
  if (initial) { for (let i = 0; i < owned; i++) list.push(spawnAngel(env, false, i, owned)); }
  else if (list.length < owned) list.push(spawnAngel(env, true, 0, 1));
}

function nudge(a: Angelfish, ox: number, oy: number, R: number, k0: number, dt: number) {
  if (a.mode === 'eat') return;
  const dx = a.x - ox, dy = a.y - oy, d = Math.hypot(dx, dy * 0.8);
  if (d >= R) return;
  const k = 1 - d / R, e = k * k * R * k0 * dt;
  a.x += (dx >= 0 ? 1 : -1) * e * 0.4;
  a.y += (dy >= 0 ? 1 : -1) * e;
  if (a.mode === 'hover') a.ay += (dy >= 0 ? 1 : -1) * e;
}

/** Gentle spacing from each other, passing fish and seahorses — no hard collisions. */
export function updateAngels(list: Angelfish[], food: Food[], dt: number, env: AngelEnv, school: SchoolMember[], seas: Seahorse[], hooks: AngelHooks) {
  for (const a of list) updateAngel(a, food, dt, env, hooks);
  const d = Math.min(dt, 0.05);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j], ax = a.x, ay = a.y, R = (a.S + b.S) * 0.8;
      nudge(a, b.x, b.y, R, 0.5, d);
      nudge(b, ax, ay, R, 0.5, d);
    }
    for (const m of school) nudge(a, m.fish.x, m.fish.y, a.S * 0.55 + m.fish.L * 0.4, 0.25, d);
    for (const s of seas) nudge(a, s.x, s.y, a.S * 0.6 + s.H * 0.35, 0.3, d);
    setZone(a, env);
    a.x = clamp(a.x + 0, Z.x0, Z.x1);
    a.y = clamp(a.y, Z.y0 - a.S * 0.05, Z.y1 + a.S * 0.05);
  }
}

export function drawAngels(ctx: CanvasRenderingContext2D, list: Angelfish[], pal: AngelPalette) {
  for (const a of list) drawAngelfish(ctx, a, pal);
}