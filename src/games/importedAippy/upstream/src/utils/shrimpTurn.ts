/** One continuous turn value drives the whole body: turnP 0 → old 3/4 profile, 0.5 → facing the viewer, 1 → opposite profile. */
export interface TurnPose { yawFrom: number; yawTo: number; turnP: number }
export interface TurnState extends TurnPose { face: 1 | -1; want: 1 | -1; hold: number; turnDur: number; pTurn: number }

const REST = 0.32;   // resting yaw: a slight 3/4 view, never a flat cut-out
const SPREAD = 0.45; // head leads, tail finishes last
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const restYaw = (dir: number) => (dir > 0 ? REST : Math.PI - REST);

/** Yaw of a body part; lag 0 = head, lag 1 = tail fan. Slow-in / slow-out. */
export function yawAt(s: TurnPose, lag: number) {
  const q = clamp01((s.turnP - lag * SPREAD) / (1 - SPREAD));
  return s.yawFrom + (s.yawTo - s.yawFrom) * ease5(q);
}

export const turnAmt = (s: TurnPose) => (s.turnP < 1 ? Math.sin(Math.PI * s.turnP) : 0);

/** A started turn is locked until it completes; then a short hold prevents left/right flicker. */
export function stepTurn(s: TurnState, dt: number) {
  if (s.turnP < 1) {
    s.turnP = Math.min(1, s.turnP + dt / s.turnDur);
    if (s.turnP >= 1) s.hold = 0.7 + Math.random() * 0.6;
    return;
  }
  s.hold -= dt;
  if (s.want !== s.face && s.hold <= 0) {
    s.yawFrom = s.yawTo;
    s.yawTo = restYaw(s.want);
    s.face = s.want;
    s.turnP = 0;
    s.turnDur = 1.15 * s.pTurn;
  }
}