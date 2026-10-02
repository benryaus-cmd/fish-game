import { TAU, type Fish } from '@/utils/fishModel';

export interface FishBounds { w: number; h: number; floorY: number }

const PI = Math.PI;
const BURST = 1.2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function pickTarget(f: Fish, b: FishBounds, ahead: boolean) {
  const L = f.L, tr = f.tr;
  const m = Math.min(L * 1.9, b.w * 0.3);
  const lo = m, hi = Math.max(m + 1, b.w - m);
  let tx = lo + Math.random() * (hi - lo);
  if (ahead) {
    const fLo = f.dir === 1 ? Math.min(hi, f.x + L * 1.5) : lo;
    const fHi = f.dir === 1 ? hi : Math.max(lo, f.x - L * 1.5);
    if (fHi - fLo > L * 0.5) tx = fLo + Math.random() * (fHi - fLo);
  }
  const top = L * 0.9, bot = Math.max(top + 1, b.floorY - L * 0.7);
  if (Math.random() < 0.18) f.prefY = clamp(f.pHeight + (Math.random() - 0.5) * 0.3, 0.08, 0.9);
  f.tx = tx;
  f.ty = top + (bot - top) * clamp(f.prefY + (Math.random() - 0.5) * 0.45, 0.05, 0.95);
  f.cruise = tr.cruiseMin + Math.random() * tr.cruiseRange;
  f.decide = (tr.decideMin + Math.random() * tr.decideRange) * f.pTurn;
  f.rest = Math.random() < tr.restChance * f.pRest ? (1.5 + Math.random() * 2.5) * f.pRest : 0;
  f.depthTarget = 0.99 + (Math.random() - 0.5) * tr.depthRange;
  // Lively species: occasional short, smooth burst of speed
  if (f.rest <= 0 && Math.random() < tr.burstChance) f.burst = BURST;
}

function turnTo(f: Fish, d: 1 | -1, b: FishBounds) {
  if (f.dir === d) return;
  f.dir = d;
  f.turnCool = f.tr.turnCool * f.pTurn;
  f.turnLift = (Math.random() - 0.5) * 0.5;
  if (!f.seek && (f.tx - f.x) * d < f.L * 1.5) pickTarget(f, b, true);
}

