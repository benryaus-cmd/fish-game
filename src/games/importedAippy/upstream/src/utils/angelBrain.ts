import { consumeFood, type Food } from '@/utils/fishFood';
import { angelSize, setZone, Z, type AngelEnv, type Angelfish } from '@/utils/angelModel';
import { M, mouthWorld } from '@/utils/angelProject';
import { animate, stepTurn, turnBusy, turnK } from '@/utils/angelTurn';
import { canFeed, noteEat } from '@/utils/feedGate';

/** Movement speed multiplier (2x the original glide). */
const SP = 2;

export interface AngelHooks { onEat: (x: number, y: number, a: Angelfish) => void; onSwim: () => void }
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const usable = (p: Food, a: Angelfish) => !p.eaten && !p.expired && !p.landed && p.alpha > 0.4 && (p.owner === -1 || p.owner === a.id);
const inBand = (p: Food, a: Angelfish) => p.y > Z.y0 - a.S * 0.5 && p.y < Z.y1 + a.S * 0.35;

function release(a: Angelfish) { if (a.target && a.target.owner === a.id) a.target.owner = -1; a.target = null; }
function hover(a: Angelfish, short: boolean) { a.mode = 'hover'; a.t = 0; a.dur = (short ? rnd(1.2, 2.5) : rnd(2.5, 6)) * a.pIdle; a.ax = a.x; a.ay = a.y; }
/** Hysteresis: only request a turn when the goal is clearly behind. */
function face(a: Angelfish, dx: number, th: number) { if (dx * a.want < -th) a.want = dx > 0 ? 1 : -1; }

function cruise(a: Angelfish, env: AngelEnv, hooks: AngelHooks) {
  const range = Z.y1 - Z.y0, low = Math.random() < 0.15;
  a.ty = clamp(low ? Z.y0 + range * rnd(0.8, 1) : Z.y0 + range * (a.pDepth + rnd(-0.22, 0.22)), Z.y0, Z.y1);
  const dir = Math.random() < 0.7 ? a.face : -a.face, reach = env.w * rnd(0.22, 0.5);
  a.tx = clamp(a.x + dir * reach, Z.x0, Z.x1);
  if (Math.abs(a.tx - a.x) < a.S * 0.6) a.tx = clamp(a.x - dir * reach, Z.x0, Z.x1);
  face(a, a.tx - a.x, a.S * 0.3);
  a.mode = 'cruise'; a.t = 0; a.dur = rnd(9, 16);
  hooks.onSwim();
}

/** Early wall detection: request the turn well before the edge, then glide away. */
function edges(a: Angelfish, env: AngelEnv) {
  if (a.mode !== 'cruise' && a.mode !== 'hover') return;
  const m = a.S * 2.3;
  const away = a.want > 0 && Z.x1 - a.x < m ? -1 : a.want < 0 && a.x - Z.x0 < m ? 1 : 0;
  if (away === 0) return;
  a.want = away;
  if (a.mode === 'cruise') { a.tx = clamp(a.x + away * env.w * rnd(0.25, 0.4), Z.x0, Z.x1); a.t = 0; }
  else a.ax = clamp(a.ax + away * a.S * 0.3, Z.x0, Z.x1);
}

