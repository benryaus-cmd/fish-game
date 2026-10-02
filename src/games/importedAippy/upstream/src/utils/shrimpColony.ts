import type { Food } from '@/utils/fishFood';
import type { Crab } from '@/utils/crabModel';
import type { Starfish } from '@/utils/starfishModel';
import { margin, spawnShrimp, type Shrimp, type ShrimpEnv, type ShrimpPalette } from '@/utils/shrimpModel';
import { updateShrimp, type ShrimpHooks } from '@/utils/shrimpBrain';
import { drawShrimp } from '@/utils/shrimpRender';

/** Load spreads owned shrimp over the sand; purchases fade in low near a side edge. */
export function syncShrimp(list: Shrimp[], owned: number, env: ShrimpEnv, initial: boolean) {
  if (initial) { for (let i = 0; i < owned; i++) list.push(spawnShrimp(env, false, i, owned)); }
  else if (list.length < owned) list.push(spawnShrimp(env, true, 0, 1));
}

/** Soft sideways nudge away from a neighbour — no bouncing; small overlaps are fine. */
function nudge(s: Shrimp, ox: number, oy: number, R: number, dt: number) {
  if (s.mode === 'eat') return;
  const dx = s.x - ox, dy = (s.y - oy) * 1.4, d = Math.hypot(dx, dy);
  if (d >= R) return;
  const k = 1 - d / R;
  s.x += (dx >= 0 ? 1 : -1) * k * k * R * 0.7 * dt;
}

export function updateShrimps(list: Shrimp[], food: Food[], dt: number, env: ShrimpEnv, crabs: Crab[], stars: Starfish[], hooks: ShrimpHooks) {
  for (const s of list) updateShrimp(s, food, dt, env, hooks);
  const d = Math.min(dt, 0.05);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j], ax = a.x, ay = a.y, R = (a.S + b.S) * 0.5;
      nudge(a, b.x, b.y, R, d);
      nudge(b, ax, ay, R, d);
    }
    for (const c of crabs) nudge(a, c.cx, c.cy, a.S * 0.45 + c.S * 0.85, d);
    for (const st of stars) nudge(a, st.x, env.surfaceY(st.x) + st.z, a.S * 0.4 + st.R, d);
  }
  for (const s of list) {
    const m = margin(s.S);
    s.x = Math.min(Math.max(s.x, m), Math.max(m, env.w - m));
  }
}

export function drawShrimps(ctx: CanvasRenderingContext2D, list: Shrimp[], pal: ShrimpPalette) {
  for (const s of list) drawShrimp(ctx, s, pal);
}