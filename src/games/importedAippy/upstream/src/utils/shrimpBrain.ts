import type { Food } from '@/utils/fishFood';
import { floorAt, margin, type Shrimp, type ShrimpEnv } from '@/utils/shrimpModel';
import { stepTurn } from '@/utils/shrimpTurn';
import { feed, scan, type ShrimpEat } from '@/utils/shrimpFeed';
import { animate, move } from '@/utils/shrimpMotion';

export interface ShrimpHooks { onEat: ShrimpEat; onStep: () => void; onFlick: () => void }
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);

function settle(s: Shrimp, short: boolean) {
  s.mode = 'rest'; s.t = 0; s.dur = (short ? rnd(0.8, 2) : rnd(2.5, 6)) * s.pIdle; s.tx = s.x;
}

/** Room behind for a short backward burst. */
const canFlick = (s: Shrimp, env: ShrimpEnv) => {
  const m = margin(s.S), bx = s.x - s.face * s.S * 1.3;
  return bx > m && bx < env.w - m;
};

/** Short repositioning: a careful walk on the sand or a low hover just above it. */
function next(s: Shrimp, env: ShrimpEnv) {
  s.t = 0;
  if (s.flickIn <= 0 && canFlick(s, env)) { s.mode = 'flick'; s.kicked = false; return; }
  const m = margin(s.S), home = s.homeX * env.w;
  let dir: 1 | -1 = Math.random() < 0.7 ? s.face : s.face > 0 ? -1 : 1;
  if (Math.abs(home - s.x) > env.w * 0.25) dir = home > s.x ? 1 : -1;
  s.tx = clamp(s.x + dir * s.S * rnd(0.4, 1.4), m, Math.max(m, env.w - m));
  if ((s.tx - s.x) * s.face < -s.S * 0.15) s.want = dir;
  if (Math.random() < 0.55) { s.mode = 'walk'; s.dur = rnd(3, 6); }
  else { s.mode = 'hover'; s.dur = rnd(3, 7); s.ty = floorAt(env, s.tx, s.S) - s.S * rnd(0.2, 0.9); }
}

/** Pause → abdomen curls → fan contracts and pushes → quick backward glide → relax. */
function flick(s: Shrimp, dt: number, onFlick: () => void) {
  const t = s.t;
  if (!s.kicked && t >= 0.32) { s.kicked = true; s.vx = -s.face * s.S * 2.6; s.vy = -s.S * 0.45; onFlick(); }
  const tc = t < 0.32 ? 0.14 : t < 0.48 ? 1 : 0;
  s.curl += (tc - s.curl) * ease(t < 0.32 ? 5 : t < 0.48 ? 28 : 3.2, dt);
  const tf = t < 0.32 ? 0.95 : t < 0.5 ? 0.12 : 0.65;
  s.fan += (tf - s.fan) * ease(t < 0.5 ? 18 : 3, dt);
  if (t > 1.6) {
    s.flickIn = rnd(16, 34) * s.pIdle;
    s.mode = 'hover'; s.t = 0; s.dur = rnd(1.5, 3); s.tx = s.x; s.ty = s.y + s.S * 0.1;
  }
}

/** Start turning well before an edge, so the shrimp never presses into an invisible wall. */
function edges(s: Shrimp, env: ShrimpEnv) {
  if (s.mode !== 'rest' && s.mode !== 'walk' && s.mode !== 'hover') return;
  const m = margin(s.S), lim = s.S * 0.9;
  const away = s.face > 0 && env.w - m - s.x < lim ? -1 : s.face < 0 && s.x - m < lim ? 1 : 0;
  if (away === 0 || s.want === away) return;
  s.want = away;
  if (s.mode !== 'rest') settle(s, true);
}

export function updateShrimp(s: Shrimp, food: Food[], dtRaw: number, env: ShrimpEnv, hooks: ShrimpHooks) {
  const dt = Math.min(dtRaw, 0.05);
  s.t += dt; s.flickIn -= dt;
  if (s.mode === 'approach' || s.mode === 'eat') {
    if (!feed(s, dt, env, hooks.onEat)) settle(s, true);
  } else if (s.mode !== 'flick') {
    s.scan -= dt;
    if (s.scan <= 0 && s.fade >= 1) scan(s, food, env);
  }
  if (s.mode === 'rest') { if (s.t > s.dur && s.turnP >= 1) next(s, env); }
  else if (s.mode === 'walk' || s.mode === 'hover') {
    if (s.t > s.dur || (Math.abs(s.tx - s.x) < s.S * 0.05 && Math.abs(s.ty - s.y) < s.S * 0.05)) settle(s, false);
  } else if (s.mode === 'flick') flick(s, dt, hooks.onFlick);
  edges(s, env);
  stepTurn(s, dt);
  move(s, dt, env);
  animate(s, dt, env, hooks.onStep);
}