function scan(a: Angelfish, food: Food[]) {
  a.scan = rnd(0.25, 0.5) * a.pReact;
  if (!canFeed(a)) return;
  mouthWorld(a);
  let best: Food | null = null, bd = a.S * 4.5;
  for (const p of food) {
    if (!usable(p, a) || !inBand(p, a)) continue;
    const d = Math.hypot(p.x - M.x, p.y - M.y);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  a.target = best; best.owner = a.id;
  a.mode = 'approach'; a.t = 0;
}

/** Notice → full turn if behind → calm approach → slow → head angles → small bite → consume once. */
function feed(a: Angelfish, food: Food[], dt: number, hooks: AngelHooks) {
  const p = a.target;
  if (a.mode === 'hover' || a.mode === 'cruise') { a.scan -= dt; if (a.scan <= 0 && a.fade >= 1) scan(a, food); return; }
  if (a.mode === 'approach') {
    if (!p || !usable(p, a) || !inBand(p, a) || !canFeed(a) || a.t > 14) { release(a); hover(a, true); return; }
    const px = p.x + p.vx * 0.5, py = p.y + p.vy * 0.6;
    face(a, px - a.x, a.S * 0.15);
    a.tx = clamp(px - a.want * a.S * 0.55, Z.x0, Z.x1); a.ty = clamp(py + a.S * 0.01, Z.y0, Z.y1);
    mouthWorld(a);
    a.aim += (clamp((p.y - M.y) / (a.S * 0.3), -1, 1) * 0.12 - a.aim) * ease(2, dt);
    if (a.face === a.want && !turnBusy(a) && (p.x - a.x) * a.face > 0 && Math.hypot(p.x - M.x, p.y - M.y) < a.S * 0.1) { a.mode = 'eat'; a.t = 0; a.ate = false; }
    return;
  }
  const t = a.t;
  if (!a.ate) {
    if (!p || p.eaten || p.expired) { release(a); a.gape = 0; hover(a, true); return; }
    mouthWorld(a);
    const k = ease(t < 0.25 ? 3 : 14, dt);
    p.x += (M.x - p.x) * k; p.y += (M.y - p.y) * k; p.vx = 0; p.vy = 0;
    if (t >= 0.32) { a.ate = true; a.target = null; if (consumeFood(p)) { hooks.onEat(M.x, M.y, a); noteEat(a); } }
  }
  a.gape = t < 0.3 ? smooth(t / 0.3) : t < 0.42 ? 1 : 1 - smooth((t - 0.42) / 0.4);
  a.recoil = t > 0.32 && t < 0.85 ? Math.sin((Math.PI * (t - 0.32)) / 0.53) * 0.035 : 0;
  if (t >= 1.1) { a.gape = 0; a.recoil = 0; a.aim = 0; hover(a, false); }
}

/** Slows into the turn, carries momentum along the swinging head (curved arc), then re-accelerates. */
function move(a: Angelfish, dt: number) {
  const k = turnK(a), eat = a.mode === 'eat', head = Math.cos(a.yh);
  const mul = a.mode === 'approach' ? 0.85 : a.mode === 'hover' ? 0.45 : 1;
  const vmax = a.S * 0.38 * SP * a.pSpeed * mul * (1 - 0.6 * k), vymax = a.S * 0.16 * SP * a.pSpeed;
  let wx = eat ? (a.t < 0.32 ? a.face * a.S * 0.05 : 0) : clamp((a.tx - a.x) * 0.5 * SP, -vmax, vmax);
  if (!eat && wx * head < 0) wx *= 0.1;
  if (!eat) wx += k * a.S * 0.09 * SP * head;
  const wy = eat ? 0 : clamp((a.ty - a.y) * 0.5 * SP, -vymax, vymax) - k * a.S * 0.05 * SP * a.arc;
  a.vx += (wx - a.vx) * ease(eat ? 4 : 1.2, dt);
  a.vy += (wy - a.vy) * ease(eat ? 4 : 0.9, dt);
  a.x = clamp(a.x + a.vx * dt, Z.x0, Z.x1);
  a.y += a.vy * dt;
  if (a.y > Z.y1) a.y += (Z.y1 - a.y) * ease(3, dt); else if (a.y < Z.y0) a.y += (Z.y0 - a.y) * ease(3, dt);
}

export function updateAngel(a: Angelfish, food: Food[], dtRaw: number, env: AngelEnv, hooks: AngelHooks) {
  const dt = Math.min(dtRaw, 0.05);
  a.clock += dt; a.t += dt;
  a.S = angelSize(env.L, a.size);
  if (a.fade < 1) a.fade = Math.min(1, a.fade + dt / 2.6);
  setZone(a, env);
  feed(a, food, dt, hooks);
  if (a.mode === 'hover') {
    a.tx = clamp(a.ax + Math.sin(a.clock * 0.21 + a.ph * 2) * a.S * 0.12, Z.x0, Z.x1);
    a.ty = clamp(a.ay + Math.sin(a.clock * 0.29 + a.ph) * a.S * 0.1, Z.y0, Z.y1);
    if (a.t > a.dur && a.fade >= 1) cruise(a, env, hooks);
  } else if (a.mode === 'cruise' && (a.t > a.dur || Math.hypot(a.tx - a.x, a.ty - a.y) < a.S * 0.15)) {
    if (Math.random() < 0.55) hover(a, false); else cruise(a, env, hooks);
  }
  edges(a, env);
  stepTurn(a, dt);
  move(a, dt);
  animate(a, dt);
}