import type { Seahorse } from '@/utils/seahorseModel';

/** One continuous turn value drives every body part: turnP 0 → original 3/4 profile, 0.5 → near-front, 1 → opposite profile. */
export interface TurnPose { yawFrom: number; yawTo: number; turnP: number; controlledYaw?: [number, number, number] }

const REST = 0.26;   // resting yaw: never a flat profile, always a slight 3/4 view
const SPREAD = 0.4;  // how far the turn "travels" through the body (head first, tail last)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const restYaw = (dir: number) => (dir > 0 ? REST : Math.PI - REST);

/** Yaw of a body segment; lag 0 = head (leads), lag 1 = tail tip (finishes last). Slow-in / slow-out. */
export function yawAt(s: TurnPose, lag: number) {
  if (s.controlledYaw) {
    const [head, body, tail] = s.controlledYaw;
    return lag < .5 ? head + (body - head) * lag * 2 : body + (tail - body) * (lag - .5) * 2;
  }
  const q = clamp01((s.turnP - lag * SPREAD) / (1 - SPREAD));
  return s.yawFrom + (s.yawTo - s.yawFrom) * ease5(q);
}

export const turnAmt = (s: TurnPose) => (s.turnP < 1 ? Math.sin(Math.PI * s.turnP) : 0);
export const turnSign = (s: TurnPose) => (s.yawTo > s.yawFrom ? -1 : 1);
/** Direction the body may travel in: the old facing until past the middle of the turn. */
export const moveDir = (s: Seahorse) => (s.turnP < 0.55 ? -s.face : s.face);

/** A started turn is locked until complete; new requests wait, then a short hold prevents left/right flicker. */
export function stepTurn(s: Seahorse, dt: number) {
  if (s.turnP < 1) {
    s.turnP = Math.min(1, s.turnP + dt / s.turnDur);
    if (s.turnP >= 1) s.hold = 0.9 + Math.random() * 0.6;
    return;
  }
  s.hold -= dt;
  if (s.want !== s.face && s.hold <= 0) {
    s.yawFrom = s.yawTo;
    s.yawTo = restYaw(s.want);
    s.face = s.want;
    s.turnP = 0;
    s.turnDur = 2.1 * s.pTurn;
  }
}