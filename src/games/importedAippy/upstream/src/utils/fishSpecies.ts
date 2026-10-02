/** Per-species body shape, fin layout and movement personality. All sizes in unit space (1 = body length). */
export const N = 22;
export const LAST = N - 1;
export const TAU = Math.PI * 2;

export type SpeciesId = 'starter' | 'colorful';
export interface TailShape { TL: number; TH: number; notch: number; lower: number }
export interface MedianFin { t0: number; t1: number; side: 1 | -1; h: number; skew: number }
export interface SpeciesTraits {
  id: SpeciesId; size: number; hh: Float32Array; ww: Float32Array;
  turnK: number; bodyEase: number; tailEase: number; turnCool: number; turnSlow: number; edge: number;
  cruiseMin: number; cruiseRange: number; decideMin: number; decideRange: number; restChance: number;
  wanderRate: number; wanderAmp: number; burstChance: number; depthRange: number;
  heightLo: number; heightHi: number;
  freqMul: number; ampAdd: number; finRate: number; wave: number;
  detect: number; scan: number; recover: number; approachMul: number; eatReach: number;
  eatOpen: number; eatHold: number; eatBite: number; eatEnd: number; lunge: number; tilt: number;
  eyeR: number; tail: TailShape; fins: MedianFin[]; pectLen: number; pectWidth: number;
}

function shape(hMax: number, headEnd: number, headPow: number, tailK: number, tailPow: number, minF: number, w0: number, w1: number) {
  const hh = new Float32Array(N), ww = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / LAST;
    const f = t < headEnd
      ? Math.pow(Math.sqrt(Math.max(0, 1 - ((headEnd - t) / headEnd) ** 2)), headPow)
      : 1 - Math.pow((t - headEnd) / (1 - headEnd), tailPow) * tailK;
    hh[i] = hMax * Math.max(minF, f);
    ww[i] = hh[i] * (w0 - w1 * t);
  }
  return { hh, ww };
}

const starterShape = shape(0.19, 0.36, 1, 0.8, 1.5, 0.1, 0.66, 0.2);
/** Longer, slimmer, narrower-headed tropical silhouette with a thin tail stem. */
const colorfulShape = shape(0.158, 0.44, 1.35, 0.87, 1.25, 0.075, 0.6, 0.22);

export const STARTER: SpeciesTraits = {
  id: 'starter', size: 1, ...starterShape,
  turnK: 2.4, bodyEase: 3.4, tailEase: 2.6, turnCool: 3.2, turnSlow: 0.55, edge: 1.75,
  cruiseMin: 0.45, cruiseRange: 0.4, decideMin: 6, decideRange: 7, restChance: 0.22,
  wanderRate: 0.35, wanderAmp: 0.06, burstChance: 0, depthRange: 0.12,
  heightLo: 0.22, heightHi: 0.72,
  freqMul: 1, ampAdd: 0, finRate: 1, wave: 2.6,
  detect: 0.3, scan: 0.2, recover: 1.3, approachMul: 1, eatReach: 0.26,
  eatOpen: 0.16, eatHold: 0.06, eatBite: 0.21, eatEnd: 0.46, lunge: 0.05, tilt: 0,
  eyeR: 0.05,
  tail: { TL: 0.3, TH: 0.17, notch: 0.66, lower: 0.97 },
  fins: [
    { t0: 0.26, t1: 0.66, side: -1, h: 0.15, skew: 0.65 },
    { t0: 0.6, t1: 0.84, side: 1, h: 0.09, skew: 0.65 },
    { t0: 0.3, t1: 0.44, side: 1, h: 0.055, skew: 0.65 },
  ],
  pectLen: 0.2, pectWidth: 0.035,
};

export const COLORFUL: SpeciesTraits = {
  id: 'colorful', size: 1.04, ...colorfulShape,
  turnK: 3.5, bodyEase: 4.6, tailEase: 3.3, turnCool: 2.3, turnSlow: 0.42, edge: 1.45,
  cruiseMin: 0.56, cruiseRange: 0.44, decideMin: 3.8, decideRange: 4.6, restChance: 0.12,
  wanderRate: 0.62, wanderAmp: 0.11, burstChance: 0.32, depthRange: 0.16,
  heightLo: 0.1, heightHi: 0.5,
  freqMul: 1.16, ampAdd: 0.035, finRate: 1.3, wave: 2.95,
  detect: 0.2, scan: 0.15, recover: 0.85, approachMul: 1.22, eatReach: 0.28,
  eatOpen: 0.1, eatHold: 0.04, eatBite: 0.13, eatEnd: 0.33, lunge: 0.038, tilt: 0.16,
  eyeR: 0.043,
  tail: { TL: 0.37, TH: 0.21, notch: 0.48, lower: 1 },
  fins: [
    { t0: 0.2, t1: 0.8, side: -1, h: 0.13, skew: 1.55 },
    { t0: 0.55, t1: 0.86, side: 1, h: 0.105, skew: 1.5 },
    { t0: 0.3, t1: 0.42, side: 1, h: 0.06, skew: 1.2 },
  ],
  pectLen: 0.22, pectWidth: 0.03,
};

export const SPECIES: Record<SpeciesId, SpeciesTraits> = { starter: STARTER, colorful: COLORFUL };
export const SPECIES_IDS: SpeciesId[] = ['starter', 'colorful'];