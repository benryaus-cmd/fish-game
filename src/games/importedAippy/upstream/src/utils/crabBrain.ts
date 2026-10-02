import type { Food } from '@/utils/fishFood';
import { crabScale, type Crab, type CrabEnv } from '@/utils/crabModel';
import { pickWander, startIdle, updatePose } from '@/utils/crabPose';
import { syncHeld, updateCrabFeeding, type CrabBite } from '@/utils/crabFeeding';
import { updateFeet } from '@/utils/crabFeet';
import { EDGE, GROUND, YAW } from '@/utils/crabRig';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

/** Come to a stop first, then ease the body orientation across while the feet re-plant. */
function startTurn(c: Crab, nd: number) {
  c.resume = c.mode; c.mode = 'turn'; c.t = 0;
  c.dur = (0.7 + Math.random() * 0.3) / Math.sqrt(c.pSpeed);
  c.yaw0 = c.yaw; c.dir = nd;
}

/** Sideways walking on the sand: eased speed, edge-aware slowing, idle pauses and weight-carrying legs. */
export function updateCrab(c: Crab, food: Food[], dtRaw: number, env: CrabEnv, onBite: CrabBite, onStep: () => void) {
  const dt = Math.min(dtRaw, 0.05);
  if (dt <= 0) return;
  c.S = crabScale(env.L, c.size) * (1 + c.lane * 0.08);
  const S = c.S, m = S * EDGE, hi = Math.max(m, env.w - m);
  c.t += dt; c.clock += dt;
  if (c.fade < 1) c.fade = Math.min(1, c.fade + dt / 1.3);
  if (c.fade >= 1) updateCrabFeeding(c, food, dt, env, onBite);
  let want = 0, turnK = 0;
  if (c.mode === 'walk' || c.mode === 'approach') {
    const dx = c.tx - c.x, need = dx >= 0 ? 1 : -1;
    if (Math.abs(dx) > 0.1 * S && need !== c.dir) {
      if (Math.abs(c.vx) < 0.03 * S) startTurn(c, need);
    } else {
      const edge = c.dir > 0 ? hi - c.x : c.x - m;
      const sp = S * 0.36 * c.pSpeed * env.speed * (c.mode === 'approach' ? 1.25 : 1);
      want = need * sp * smooth(Math.abs(dx) / S) * (0.3 + 0.7 * smooth(edge / (1.3 * S)));
      if (c.mode === 'walk' && Math.abs(dx) < 0.06 * S && Math.abs(c.vx) < 0.04 * S) startIdle(c);
    }
  } else if (c.mode === 'turn') {
    const p = clamp(c.t / c.dur, 0, 1);
    c.yaw = c.yaw0 + (c.dir * YAW - c.yaw0) * smooth(p);
    turnK = Math.sin(Math.PI * p);
    if (p >= 1) { c.mode = c.resume; c.t = 0; }
  } else if (c.mode === 'idle') {
    if (c.act === 'shift') want = Math.sin(c.t * 1.6 + c.seed) * S * 0.1 * Math.sin(Math.PI * clamp(c.t / c.dur, 0, 1));
    if (c.t > c.dur) pickWander(c, env);
  }
  const prev = c.vx;
  c.vx += (want - c.vx) * ease(Math.abs(want) > Math.abs(c.vx) ? 2.2 : 3, dt);
  c.ax += ((c.vx - prev) / dt - c.ax) * ease(6, dt);
  c.x = clamp(c.x + c.vx * dt, m, hi);
  if (c.mode !== 'turn') c.yaw += (c.dir * YAW - c.yaw) * ease(2, dt);
  c.lane += (c.laneT - c.lane) * ease(0.7, dt);
  const gt = clamp(Math.abs(c.vx) / (0.18 * S), 0, 1);
  c.gait += (gt - c.gait) * ease(gt > c.gait ? 4.5 : 3.2, dt);
  c.footY = env.surfaceY(c.x) + c.lane * env.span * 0.5;
  updateFeet(c, env, dt, onStep);
  const sl = (env.surfaceY(c.x + S * 0.5) - env.surfaceY(c.x - S * 0.5)) / S;
  // weight shift: lean slightly into travel, lag a touch behind acceleration
  const lean = clamp(c.vx / S, -1, 1) * 0.025 - clamp(c.ax / S, -2, 2) * 0.012;
  c.rot += (Math.atan(sl) * 0.5 + lean + turnK * 0.04 * c.dir - c.rot) * ease(5, dt);
  // crouch a touch while walking, rise gently with each push-off, breathe when still, dip while eating
  const hT = -0.014 * c.gait + c.swing * 0.01 * c.gait - 0.01 * turnK
    + Math.sin(c.clock * 1.2 + c.seed) * 0.004 * (1 - c.gait) - c.chew * 0.006 - (c.mode === 'eat' ? 0.01 : 0);
  c.bob += (hT - c.bob) * ease(9, dt);
  c.cx = c.x;
  c.cy = c.footY - (GROUND + c.bob) * S;
  updatePose(c, dt);
  syncHeld(c);
}