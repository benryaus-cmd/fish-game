import { consumeFood, type Food } from '@/utils/fishFood';
import { ARMS, SQ, setZBounds, ZB, type StarEnv, type Starfish } from '@/utils/starfishModel';
import { canFeed, noteEat } from '@/utils/feedGate';

export type StarEat = (x: number, y: number, s: Starfish) => void;
const TAU = Math.PI * 2;
/** Food must be within this many arm-lengths (on the floor plane) to be noticed. */
const REACT = 2.1;
const COVER_T = 3.4;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const wrap = (a: number) => a - TAU * Math.round(a / TAU);

const foodZ = (p: Food, env: StarEnv) => p.y - env.surfaceY(p.x);
const usable = (p: Food, s: Starfish) => !p.eaten && !p.expired && p.alpha > 0.4 && (p.owner === -1 || p.owner === s.id);
/** Only food resting on the sand, or just about to touch it. */
const onFloor = (p: Food, s: Starfish, env: StarEnv) => p.landed || p.y > env.surfaceY(p.x) - s.R * 0.4;

export function clampPos(s: Starfish, env: StarEnv) {
  const m = s.R * 1.15;
  s.x = clamp(s.x, m, Math.max(m, env.w - m));
  setZBounds(s, env);
  s.z = clamp(s.z, ZB.z0, ZB.z1);
}

function release(s: Starfish) {
  const p = s.target;
  if (p && p.owner === s.id) p.owner = -1;
  s.target = null;
}

export function startRest(s: Starfish, short: boolean) {
  s.mode = 'rest'; s.t = 0;
  s.dur = short ? rnd(3, 6) : rnd(9, 24) * s.pIdle;
}

function startCrawl(s: Starfish, env: StarEnv) {
  const a = Math.random() * TAU, d = s.R * rnd(1.2, 3.2), m = s.R * 1.15;
  let tx = s.x + Math.cos(a) * d;
  tx += (s.homeX * env.w - tx) * 0.3;
  s.tx = clamp(tx, m, Math.max(m, env.w - m));
  setZBounds(s, env);
  s.tz = clamp(s.z + Math.sin(a) * d * SQ, ZB.z0, ZB.z1);
  s.mode = 'crawl'; s.t = 0; s.dur = rnd(18, 34);
}

function scanFood(s: Starfish, food: Food[], env: StarEnv) {
  let best: Food | null = null, bd = s.R * REACT;
  for (const p of food) {
    if (!usable(p, s) || !onFloor(p, s, env)) continue;
    const d = Math.hypot(p.x - s.x, (foodZ(p, env) - s.z) / SQ);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  s.target = best; best.owner = s.id; best.stay = Math.max(best.stay, best.rest + 12);
  s.mode = 'approach'; s.t = 0;
}

/** Notice very close floor food → creep over it → cover it with the body → pause → reward. */
function feed(s: Starfish, food: Food[], dt: number, env: StarEnv, onEat: StarEat) {
  const p = s.target;
  if (p && (!usable(p, s) || (s.mode === 'approach' && !canFeed(s)))) { release(s); if (s.mode === 'approach' || s.mode === 'cover') { s.cover = 0; startRest(s, true); } return; }
  if (s.mode === 'rest' || s.mode === 'crawl') {
    s.scan -= dt;
    if (s.scan > 0 || s.fade < 1) return;
    s.scan = rnd(0.5, 0.9);
    if (canFeed(s)) scanFood(s, food, env);
    return;
  }
  if (s.mode === 'approach') {
    if (!p) { startRest(s, true); return; }
    setZBounds(s, env);
    const fz = foodZ(p, env);
    s.tx = p.x; s.tz = clamp(fz, ZB.z0, ZB.z1);
    p.stay = Math.max(p.stay, p.rest + 10);
    const d = Math.hypot(p.x - s.x, (fz - s.z) / SQ);
    if (p.landed && d < s.R * 0.55) { s.mode = 'cover'; s.t = 0; s.cover = 0; p.z = 0.96; p.stay = 999; }
    else if (s.t > 45 || d > s.R * REACT * 1.6) { release(s); startRest(s, true); }
    return;
  }
  if (s.mode === 'cover') {
    if (!p) { s.cover = 0; startRest(s, true); return; }
    const k = 1 - Math.exp(-dt * 0.9);
    setZBounds(s, env);
    s.x += (p.x - s.x) * k;
    s.z += (clamp(foodZ(p, env), ZB.z0, ZB.z1) - s.z) * k;
    s.cover = smooth(s.t / COVER_T);
    p.alpha = Math.max(0.5, 1 - 0.5 * s.cover);
    if (s.t >= COVER_T) {
      const y = env.surfaceY(s.x) + s.z;
      if (consumeFood(p)) { onEat(s.x, y - s.R * 0.08, s); noteEat(s); }
      s.target = null; s.mode = 'settle'; s.t = 0;
    }
    return;
  }
  if (s.mode === 'settle') {
    s.cover = 1 - smooth((s.t - 1.4) / 1.8);
    if (s.t > 3.2) { s.cover = 0; startRest(s, false); }
  }
}

export function updateStarfish(s: Starfish, food: Food[], dt: number, env: StarEnv, onEat: StarEat, onPulse: () => void) {
  s.clock += dt; s.t += dt;
  if (s.fade < 1) s.fade = Math.min(1, s.fade + dt / 1.8);
  feed(s, food, dt, env, onEat);
  if (s.mode === 'rest' && s.t > s.dur && s.fade >= 1) startCrawl(s, env);
  const dx = s.tx - s.x, dv = (s.tz - s.z) / SQ, dist = Math.hypot(dx, dv);
  if (s.mode === 'crawl' && (dist < s.R * 0.12 || s.t > s.dur)) startRest(s, false);
  const moving = s.mode === 'crawl' || s.mode === 'approach';
  const want = moving ? 1 : s.mode === 'cover' ? 0.35 : 0;
  s.stride += (want - s.stride) * (1 - Math.exp(-dt * 0.55));
  const aim = Math.atan2(dv, dx);
  if (moving && dist > 1) { const r = 0.22 * dt; s.moveDir = wrap(s.moveDir + clamp(wrap(aim - s.moveDir), -r, r)); }
  const prev = Math.sin(s.phase);
  s.phase += ((dt * TAU * s.pSpeed) / 3.6) * (0.15 + 0.85 * s.stride);
  const pulse = Math.sin(s.phase);
  if (prev < 0.9 && pulse >= 0.9 && s.stride > 0.6) onPulse();
  if (moving) {
    const pull = Math.max(0, pulse);
    let v = s.R * (s.mode === 'approach' ? 0.15 : 0.07) * s.pSpeed * s.stride * (0.15 + 0.85 * pull * pull);
    v *= clamp(1 - Math.abs(wrap(aim - s.moveDir)) / 1.6, 0.15, 1);
    v *= clamp(dist / (s.R * 0.6), 0.25, 1);
    const cx = Math.cos(s.moveDir), m = s.R * 1.15;
    if (Math.abs(cx) > 0.2) v *= clamp((cx > 0 ? env.w - m - s.x : s.x - m) / s.R, 0.1, 1);
    s.x += cx * v * dt;
    s.z += Math.sin(s.moveDir) * v * dt * SQ;
  }
  if (s.stride > 0.25) {
    const step = TAU / ARMS, rel = wrap(s.moveDir - s.heading), off = rel - step * Math.round(rel / step);
    s.heading += clamp(off, -0.015 * dt, 0.015 * dt) * s.stride;
  }
  clampPos(s, env);
}