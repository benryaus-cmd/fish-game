/** Crab rig — front view, sideways walker. Units = S (shell width); origin = shell centre; +y points down. */
// Walking legs, k = 0 front … 3 rear. Rear pairs sit higher (further back) and plant wider; all short and sturdy.
export const HIP_X = [0.26, 0.32, 0.37, 0.41];
export const HIP_Y = [0.1, 0.07, 0.035, 0];
export const FOOT_X = [0.47, 0.56, 0.64, 0.7];
export const FOOT_Y = [0, -0.012, -0.024, -0.036];
export const LEN1 = [0.16, 0.18, 0.2, 0.22];
export const LEN2 = [0.14, 0.155, 0.17, 0.185];
export const LEG_W = [0.058, 0.054, 0.05, 0.046];
/** Pointed dactyl: the ankle sits this far above and inside the foot tip. */
export const DAC_X = 0.02, DAC_Y = 0.065;
/** Body centre height above the sand. */
export const GROUND = 0.3;
/** Screen-edge margin for the enlarged pincers and legs. */
export const EDGE = 1.02;
/** Gentle body orientation toward the travel side. */
export const YAW = 0.26;

/** Chelipeds: shoulders on the lower front face, two arm bones hanging relaxed and outward. */
export const SHOULDER_X = 0.24, SHOULDER_Y = 0.05, ARM1 = 0.16, ARM2 = 0.14;
/** Elbow bend preference (x mirrored per side): elbows drop down and out, never up toward the eyes. */
export const ELBOW_QX = 0.35, ELBOW_QY = 1;
/** Rest: wrists low at the front-lateral sides, pincers held outward and level — far below the eyes. */
export const REST_X = 0.47, REST_Y = 0.15, REST_A = -0.2;
/** Wrist → grip point, matched to the enlarged pincer. */
export const CLAW_SCALE = 1.5;
export const GRIP = 0.26 * CLAW_SCALE;
export const REACH_A = 0.55;
/** How far (in S) the crab stands from a pellet before reaching for it. */
export const REACH_OFF = 0.7;
export const MOUTH_Y = 0.06;
/** Pincer points inward and slightly up at the mouth (reached by curling up and over, never through the sand). */
export const MOUTH_A = -2.8;

/** Result of the last solve2 call: joint (kx, ky) and clamped end (ex, ey). */
export const IK = { kx: 0, ky: 0, ex: 0, ey: 0 };

/** 2-bone IK; the joint bends toward the preferred direction (qx, qy). */
export function solve2(hx: number, hy: number, tx: number, ty: number, l1: number, l2: number, qx: number, qy: number) {
  let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy);
  const mx = (l1 + l2) * 0.998;
  if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  if (d < 1e-4) { dx = 1e-4; dy = 0; d = 1e-4; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let px = -dy / d, py = dx / d;
  if (px * qx + py * qy < 0) { px = -px; py = -py; }
  IK.ex = hx + dx; IK.ey = hy + dy;
  IK.kx = hx + (dx / d) * a + px * h;
  IK.ky = hy + (dy / d) * a + py * h;
}

/** Shield-shaped domed carapace: widest near the top, small rostral dip between the eyes, one soft tooth per side. */
export const SHELL_D =
  'M-0.06 -0.255 Q0 -0.238 0.06 -0.255 C0.22 -0.292 0.4 -0.245 0.468 -0.125 Q0.5 -0.095 0.476 -0.06 ' +
  'C0.462 0.02 0.34 0.112 0.16 0.13 Q0 0.145 -0.16 0.13 C-0.34 0.112 -0.462 0.02 -0.476 -0.06 ' +
  'Q-0.5 -0.095 -0.468 -0.125 C-0.4 -0.245 -0.22 -0.292 -0.06 -0.255 Z';

/** Pincer parts in claw space (x points along the claw; wrist at origin). Scaled by S when drawn. */
export const PALM_D =
  'M-0.025 0.004 C-0.028 -0.055 0.03 -0.088 0.098 -0.084 C0.162 -0.08 0.205 -0.048 0.21 -0.008 ' +
  'C0.214 0.04 0.172 0.074 0.102 0.075 C0.03 0.076 -0.022 0.05 -0.025 0.004 Z';
/** Fixed lower finger, tip curving up to meet the movable finger. */
export const FINGER_D =
  'M0.168 -0.006 C0.215 -0.01 0.275 -0.014 0.322 -0.034 C0.338 -0.04 0.347 -0.026 0.338 -0.012 C0.302 0.032 0.24 0.058 0.16 0.06 Z';
/** Movable upper finger, drawn relative to its hinge. */
export const DACTYL_D =
  'M-0.012 -0.03 C0.058 -0.058 0.132 -0.044 0.168 0.012 C0.173 0.027 0.158 0.032 0.15 0.024 ' +
  'C0.124 0.002 0.086 -0.004 0.054 0 C0.032 0.003 0.01 0.012 -0.01 0.024 Z';
export const HINGE_X = 0.172, HINGE_Y = -0.046;