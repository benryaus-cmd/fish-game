import { consumeFood, type Food } from '@/utils/fishFood';
import { setZone, Z, type SeaEnv, type Seahorse } from '@/utils/seahorseModel';
import { snoutTip, TIPW } from '@/utils/seahorseGeom';
import { moveDir, stepTurn, turnAmt } from '@/utils/seahorseTurn';
import { animate } from '@/utils/seahorseMotion';
import { canFeed, noteEat } from '@/utils/feedGate';

/** Movement speed multiplier (2x the original drift). */
const SP = 2;

export type SeaEat = (x: number, y: number, s: Seahorse) => void;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const usable = (p: Food, s: Seahorse) => !p.eaten && !p.expired && !p.landed && p.alpha > 0.4 && (p.owner === -1 || p.owner === s.id);
const inBand = (p: Food, s: Seahorse) => p.y > Z.y0 - s.H * 0.45 && p.y < Z.y1 - s.H * 0.24;
const tilt = (p: Food, s: Seahorse) => clamp((p.y - TIPW.y) / (s.H * 0.3), -1, 1) * 0.2;

function release(s: Seahorse) {
  if (s.target && s.target.owner === s.id) s.target.owner = -1;
  s.target = null;
}
function hover(s: Seahorse, short: boolean) {
  s.mode = 'hover'; s.t = 0; s.dur = (short ? rnd(1.5, 3) : rnd(3, 8)) * s.pIdle; s.ax = s.x; s.ay = s.y;
}
/** Hysteresis: only ask for a turn when the goal is clearly on the other side. */
function face(s: Seahorse, dx: number, th: number) { if (dx * s.want < -th) s.want = dx > 0 ? 1 : -1; }

/** Mostly vertical repositioning near its preferred height; short sideways drift, usually forward. */
function drift(s: Seahorse, env: SeaEnv, onFlutter: () => void) {
  const range = Z.y1 - Z.y0, home = Z.y0 + range * s.homeY;
  s.ty = clamp(s.y + (home - s.y) * 0.4 + rnd(-1, 1) * range * 0.35, Z.y0, Z.y1);
  const lo = Z.x0 + s.H * 0.5, hi = Math.max(lo, Z.x1 - s.H * 0.5);
  const reach = Math.min(env.w * 0.16, s.H * 1.5) * s.roam;
  s.tx = clamp(s.x + rnd(-0.4, 1) * s.face * reach + (s.homeX * env.w - s.x) * 0.25, lo, hi);
  face(s, s.tx - s.x, s.H * 0.3);
  s.mode = 'drift'; s.t = 0; s.dur = rnd(8, 14);
  onFlutter();
}

/** Starts turning well before an edge: stop, rotate away calmly, then drift off. */
function edges(s: Seahorse) {
  if (s.mode !== 'hover' && s.mode !== 'drift') return;
  const m = s.H * 1.0;
  const away: 0 | 1 | -1 = s.face > 0 && Z.x1 - s.x < m ? -1 : s.face < 0 && s.x - Z.x0 < m ? 1 : 0;
  if (away === 0 || s.want === away) return;
  s.want = away;
  if (s.mode === 'drift') hover(s, true);
}

