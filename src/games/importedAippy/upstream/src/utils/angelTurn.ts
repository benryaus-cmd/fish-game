import { REST, restYaw, type Angelfish } from '@/utils/angelModel';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);
/** ease-in → fluid middle → ease-out */
const smoother = (t: number) => { const u = clamp(t, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };

/** Timeline offsets (fraction of turn duration): head leads, torso, tail base, tail fin, fin tips trail. */
const LEAD = [0.16, 0, -0.13, -0.26, -0.36];
/** Per-part smoothing springs; fin tips are under-damped so they settle with a soft overshoot. */
const W = [16, 14, 12, 10.5, 6.8], ZT = [1, 1, 1, 0.92, 0.55];
const SR = Math.sin(REST);

/** 0 in profile → 1 when the torso faces the viewer. */
export const turnK = (a: Angelfish) => clamp((Math.sin(a.yb) - SR) / (1 - SR), 0, 1);
/** Turn still running or head not yet settled into its profile. */
export const turnBusy = (a: Angelfish) => a.turning || Math.abs(a.yaw[0] - restYaw(a.face)) > 0.12;

function begin(a: Angelfish, spd: number) {
  a.face = a.want;
  a.q0 = a.yaw[1]; a.q1 = restYaw(a.face); a.tt = 0;
  const span = Math.abs(a.q1 - a.q0) / (Math.PI - 2 * REST);
  a.td = (0.82 - 0.24 * spd) * a.pTurn * Math.max(0.45, span);
  a.turning = true; a.hold = 1.1 * a.pTurn;
  a.arc = Math.random() < 0.5 ? 1 : -1;
}

/**
 * One continuous turn progress drives everything (left profile → three-quarter → near-front →
 * opposite three-quarter → opposite profile). Each body region samples the same eased timeline at
 * a different time offset, then a light spring smooths it, so redirects never snap.
 * A new request is only accepted once the current turn is at least 60% through.
 */
export function stepTurn(a: Angelfish, dt: number) {
  // Normalised to the doubled cruise speed so turns keep the same readable duration
  const spd = clamp(Math.hypot(a.vx, a.vy) / (a.S * 0.8), 0, 1);
  a.hold -= dt;
  const prog = a.turning ? a.tt / a.td : 1;
  if (a.want !== a.face && a.hold <= 0 && prog > 0.6) begin(a, spd);
  if (a.turning) { a.tt += dt; if (a.tt > a.td * 1.45) a.turning = false; }
  const n = dt > 0.02 ? 2 : 1, h = dt / n, rest = restYaw(a.face);
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < 5; i++) {
      const goal = a.turning ? a.q0 + (a.q1 - a.q0) * smoother((a.tt + LEAD[i] * a.td) / a.td) : rest;
      const w = W[i];
      a.yawV[i] += (w * w * (goal - a.yaw[i]) - 2 * ZT[i] * w * a.yawV[i]) * h;
      a.yaw[i] = clamp(a.yaw[i] + a.yawV[i] * h, -0.3, Math.PI + 0.3);
    }
  }
  a.yh = a.yaw[0]; a.yb = a.yaw[1]; a.yp = a.yaw[2]; a.yt = a.yaw[3]; a.yf = a.yaw[4];
  a.bend += (clamp(-a.yawV[1] * 0.2, -0.5, 0.5) - a.bend) * ease(4, dt);
}

/** Calm body, lively fins: flutter phases, gentle tail propulsion and lagged fin drag. */
export function animate(a: Angelfish, dt: number) {
  const c = Math.cos(a.yb), k = turnK(a), sp = Math.min(0.6, Math.hypot(a.vx, a.vy) / a.S);
  a.finPh += dt * (1.9 + sp * 2.4);
  a.tailPh += dt * (2.1 + sp * 4.2 + k * 1.2);
  a.tailAmp += (0.1 + sp * 0.55 + k * 0.08 - a.tailAmp) * ease(1.6, dt);
  a.drag += (clamp((a.vx * c) / a.S, -0.4, 0.8) * 1.2 - a.drag) * ease(2.2, dt);
  a.lift += (clamp(a.vy / a.S, -0.6, 0.6) * 1.2 - a.lift) * ease(2.2, dt);
  a.sway = Math.sin(a.clock * 1.1 + a.ph) * 0.035 * (1 - k * 0.7);
  a.bob = Math.sin(a.clock * 0.6 + a.ph) * a.S * 0.02;
  const pitch = -clamp(a.vy / (a.S * 0.5), -1, 1) * 0.14 * c + a.aim * c;
  a.rot += (pitch - a.rot) * ease(2, dt);
}