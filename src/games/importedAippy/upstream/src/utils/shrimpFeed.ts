import { consumeFood, type Food } from '@/utils/fishFood';
import { floorAt, type Shrimp, type ShrimpEnv } from '@/utils/shrimpModel';
import { mouthAt, Q } from '@/utils/shrimpRig';
import { canFeed, noteEat } from '@/utils/feedGate';

export type ShrimpEat = (x: number, y: number, s: Shrimp) => void;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);

const usable = (p: Food, s: Shrimp) => !p.eaten && !p.expired && p.alpha > 0.4 && (p.owner === -1 || p.owner === s.id);
/** Only food near the bottom and close by — never chases across the tank. */
const reachable = (p: Food, s: Shrimp, env: ShrimpEnv) =>
  Math.abs(p.x - s.x) < s.S * 2.6 && p.y > floorAt(env, p.x, s.S) - s.S * 1.5 && p.y > s.y - s.S * 1.3;

export function release(s: Shrimp) {
  if (s.target && s.target.owner === s.id) s.target.owner = -1;
  s.target = null;
}

export function scan(s: Shrimp, food: Food[], env: ShrimpEnv) {
  s.scan = rnd(0.25, 0.5) * s.pReact;
  if (!canFeed(s)) return;
  let best: Food | null = null, bd = Infinity;
  for (const p of food) {
    if (!usable(p, s) || !reachable(p, s, env)) continue;
    const d = Math.hypot(p.x - s.x, (p.y - s.y) * 1.3);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  s.target = best; best.owner = s.id;
  s.mode = 'approach'; s.t = 0; s.dur = rnd(0.12, 0.35) * s.pReact;
}

/** Notice → turn → careful approach with antennae forward → front legs pick & bring food to mouth → consume once. Returns false when done. */
export function feed(s: Shrimp, dt: number, env: ShrimpEnv, onEat: ShrimpEat): boolean {
  const p = s.target, S = s.S;
  if (s.mode === 'approach') {
    if (!p || !usable(p, s) || !reachable(p, s, env) || !canFeed(s) || s.t > 10) { release(s); return false; }
    if ((p.x - s.x) * s.want < -S * 0.05) s.want = p.x > s.x ? 1 : -1;
    if (s.t < s.dur) { s.tx = s.x; s.ty = s.y; return true; }
    s.tx = p.x - s.face * S * 0.2;
    s.ty = Math.min(floorAt(env, s.tx, S), p.y - S * 0.04);
    mouthAt(s);
    if (s.turnP >= 1 && (p.x - s.x) * s.face > 0 && Math.hypot(p.x - Q.x, p.y - Q.y) < S * 0.15) { s.mode = 'eat'; s.t = 0; s.ate = false; }
    return true;
  }
  const t = s.t;
  s.tx = s.x; s.ty = s.y;
  if (!s.ate) {
    if (!p || p.eaten || p.expired) { release(s); return false; }
    mouthAt(s);
    const k = ease(t < 0.4 ? 1.5 : 8, dt);
    p.x += (Q.x - p.x) * k; p.y += (Q.y - p.y) * k; p.vx = 0; p.vy = 0;
    if (t >= 0.75) { s.ate = true; s.target = null; if (consumeFood(p)) onEat(Q.x, Q.y, s); }
  }
  return t < 1.9;
}