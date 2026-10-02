import { floorAt, margin, REST_H, type Shrimp, type ShrimpEnv } from '@/utils/shrimpModel';
import { turnAmt } from '@/utils/shrimpTurn';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);

/** Careful, short, mostly head-first movement close to the sand; tail-flick bursts glide out with drag. */
export function move(s: Shrimp, dt: number, env: ShrimpEnv) {
  const S = s.S, m = margin(S), fl = floorAt(env, s.x, S), top = fl - S * 1.15;
  if (s.mode === 'rest' || s.mode === 'walk') s.ty = fl;
  if (s.mode === 'flick') {
    if (s.kicked) { s.vx *= Math.exp(-3.2 * dt); s.vy *= Math.exp(-3 * dt); }
    else { s.vx += -s.vx * ease(6, dt); s.vy += -s.vy * ease(6, dt); }
  } else {
    const base = s.mode === 'walk' ? 0.32 : s.mode === 'approach' ? 0.5 : s.mode === 'eat' ? 0.15 : s.mode === 'rest' ? 0.25 : 0.4;
    const sp = base * S * s.pSpeed * (1 - 0.65 * turnAmt(s));
    let wx = clamp((s.tx - s.x) * 1.2, -sp, sp);
    if (wx * s.face < 0) wx *= 0.25;
    const wy = clamp((s.ty - s.y) * 1.4, -sp * 0.8, sp * 0.8);
    s.vx += (wx - s.vx) * ease(2.2, dt);
    s.vy += (wy - s.vy) * ease(2, dt);
  }
  s.x += s.vx * dt; s.y += s.vy * dt;
  const hi = Math.max(m, env.w - m);
  if (s.x < m) { s.x = m; s.vx = Math.max(0, s.vx); } else if (s.x > hi) { s.x = hi; s.vx = Math.min(0, s.vx); }
  if (s.y > fl) { s.y = fl; s.vy = Math.min(0, s.vy); } else if (s.y < top) { s.y = top; s.vy = Math.max(0, s.vy); }
}

/** Shared procedural animation values: legs, swimmerets, antennae, segments and tail all read from these. */
export function animate(s: Shrimp, dt: number, env: ShrimpEnv, onStep: () => void) {
  s.clock += dt;
  if (s.fade < 1) s.fade = Math.min(1, s.fade + dt / 2);
  s.gy = (env.surfaceY(s.x) - s.y) / s.S;
  const onFloor = s.gy < REST_H + 0.05, sp = Math.abs(s.vx) / s.S;
  s.ground += ((onFloor ? 1 : 0) - s.ground) * ease(5, dt);
  const air = s.mode === 'flick' || s.mode === 'hover' || !onFloor;
  s.swim += ((air ? 1 : 0.15) - s.swim) * ease(3, dt);
  s.stride += ((onFloor ? clamp(sp * 3, 0.15, 1) : 0) - s.stride) * ease(4, dt);
  s.step += dt * (onFloor ? 0.12 + sp * 2.4 : 0.05);
  s.wave += dt * (1 + 1.6 * s.swim);
  if (s.mode !== 'flick') {
    s.curl += (0.03 + 0.02 * Math.sin(s.clock * 0.7) - s.curl) * ease(2, dt);
    s.fan += (0.55 + 0.25 * s.swim - s.fan) * ease(2, dt);
  }
  const landed = s.target !== null && s.target.landed;
  const tt = s.mode === 'eat' || (s.mode === 'approach' && landed) ? (landed ? 0.2 : 0.08) : clamp((s.vy / s.S) * 0.35, -0.22, 0.22);
  s.tilt += (tt - s.tilt) * ease(2.5, dt);
  s.antA += dt * 0.9 * s.pAnt; s.antB += dt * 1.13 * s.pAnt;
  s.antTrail += (clamp((s.vx * s.face / s.S) * 1.4, -1.5, 1.5) - s.antTrail) * ease(2.2, dt);
  s.antAim += ((s.mode === 'approach' || s.mode === 'eat' ? 1 : 0) - s.antAim) * ease(2.5, dt);
  s.feed += ((s.mode === 'eat' && s.t < 1.6 ? 1 : 0) - s.feed) * ease(7, dt);
  s.feedPh += dt * 15;
  if (onFloor && s.stride > 0.3) {
    const k = Math.floor(s.step * 2);
    if (k !== s.lastStep) { s.lastStep = k; onStep(); }
  }
}