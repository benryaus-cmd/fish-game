import { consumeFood, type Food } from '@/utils/fishFood';
import { clawGeom, G, P, toLocal, toWorld, type Crab, type CrabEnv } from '@/utils/crabModel';
import { startIdle } from '@/utils/crabPose';
import { canFeed, noteEat } from '@/utils/feedGate';
import { ARM1, ARM2, EDGE, GRIP, MOUTH_A, MOUTH_Y, REACH_A, REACH_OFF, SHOULDER_X, SHOULDER_Y } from '@/utils/crabRig';

export type CrabBite = (x: number, y: number, c: Crab) => void;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const CR = Math.cos(REACH_A), SR = Math.sin(REACH_A);

const valid = (p: Food, c: Crab) => !p.eaten && !p.expired && p.alpha > 0.4 && (p.owner === -1 || p.owner === c.id);
/** Crabs only care about food resting on, or sinking close to, the sand. */
const low = (p: Food, env: CrabEnv) => p.landed || p.y > env.sandTop - env.L * 0.8;

function choose(c: Crab, food: Food[], env: CrabEnv): Food | null {
  const radius = env.w * 0.45 * c.pReact;
  let best: Food | null = null, bc = Infinity;
  for (const p of food) {
    if (!valid(p, c) || !low(p, env)) continue;
    const d = Math.abs(p.x - c.x);
    if (d > radius) continue;
    const cost = d + (p.landed ? 0 : c.S * 0.6) + ((p.x - c.x) * c.dir < 0 ? c.S * 0.8 : 0);
    if (cost < bc) { bc = cost; best = p; }
  }
  return best;
}
function claim(c: Crab, p: Food | null) {
  if (c.target && c.target !== p && c.target.owner === c.id) c.target.owner = -1;
  c.target = p;
  if (p) { p.owner = c.id; p.stay = Math.max(p.stay, p.rest + 8); }
}
function giveUp(c: Crab) {
  claim(c, null); c.held = false;
  if (c.mode === 'turn') c.resume = 'walk'; else startIdle(c, true);
}

/** Scan → side-walk over → (wait for sinking food) → reach, pinch, curl up to the mouth, eat, lower claw. */
export function updateCrabFeeding(c: Crab, food: Food[], dt: number, env: CrabEnv, onBite: CrabBite) {
  const S = c.S, m = S * EDGE, p = c.target;
  if (p && !c.held && (!valid(p, c) || (c.mode !== 'eat' && !canFeed(c)))) { giveUp(c); return; }
  if (!p && (c.mode === 'approach' || c.mode === 'wait' || (c.mode === 'eat' && !c.bitten))) { c.held = false; startIdle(c, true); return; }
  if ((c.mode === 'walk' || c.mode === 'idle') && !p) {
    c.scan -= dt;
    if (c.scan > 0) return;
    c.scan = (0.2 + Math.random() * 0.2) / c.pReact;
    const n = canFeed(c) ? choose(c, food, env) : null;
    if (n) { claim(c, n); c.side = n.x >= c.x ? 1 : 0; c.mode = 'approach'; c.t = 0; }
    return;
  }
  if (!p && c.mode !== 'eat') return;
  if (p && (c.mode === 'approach' || c.mode === 'wait')) {
    if ((p.x - c.x) * (c.side ? 1 : -1) < -0.15 * S) c.side = c.side ? 0 : 1;
    const sg = c.side ? 1 : -1;
    c.tx = clamp(p.x - sg * REACH_OFF * S, m, Math.max(m, env.w - m));
    const ground = p.landed ? p.y : env.surfaceY(p.x);
    c.laneT = clamp((ground + 0.06 * S - env.surfaceY(c.x)) / Math.max(1, env.span * 0.5), 0.02, 0.7);
    toLocal(c, p.x, p.y);
    const wx = P.x - sg * CR * GRIP, wy = P.y - SR * GRIP;
    const reach = P.x * sg > 0.3 && P.y > -0.05 && P.y < 0.42 && Math.hypot(wx - sg * SHOULDER_X, wy - SHOULDER_Y) < (ARM1 + ARM2) * 0.96;
    const slow = Math.abs(c.vx) < 0.12 * S;
    if (reach && slow) { c.mode = 'eat'; c.t = 0; c.bitten = false; c.held = false; }
    else if (Math.abs(c.x - c.tx) < 0.08 * S && slow) { if (c.mode !== 'wait') { c.mode = 'wait'; c.t = 0; } }
    else if (c.mode === 'wait') c.mode = 'approach';
    if (c.t > 14) giveUp(c);
    return;
  }
  if (c.mode !== 'eat') return;
  const t = c.t, sg = c.side ? 1 : -1;
  const mx = -sg * Math.cos(MOUTH_A) * GRIP, my = MOUTH_Y - Math.sin(MOUTH_A) * GRIP;
  if (t < 0.7) {
    if (p && !c.held) { toLocal(c, p.x, p.y); c.rx = P.x - sg * CR * GRIP; c.ry = P.y - SR * GRIP; }
    c.ra = REACH_A; c.rw = smooth(t / 0.36);
    c.ro = t < 0.5 ? 0.15 + 0.6 * smooth(t / 0.38) : 0.75 * (1 - smooth((t - 0.5) / 0.16));
    if (!c.held && t >= 0.64 && p) {
      c.held = true; c.gx0 = c.rx; c.gy0 = c.ry;
      p.landed = true; p.vx = 0; p.vy = 0; p.z = 1.04; p.rest = 0; p.stay = 99;
    }
  } else if (t < 1.35) {
    const u = smooth((t - 0.7) / 0.65);
    c.rx = c.gx0 + (mx - c.gx0) * u;
    c.ry = c.gy0 + (my - c.gy0) * u - Math.sin(Math.PI * u) * 0.06;
    c.ra = REACH_A + (MOUTH_A - REACH_A) * u; c.ro = 0; c.rw = 1;
  } else if (t < 1.95) {
    if (!c.bitten) {
      c.bitten = true; c.held = false;
      if (p && consumeFood(p)) { toWorld(c, 0, MOUTH_Y, 1); onBite(P.x, P.y, c); noteEat(c); }
      claim(c, null);
    }
    const k = (t - 1.35) / 0.6;
    c.chew = Math.abs(Math.sin(k * 12)) * (1 - k);
    c.rx = mx + sg * 0.01 * Math.sin(t * 10); c.ry = my; c.ra = MOUTH_A; c.ro = 0.08; c.rw = 1;
  } else if (t < 2.45) {
    c.rw = 1 - smooth((t - 1.95) / 0.5);
  } else {
    c.rw = 0;
    startIdle(c, true);
  }
}

/** Keeps a grabbed pellet between the pincer fingers until the bite moment. */
export function syncHeld(c: Crab) {
  const p = c.target;
  if (!c.held || !p) return;
  clawGeom(c, c.side);
  toWorld(c, G.gx, G.gy);
  p.x = P.x; p.y = P.y;
}