import { fishScale, type Fish } from '@/utils/fishModel';
import { consumeFood, type Food } from '@/utils/fishFood';
import type { FishBounds } from '@/utils/fishBrain';
import { canFeed, noteEat } from '@/utils/feedGate';

export type FeedMode = 'cruise' | 'detect' | 'approach' | 'eat' | 'recover';
export interface FeedBrain { id: number; mode: FeedMode; target: Food | null; t: number; scan: number; lunge: number; bitten: boolean }
export const createFeedBrain = (id = 0): FeedBrain => ({ id, mode: 'cruise', target: null, t: 0, scan: 0.2 + Math.random() * 0.3, lunge: 0, bitten: false });

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

let mx = 0, my = 0;
function mouth(f: Fish, S: number) {
  const p = f.pitch + f.tilt;
  mx = f.x + Math.cos(f.yaw) * Math.cos(p) * 0.42 * S;
  my = f.y - Math.sin(p) * 0.42 * S + 0.03 * S;
}
const reachable = (p: Food, f: Fish, b: FishBounds, S: number) =>
  !p.eaten && !p.expired && p.alpha > 0.4 && p.y <= b.floorY - 0.2 * f.L + 0.25 * S;
function cost(p: Food, f: Fish) {
  let d = Math.hypot(p.x - mx, p.y - my);
  if ((p.x - f.x) * f.dir < 0) d += f.L * 1.2;
  if (p.landed) d += f.L * 0.8;
  return d;
}
/** Only free pellets (or ones this fish already reserved) are candidates. */
function choose(food: Food[], f: Fish, b: FishBounds, S: number, radius: number, id: number): Food | null {
  let best: Food | null = null, bc = Infinity;
  for (const p of food) {
    if (p.owner !== -1 && p.owner !== id) continue;
    if (!reachable(p, f, b, S) || Math.hypot(p.x - mx, p.y - my) > radius) continue;
    const c = cost(p, f);
    if (c < bc) { bc = c; best = p; }
  }
  return best;
}
function claim(fb: FeedBrain, p: Food | null) {
  if (fb.target && fb.target !== p && fb.target.owner === fb.id) fb.target.owner = -1;
  fb.target = p;
  if (p) p.owner = fb.id;
}
function steer(f: Fish, p: Food, S: number, cruise: number) {
  f.tx = p.x - f.dir * 0.4 * S;
  f.ty = p.y - 0.03 * S;
  f.cruise = cruise; f.rest = 0; f.decide = 5;
}
function release(fb: FeedBrain, f: Fish) { claim(fb, null); fb.mode = 'cruise'; fb.scan = 0.15; f.seek = false; }

/** Detect → Approach → Eat → Recover; steers the existing swim/turn brain instead of overriding it. */
export function updateFeeding(fb: FeedBrain, f: Fish, food: Food[], dtRaw: number, b: FishBounds, onBite: (x: number, y: number, f: Fish) => void) {
  const dt = Math.min(dtRaw, 0.05);
  if (dt <= 0) return;
  const L = f.L, S = fishScale(f), tr = f.tr;
  const radius = Math.max(L * 3.6, Math.min(b.w, b.h) * 0.42) * f.pCurious;
  mouth(f, S);
  fb.t += dt;
  if (fb.target && (fb.mode === 'detect' || fb.mode === 'approach') && (!reachable(fb.target, f, b, S) || !canFeed(fb))) release(fb, f);
  if (fb.mode !== 'eat') {
    f.mouth += -f.mouth * ease(9, dt);
    f.tilt += -f.tilt * ease(6, dt);
  }
  const tg = fb.target;
  switch (fb.mode) {
    case 'cruise': {
      fb.scan -= dt;
      if (fb.scan > 0) break;
      fb.scan = tr.scan * f.pReact;
      if (!canFeed(fb)) break;
      const next = choose(food, f, b, S, radius, fb.id);
      if (next) { claim(fb, next); fb.mode = 'detect'; fb.t = 0; f.seek = true; steer(f, next, S, 0.26); }
      break;
    }
    case 'detect':
      if (tg) steer(f, tg, S, 0.26);
      if (fb.t > tr.detect * f.pReact) { fb.mode = 'approach'; fb.t = 0; fb.scan = 0.8; }
      break;
    case 'approach': {
      if (!tg) { release(fb, f); break; }
      let cur = tg;
      fb.scan -= dt;
      if (fb.scan <= 0) {
        fb.scan = 0.8;
        const alt = choose(food, f, b, S, radius, fb.id);
        if (alt && alt !== tg && cost(alt, f) < cost(tg, f) * 0.5) { claim(fb, alt); cur = alt; }
      }
      const dx = cur.x - mx, dy = cur.y - my, d = Math.hypot(dx, dy);
      if (d > radius * 1.5) { release(fb, f); break; }
      const ahead = Math.max(0, dx * f.dir);
      steer(f, cur, S, clamp((0.09 + (ahead / L) * 0.34 + (Math.abs(dy) / L) * 0.05) * tr.approachMul, 0.1, 0.95));
      if (d < tr.eatReach * S) { fb.mode = 'eat'; fb.t = 0; fb.bitten = false; fb.lunge = 0; }
      break;
    }
    case 'eat': {
      const t = fb.t;
      if (tg && !fb.bitten) {
        steer(f, tg, S, 0.08);
        const k = ease(t < 0.1 ? 4 : 14, dt);
        tg.x += (mx - tg.x) * k; tg.y += (my - tg.y) * k;
      }
      const o = tr.eatOpen, hold = o + tr.eatHold, close = Math.max(0.05, tr.eatEnd - hold - 0.06);
      f.mouth = t < o ? smooth(t / o) : t < hold ? 1 : 1 - smooth((t - hold) / close);
      // Gentle upward head tilt for species that nibble upward
      f.tilt = tr.tilt * Math.sin(Math.PI * clamp(t / tr.eatEnd, 0, 1));
      const lg = Math.sin(Math.PI * clamp(t / (tr.eatEnd * 0.913), 0, 1)) * tr.lunge * L;
      f.x += Math.cos(f.yawBody) * (lg - fb.lunge);
      fb.lunge = lg;
      if (t >= tr.eatBite && !fb.bitten) {
        fb.bitten = true;
        if (tg && consumeFood(tg)) { onBite(mx, my, f); noteEat(fb); }
      }
      if (t >= tr.eatEnd) {
        claim(fb, null);
        fb.mode = 'recover'; fb.t = 0; f.seek = false;
        f.rest = (0.9 + Math.random() * 0.7) * (tr.recover / 1.3); f.vy -= L * 0.06; f.cruise = 0.2;
      }
      break;
    }
    case 'recover':
      f.cruise = Math.min(f.cruise, 0.22);
      if (fb.t > tr.recover * f.pReact) { fb.mode = 'cruise'; fb.scan = 0.2 + Math.random() * 0.3; f.cruise = tr.cruiseMin + Math.random() * tr.cruiseRange; }
      break;
  }
}