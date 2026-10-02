import type { Crab, CrabEnv, IdleAct } from '@/utils/crabModel';
import { EDGE, REST_A, REST_X, REST_Y } from '@/utils/crabRig';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ACTS: IdleAct[] = ['lift', 'pinch', 'eyes', 'groom', 'shift', 'eyes', 'pinch'];

/** Pause with an occasional, unhurried idle gesture. */
export function startIdle(c: Crab, short = false) {
  c.mode = 'idle'; c.t = 0;
  c.dur = (short ? rnd(0.8, 1.5) : rnd(2, 4.8)) * c.pIdle;
  c.act = short || Math.random() > 0.3 + 0.25 * c.pClaw ? 'none' : ACTS[Math.floor(Math.random() * ACTS.length)];
  c.actSide = Math.random() < 0.5 ? 0 : 1;
}

/** New stroll target around the crab's preferred floor area, always inside the screen. */
export function pickWander(c: Crab, env: CrabEnv) {
  const m = c.S * EDGE, hi = Math.max(m, env.w - m);
  let tx = c.home * env.w + rnd(-0.3, 0.3) * env.w;
  if (Math.abs(tx - c.x) < c.S * 0.8) tx = c.x + (Math.random() < 0.5 ? -1 : 1) * c.S * rnd(1, 2.5);
  c.tx = clamp(tx, m, hi);
  if (Math.random() < 0.35) c.laneT = rnd(0.1, 0.65);
  c.mode = 'walk'; c.t = 0;
}

/** Claws, eye stalks and mouth ease toward per-mode targets so nothing ever snaps. */
export function updatePose(c: Crab, dt: number) {
  const t = c.t, ck = c.clock, g = c.gait;
  const en = c.mode === 'idle' ? Math.sin(Math.PI * clamp(t / c.dur, 0, 1)) : 0;
  if (c.mode !== 'eat') { c.rw -= c.rw * ease(4, dt); c.chew -= c.chew * ease(8, dt); }
  const lag = clamp(c.ax / c.S, -2, 2) * 0.008;
  for (let s = 0; s < 2; s++) {
    const sg = s ? 1 : -1, lead = sg === c.dir;
    // leading claw reaches a touch outward, trailing claw tucks; both counter the body bob so they stay steady
    let x = sg * (REST_X + 0.018 * g * (lead ? 1 : -0.5)) - lag;
    let y = REST_Y + c.bob * 0.6 + (lead ? -0.01 : 0.008) * g + Math.sin(ck * 1.2 + s * 2.3 + c.seed) * 0.004;
    let a = REST_A - (lead ? 0.05 : -0.03) * g;
    const tw = Math.pow(Math.max(0, Math.sin(ck * 0.6 + c.seed * 1.7 + s * 2.9)), 36) * (1 - g);
    let open = 0.08 + tw * 0.35 * c.pClaw;
    a -= tw * 0.06;
    if (c.mode === 'idle') {
      if (c.act === 'lift' && s === c.actSide) { y -= 0.035 * en; x += sg * 0.02 * en; a -= 0.28 * en; open = 0.1 + en * (0.3 + 0.25 * Math.sin(t * 4)); }
      else if (c.act === 'pinch' && s === c.actSide) { open = 0.1 + en * (0.35 + 0.35 * Math.sin(t * 6.5)); y -= 0.015 * en; }
      else if (c.act === 'groom') {
        const d = Math.max(0, Math.sin(t * 3 + s * Math.PI));
        x -= sg * 0.04 * en; y += (0.01 + 0.012 * d) * en; a += (0.25 - a) * 0.7 * en; open = 0.06 + 0.25 * d * en;
      }
    }
    if (c.mode === 'wait') { y -= 0.02; a -= 0.1; open = 0.3; }
    if (s === c.side && c.rw > 0) { x += (c.rx - x) * c.rw; y += (c.ry - y) * c.rw; a += (c.ra - a) * c.rw; open += (c.ro - open) * c.rw; }
    const p = c.claws[s], k = ease(c.mode === 'eat' && s === c.side ? 14 : 5, dt);
    p.x += (x - p.x) * k; p.y += (y - p.y) * k; p.a += (a - p.a) * k;
    p.open += (clamp(open, 0, 1) - p.open) * ease(9, dt);
  }
  let eL = c.dir * 0.3 + Math.sin(ck * 0.7 + c.seed) * 0.15;
  let eR = c.dir * 0.3 + Math.sin(ck * 0.63 + c.seed * 1.3) * 0.15;
  let lift = 0;
  if (c.mode === 'idle' && c.act === 'eyes') { eL += Math.sin(t * 1.4) * 0.6 * en; eR += Math.sin(t * 1.1 + 1.2) * 0.6 * en; lift = 0.5 * en; }
  if (c.mode === 'wait') lift = 0.8;
  if (c.mode === 'eat') { eL = (c.side ? 1 : -1) * 0.45; eR = eL; }
  const ke = ease(3, dt);
  c.eyeL += (eL - c.eyeL) * ke; c.eyeR += (eR - c.eyeR) * ke; c.eyeLift += (lift - c.eyeLift) * ke;
}