import type { Food } from '@/utils/fishFood';
import type { SchoolMember } from '@/utils/fishSchool';
import { setZone, spawnSeahorse, Z, type SeaEnv, type Seahorse, type SeaPalette } from '@/utils/seahorseModel';
import { updateSeahorse, type SeaEat } from '@/utils/seahorseBrain';
import { drawSeahorse } from '@/utils/seahorseRender';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Load spreads owned seahorses over the zone; purchases fade in near a side edge. */
export function syncSeahorses(list: Seahorse[], owned: number, env: SeaEnv, initial: boolean) {
  if (initial) { for (let i = 0; i < owned; i++) list.push(spawnSeahorse(env, false, i, owned)); }
  else if (list.length < owned) list.push(spawnSeahorse(env, true, 0, 1));
}

const calm = (s: Seahorse) => s.mode === 'hover' || s.mode === 'drift';
function nudge(s: Seahorse, dx: number, dy: number) {
  s.x += dx; s.y += dy;
  if (s.mode === 'hover') { s.ax += dx; s.ay += dy * 1.5; }
}

/** Soft spacing: drift apart from each other and gently give way to passing fish. */
function space(list: Seahorse[], school: SchoolMember[], dt: number, env: SeaEnv) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = (a.H + b.H) * 0.34;
      if (d >= R) continue;
      const k = 1 - d / R, nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0, push = k * k * R * 0.6 * dt;
      if (a.mode !== 'eat') nudge(a, -nx * push, -ny * push);
      if (b.mode !== 'eat') nudge(b, nx * push, ny * push);
    }
  }
  for (const s of list) {
    if (calm(s)) {
      for (const m of school) {
        const f = m.fish, dx = s.x - f.x, dy = s.y - s.H * 0.1 - f.y, d = Math.hypot(dx, dy), R = s.H * 0.4 + f.L * 0.35;
        if (d >= R) continue;
        const k = 1 - d / R, e = k * k * dt;
        nudge(s, (dx >= 0 ? 1 : -1) * e * s.H * 0.15, (dy >= 0 ? 1 : -1) * e * s.H * 0.25);
      }
    }
    setZone(s, env);
    s.x = clamp(s.x, Z.x0, Z.x1);
    s.y = clamp(s.y, Z.y0, Z.y1);
  }
}

export function updateSeahorses(list: Seahorse[], food: Food[], dt: number, env: SeaEnv, school: SchoolMember[], onEat: SeaEat, onFlutter: () => void) {
  for (const s of list) updateSeahorse(s, food, dt, env, onEat, onFlutter);
  space(list, school, Math.min(dt, 0.05), env);
}

export function drawSeahorses(ctx: CanvasRenderingContext2D, list: Seahorse[], pal: SeaPalette) {
  for (const s of list) drawSeahorse(ctx, s, pal);
}