import type { Crab, CrabEnv } from '@/utils/crabModel';
import { FOOT_X, FOOT_Y } from '@/utils/crabRig';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const T = { x: 0, y: 0 };
const ERR = new Float32Array(8);
/** Diagonal gait groups — 0: L1 L3 R2 R4, 1: L2 L4 R1 R3. Each group always has two feet per side down. */
const group = (i: number) => ((i >> 1) + (i & 1)) & 1;

/** Stance spot (world) for leg k on side s, pushed ahead by `lead` so steps land where the body is heading. */
function home(c: Crab, env: CrabEnv, k: number, s: number, lead: number) {
  const sg = s ? 1 : -1, a = Math.abs(c.yaw), lx = sg * FOOT_X[k];
  const sq = lx * c.yaw > 0 ? 1 - 0.22 * a : 1 + 0.08 * a;
  T.x = c.x + (lx * sq + c.yaw * 0.05) * c.S + lead;
  T.y = env.surfaceY(T.x) + c.lane * env.span * 0.5 + FOOT_Y[k] * c.S;
}

function initFeet(c: Crab, env: CrabEnv) {
  c.feet = [];
  for (let i = 0; i < 8; i++) {
    home(c, env, i >> 1, i & 1, 0);
    c.feet.push({ x: T.x, y: T.y, sx: T.x, sy: T.y, q: -1, wait: 0, dur: 0.25, lift: 0 });
  }
}

/**
 * Procedural stepping: planted feet never move in the world (zero sliding).
 * Only one diagonal group is ever airborne, so the shell is always carried. Step rate follows body speed.
 */
export function updateFeet(c: Crab, env: CrabEnv, dt: number, onStep: () => void) {
  if (c.feet.length !== 8) initFeet(c, env);
  const S = c.S, sp = Math.abs(c.vx);
  const tsw = clamp(0.32 - (0.25 * sp) / S, 0.18, 0.32);
  const lead = clamp(c.vx * tsw, -0.08 * S, 0.08 * S);
  let busy = false, landed = false, swing = 0;
  for (let i = 0; i < 8; i++) {
    const f = c.feet[i];
    if (f.q < 0) continue;
    if (f.wait > 0) { f.wait -= dt; busy = true; continue; }
    f.q = Math.min(1, f.q + dt / f.dur);
    home(c, env, i >> 1, i & 1, lead);
    const e = smooth(f.q), arc = Math.sin(Math.PI * f.q);
    f.x = f.sx + (T.x - f.sx) * e;
    f.y = f.sy + (T.y - f.sy) * e;
    f.lift = arc * (0.04 + 0.025 * c.gait) * S;
    if (arc > swing) swing = arc;
    if (f.q >= 1) { f.q = -1; f.lift = 0; landed = true; } else busy = true;
  }
  c.swing = swing;
  if (landed && !busy && c.fade > 0.5 && c.gait > 0.15) onStep();
  if (busy) return;
  const thr = (0.02 + 0.05 * c.gait) * S;
  let e0 = 0, e1 = 0;
  for (let i = 0; i < 8; i++) {
    const f = c.feet[i];
    home(c, env, i >> 1, i & 1, lead);
    const err = Math.hypot(T.x - f.x, (T.y - f.y) * 1.4);
    ERR[i] = err;
    if (group(i)) e1 = Math.max(e1, err); else e0 = Math.max(e0, err);
  }
  let g = e0 >= e1 ? 0 : 1;
  if (g === c.lastGroup && (g ? e0 : e1) > thr * 0.6) g = 1 - g; // keep strict alternation
  if ((g ? e1 : e0) <= thr) return;
  c.lastGroup = g;
  for (let i = 0; i < 8; i++) {
    const k = i >> 1, f = c.feet[i];
    if (group(i) !== g || ERR[i] < thr * 0.3) continue;
    f.q = 0; f.sx = f.x; f.sy = f.y;
    f.dur = tsw * (0.95 + 0.03 * k);
    f.wait = (3 - k) * 0.07 * tsw; // soft rear → front ripple within the group
  }
}