/** Calm wandering with early, curved pseudo-3D turns before the screen edges. */
export function updateFish(f: Fish, dtRaw: number, b: FishBounds, speedMul: number, onStroke: (s: number) => void) {
  const dt = Math.min(dtRaw, 0.05);
  if (dt <= 0) return;
  const L = f.L, tr = f.tr;
  f.decide -= dt; f.turnCool -= dt;
  if (f.rest > 0) f.rest -= dt;
  if (f.burst > 0) f.burst = Math.max(0, f.burst - dt);
  if (!f.seek && (f.decide <= 0 || Math.abs(f.tx - f.x) < L * 0.7)) pickTarget(f, b, Math.random() < 0.6);

  const edge = Math.min(L * tr.edge, b.w * 0.34);
  const behind = (f.tx - f.x) * f.dir < -L * 0.6;
  if (f.seek) {
    // Food behind: only start a new turn once the previous one has fully settled
    const settled = Math.abs(f.yawBody - (f.dir === 1 ? 0 : PI)) < 0.25;
    if (behind && settled && f.turnCool <= 1.4) turnTo(f, f.dir === 1 ? -1 : 1, b);
  } else if (f.dir === 1 && f.x > b.w - edge) turnTo(f, -1, b);
  else if (f.dir === -1 && f.x < edge) turnTo(f, 1, b);
  else if (f.turnCool <= 0 && f.rest <= 0 && behind) turnTo(f, f.dir === 1 ? -1 : 1, b);

  // Head leads the turn, body follows, tail follows last (species-specific timing)
  const goal = f.dir === 1 ? 0 : PI;
  const k = tr.turnK, c = 2 * Math.sqrt(k) * 0.95;
  f.yawVel += ((goal - f.yaw) * k - f.yawVel * c) * dt;
  f.yaw = clamp(f.yaw + f.yawVel * dt, -0.04, PI + 0.04);
  f.yawBody += (f.yaw - f.yawBody) * ease(tr.bodyEase, dt);
  f.yawTail += (f.yawBody - f.yawTail) * ease(tr.tailEase, dt);
  const turning = Math.sin(clamp(f.yawBody, 0, PI));

  const edgeDist = f.dir === 1 ? b.w - f.x : f.x;
  let want = (f.rest > 0 ? 0.16 : f.cruise) * L * speedMul;
  if (f.burst > 0 && !f.seek && f.rest <= 0) want *= 1 + 0.7 * Math.sin(PI * (f.burst / BURST));
  want *= 1 - tr.turnSlow * turning;
  want *= clamp(edgeDist / (edge * 1.6), 0.45, 1);
  const prev = f.speed;
  f.speed += (want - f.speed) * ease(f.seek ? 1.3 : 0.9, dt);
  f.accel += ((f.speed - prev) / dt / L - f.accel) * ease(3, dt);

  const vx = f.speed * Math.cos(f.yawBody);
  const floorGap = f.seek ? 0.2 : 0.3;
  const top = L * 0.8, bot = Math.max(top + 1, b.floorY - L * (f.seek ? 0.2 : 0.55));
  f.wander += dt * tr.wanderRate;
  const lim = f.seek ? f.speed * 0.8 + L * 0.18 : f.speed * 0.4 + L * 0.05;
  let vyWant = clamp((f.ty - f.y) * (f.seek ? 0.8 : 0.3), -lim, lim) + Math.sin(f.wander) * L * tr.wanderAmp + turning * f.turnLift * L;
  if (f.y < top) vyWant += (top - f.y) * 1.2;
  if (f.y > bot) vyWant -= (f.y - bot) * 1.2;
  f.vy += (vyWant - f.vy) * ease(f.seek ? 1.6 : 0.9, dt);
  f.x += vx * dt;
  f.y += f.vy * dt;
  const hx = Math.min(L, b.w * 0.45);
  if (f.entering) {
    f.x = clamp(f.x, -L, b.w + L);
    if (f.x >= hx && f.x <= b.w - hx) f.entering = false;
  } else f.x = clamp(f.x, hx, b.w - hx);
  if (f.fade < 1) f.fade = Math.min(1, f.fade + dt / 1.4);
  f.y = clamp(f.y, L * 0.45, Math.max(L * 0.45, b.floorY - L * floorGap));

  const pitchWant = clamp(Math.atan2(-f.vy, Math.max(Math.abs(vx), L * 0.35)), -0.26, 0.26) * Math.abs(Math.cos(f.yawBody));
  f.pitch += (pitchWant - f.pitch) * ease(1.5, dt);
  f.depth += (f.depthTarget - f.depth) * ease(0.15, dt);

  // Tail beat & fins follow effort
  const norm = f.speed / L, push = Math.max(0, f.accel);
  const freq = (0.8 + norm * 1.8 + push * 1.5) * tr.freqMul;
  f.amp += (clamp(0.14 + tr.ampAdd + norm * 0.32 + push * 0.5 + turning * 0.16, 0.1, 0.62) - f.amp) * ease(2, dt);
  const before = Math.floor(f.phase / TAU);
  f.phase += TAU * freq * dt;
  if (Math.floor(f.phase / TAU) !== before) onStroke(f.amp);
  if (f.phase > TAU * 1000) f.phase -= TAU * 1000;
  f.finPhase += TAU * (0.55 + norm * 0.5) * tr.finRate * dt;
  if (f.finPhase > TAU * 1000) f.finPhase -= TAU * 1000;
  f.finBoost += (clamp(f.accel * 0.8 + turning * 0.15, -0.15, 0.3) - f.finBoost) * ease(2, dt);
}