function scan(s: Seahorse, food: Food[]) {
  s.scan = rnd(0.3, 0.55) * s.pReact;
  if (!canFeed(s)) return;
  snoutTip(s);
  let best: Food | null = null, bd = s.H * 2.4;
  for (const p of food) {
    if (!usable(p, s) || !inBand(p, s)) continue;
    const d = Math.hypot(p.x - TIPW.x, p.y - TIPW.y);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  s.target = best; best.owner = s.id;
  s.mode = 'approach'; s.t = 0; s.dur = rnd(0.12, 0.35) * s.pReact;
}

/** Suction curve: wind-up → quick snap → gentle recoil → settle. */
function suckAt(t: number) {
  if (t < 0.4) return smooth(t / 0.4) * 0.45;
  if (t < 0.58) return 0.45 + 0.55 * smooth((t - 0.4) / 0.18);
  const r = clamp((t - 0.58) / 0.8, 0, 1);
  return 1 - smooth(r) - 0.18 * Math.sin(Math.PI * r);
}

/** Notice → turn (full rotation if behind) → drift in → align snout → head-forward suction → consume once → recover. */
function feed(s: Seahorse, food: Food[], dt: number, onEat: SeaEat) {
  const p = s.target;
  if (s.mode === 'hover' || s.mode === 'drift') {
    s.scan -= dt;
    if (s.scan <= 0 && s.fade >= 1) scan(s, food);
    return;
  }
  if (s.mode === 'approach') {
    if (!p || !usable(p, s) || !inBand(p, s) || !canFeed(s) || s.t > 12) { release(s); hover(s, true); return; }
    const px = p.x + p.vx * 0.4, py = p.y + p.vy * 0.8;
    face(s, px - s.x, s.H * 0.08);
    s.tx = clamp(px - s.face * s.H * 0.31, Z.x0, Z.x1);
    s.ty = clamp(py + s.H * 0.29, Z.y0, Z.y1);
    snoutTip(s);
    s.aim += (tilt(p, s) - s.aim) * ease(2.5, dt);
    const ahead = (p.x - s.x) * s.face > 0;
    if (s.turnP >= 1 && ahead && Math.hypot(p.x - TIPW.x, p.y - TIPW.y) < s.H * 0.1) { s.mode = 'eat'; s.t = 0; s.ate = false; }
    return;
  }
  const t = s.t;
  if (!s.ate) {
    if (!p || p.eaten || p.expired) { release(s); hover(s, true); return; }
    snoutTip(s);
    const k = ease(t < 0.4 ? 2.5 : 18, dt);
    p.x += (TIPW.x - p.x) * k; p.y += (TIPW.y - p.y) * k; p.vx = 0; p.vy = 0;
    s.aim += (tilt(p, s) - s.aim) * ease(4, dt);
    if (t >= 0.58) { s.ate = true; s.target = null; if (consumeFood(p)) { onEat(TIPW.x, TIPW.y, s); noteEat(s); } }
  }
  s.suck = suckAt(t);
  if (t >= 1.4) { s.suck = 0; hover(s, false); }
}

function move(s: Seahorse, dt: number) {
  const eat = s.mode === 'eat', ta = turnAmt(s), md = moveDir(s);
  const mul = s.mode === 'approach' ? (s.t < s.dur ? 0.3 : 1.4) : 1;
  const sh = s.H * 0.1 * SP * s.pSpeed * mul * (1 - 0.7 * ta), sv = s.H * 0.12 * SP * s.pSpeed * mul;
  let wx = eat ? 0 : clamp((s.tx - s.x) * 0.7 * SP, -sh, sh);
  if (wx * md < 0) wx *= 0.15;
  const wy = eat ? 0 : clamp((s.ty - s.y) * 0.7 * SP, -sv, sv) - ta * s.H * 0.03;
  s.vx += (wx - s.vx) * ease(eat ? 4 : 1.3, dt);
  s.vy += (wy - s.vy) * ease(eat ? 4 : 1.15, dt);
  const edge = s.vx > 0 ? (Z.x1 - s.x) / (s.H * 0.5) : (s.x - Z.x0) / (s.H * 0.5);
  s.x = clamp(s.x + s.vx * clamp(edge, 0, 1) * dt, Z.x0, Z.x1);
  s.y += s.vy * dt;
  if (s.y > Z.y1) s.y += (Z.y1 - s.y) * ease(4, dt); else if (s.y < Z.y0) s.y += (Z.y0 - s.y) * ease(4, dt);
  s.y = Math.min(s.y, Z.y1 + s.H * 0.04);
}

export function updateSeahorse(s: Seahorse, food: Food[], dtRaw: number, env: SeaEnv, onEat: SeaEat, onFlutter: () => void) {
  const dt = Math.min(dtRaw, 0.05);
  s.clock += dt; s.t += dt;
  if (s.fade < 1) s.fade = Math.min(1, s.fade + dt / 2.2);
  setZone(s, env);
  feed(s, food, dt, onEat);
  if (s.mode === 'hover') {
    s.tx = clamp(s.ax + Math.sin(s.clock * 0.23 + s.ph * 2) * s.H * 0.05, Z.x0, Z.x1);
    s.ty = clamp(s.ay + Math.sin(s.clock * 0.31 + s.ph) * s.H * 0.06, Z.y0, Z.y1);
    if (s.t > s.dur && s.fade >= 1 && s.turnP >= 1) drift(s, env, onFlutter);
  } else if (s.mode === 'drift' && (s.t > s.dur || Math.hypot(s.tx - s.x, s.ty - s.y) < s.H * 0.06)) hover(s, false);
  edges(s);
  stepTurn(s, dt);
  move(s, dt);
  animate(s, dt);
}