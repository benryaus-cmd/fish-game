import { makeCrabPalette, type CrabPalette } from '@/utils/crabModel';
import {
  ARM1, ARM2, CLAW_SCALE, DAC_X, DAC_Y, DACTYL_D, ELBOW_QX, ELBOW_QY, FINGER_D, FOOT_X, FOOT_Y, GROUND, HINGE_X, HINGE_Y, HIP_X, HIP_Y, IK,
  LEG_W, LEN1, LEN2, MOUTH_Y, PALM_D, REST_A, REST_X, REST_Y, SHELL_D, SHOULDER_X, SHOULDER_Y, solve2,
} from '@/utils/crabRig';

const U = 42, CX = 38, CY = 27;
const X = (u: number) => +(CX + u * U).toFixed(2);
const Y = (v: number) => +(CY + v * U).toFixed(2);
const seg = (x0: number, y0: number, x1: number, y1: number) => `M${X(x0)} ${Y(y0)} L${X(x1)} ${Y(y1)}`;

interface LegGeo { key: string; w: number; back: boolean; grp: number; a: string; b: string; c: string; t: string; kx: number; ky: number; jx: number; jy: number }

/** Rest-pose legs solved with the same rig as the live crab. */
const legsFor = (sg: number): LegGeo[] => [3, 2, 1, 0].map((k) => {
  const hx = sg * HIP_X[k], hy = HIP_Y[k], fx = sg * FOOT_X[k], fy = GROUND + FOOT_Y[k];
  solve2(hx, hy, fx - sg * DAC_X, fy - DAC_Y, LEN1[k], LEN2[k], sg * 0.3, -1);
  const { kx, ky, ex, ey } = IK;
  return {
    key: `${sg}${k}`, w: LEG_W[k] * U, back: k >= 2, grp: (k + (sg > 0 ? 1 : 0)) & 1,
    a: seg(hx, hy, kx, ky), b: seg(kx, ky, ex, ey), c: seg(ex, ey, fx, fy),
    t: seg(ex + (fx - ex) * 0.5, ey + (fy - ey) * 0.5, fx, fy), kx: X(kx), ky: Y(ky), jx: X(ex), jy: Y(ey),
  };
});
const LEGS = [...legsFor(-1), ...legsFor(1)];
const LEGS_A = LEGS.filter((l) => l.grp === 0), LEGS_B = LEGS.filter((l) => l.grp === 1);

/** Rest-pose cheliped (shoulder → elbow → wrist) and pincer transform. */
const armFor = (sg: number) => {
  const sx = sg * SHOULDER_X, sy = SHOULDER_Y;
  solve2(sx, sy, sg * REST_X, REST_Y, ARM1, ARM2, sg * ELBOW_QX, ELBOW_QY);
  const { kx, ky, ex, ey } = IK;
  const deg = (Math.atan2(Math.sin(REST_A), sg * Math.cos(REST_A)) * 180) / Math.PI;
  const k = U * (sg > 0 ? 1.06 : 1), sz = sg > 0 ? 1.06 : 1;
  return {
    a: seg(sx, sy, kx, ky), b: seg(kx, ky, ex, ey), ex: X(kx), ey: Y(ky), sz,
    hand: `translate(${X(ex)} ${Y(ey)}) rotate(${deg.toFixed(1)}) scale(${k.toFixed(2)} ${(k * sg).toFixed(2)})`,
  };
};
const ARM_L = armFor(-1), ARM_R = armFor(1);
type ArmGeo = typeof ARM_L;

const LegRow = ({ legs, pal }: { legs: LegGeo[]; pal: CrabPalette }) => (
  <g fill="none" strokeLinecap="round">
    {legs.map((l) => {
      const col = l.back ? pal.legBack : pal.leg;
      return (
        <g key={l.key}>
          <path d={l.a} stroke={pal.outline} strokeWidth={l.w * 1.26} />
          <path d={l.b} stroke={pal.outline} strokeWidth={l.w * 1.06} />
          <path d={l.c} stroke={pal.outline} strokeWidth={l.w * 0.8} />
          <path d={l.a} stroke={col} strokeWidth={l.w} />
          <path d={l.b} stroke={col} strokeWidth={l.w * 0.8} />
          <path d={l.c} stroke={col} strokeWidth={l.w * 0.56} />
          <path d={l.t} stroke={pal.tip} strokeWidth={l.w * 0.36} />
          <circle cx={l.kx} cy={l.ky} r={l.w * 0.3} fill={pal.joint} stroke="none" />
          <circle cx={l.jx} cy={l.jy} r={l.w * 0.26} fill={pal.joint} stroke="none" />
        </g>
      );
    })}
  </g>
);

const Claw = ({ arm, pal, className }: { arm: ArmGeo; pal: CrabPalette; className?: string }) => (
  <g className={className} strokeLinecap="round" fill="none">
    <path d={arm.a} stroke={pal.outline} strokeWidth={0.086 * U * arm.sz * 1.12} />
    <path d={arm.b} stroke={pal.outline} strokeWidth={0.088 * U * arm.sz * 1.12} />
    <path d={arm.a} stroke={pal.claw} strokeWidth={0.068 * U * arm.sz * 1.12} />
    <path d={arm.b} stroke={pal.claw} strokeWidth={0.07 * U * arm.sz * 1.12} />
    <circle cx={arm.ex} cy={arm.ey} r={0.022 * U} fill={pal.clawDark} opacity="0.45" />
    <g transform={arm.hand} stroke={pal.outline} strokeWidth="0.016" strokeLinejoin="round" paintOrder="stroke">
      <g transform={`scale(${CLAW_SCALE})`}>
        <path d={DACTYL_D} transform={`translate(${HINGE_X} ${HINGE_Y}) rotate(-4)`} fill="url(#pvCrabFinger)" />
        <path d={FINGER_D} fill="url(#pvCrabFinger)" />
        <path d={PALM_D} fill="url(#pvCrabPalm)" />
        <ellipse cx="0.1" cy="0.05" rx="0.1" ry="0.022" fill={pal.clawDark} opacity="0.26" stroke="none" />
        <ellipse cx="0.08" cy="-0.052" rx="0.07" ry="0.017" fill="#fff6ea" opacity="0.45" stroke="none" />
      </g>
    </g>
  </g>
);

/** Code-drawn front-view crab preview, tinted from the live crab color. */
export const CrabPreview = ({ color }: { color: string }) => {
  const pal = makeCrabPalette(color);
  const shellT = `translate(${CX} ${CY}) scale(${U})`;
  const stalks = `${seg(-0.07, -0.235, -0.092, -0.322)} ${seg(0.07, -0.235, 0.092, -0.322)}`;
  return (
    <svg width="76" height="52" viewBox="-4 0 84 52" aria-hidden="true" className="preview-crab">
      <defs>
        <radialGradient id="pvCrabShell" cx="0.38" cy="0.2" r="0.8">
          <stop offset="0" stopColor={pal.light} />
          <stop offset="0.4" stopColor={pal.base} />
          <stop offset="0.78" stopColor={pal.shade} />
          <stop offset="1" stopColor={pal.dark} />
        </radialGradient>
        <linearGradient id="pvCrabAO" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor={pal.dark} stopOpacity="0" />
          <stop offset="1" stopColor={pal.dark} stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="pvCrabPalm" cx="0.4" cy="0.3" r="0.75">
          <stop offset="0" stopColor={pal.clawLight} />
          <stop offset="0.45" stopColor={pal.claw} />
          <stop offset="1" stopColor={pal.clawDark} />
        </radialGradient>
        <linearGradient id="pvCrabFinger" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={pal.claw} />
          <stop offset="0.55" stopColor={pal.finger} />
          <stop offset="1" stopColor={pal.tip} />
        </linearGradient>
      </defs>
      <ellipse cx={CX} cy={Y(GROUND) - 0.5} rx={0.76 * U} ry={0.065 * U} fill="rgba(20,40,40,0.14)" />
      <g className="pv-crab-legs"><LegRow legs={LEGS_A} pal={pal} /></g>
      <g className="pv-crab-legs2"><LegRow legs={LEGS_B} pal={pal} /></g>
      <g className="pv-crab-body">
        <ellipse cx={CX} cy={Y(0.128)} rx={0.25 * U} ry={0.058 * U} fill={pal.belly} stroke={pal.outline} strokeWidth="0.4" />
        <g transform={shellT}>
          <path d={SHELL_D} fill="url(#pvCrabShell)" stroke={pal.outline} strokeWidth="0.012" />
          <path d={SHELL_D} fill="url(#pvCrabAO)" />
          <path d="M-0.4 -0.16 C-0.26 -0.265 -0.12 -0.25 -0.05 -0.232 M0.05 -0.232 C0.12 -0.25 0.26 -0.265 0.4 -0.16" fill="none" stroke={pal.light} strokeWidth="0.024" opacity="0.4" strokeLinecap="round" />
          <ellipse cx="-0.075" cy="-0.24" rx="0.048" ry="0.024" fill={pal.dark} opacity="0.34" />
          <ellipse cx="0.075" cy="-0.24" rx="0.048" ry="0.024" fill={pal.dark} opacity="0.34" />
          <ellipse cx="-0.15" cy="-0.18" rx="0.19" ry="0.06" transform="rotate(-11 -0.15 -0.18)" fill="#fff8ec" opacity="0.3" />
          <ellipse cx="0" cy={MOUTH_Y} rx="0.05" ry="0.02" fill={pal.mark} opacity="0.55" />
        </g>
      </g>
      <g className="pv-crab-eyes" strokeLinecap="round">
        <path d={stalks} stroke={pal.outline} strokeWidth={0.046 * U} />
        <path d={stalks} stroke={pal.base} strokeWidth={0.033 * U} />
        {[-1, 1].map((sg) => (
          <g key={sg}>
            <circle cx={X(sg * 0.092)} cy={Y(-0.322)} r={0.036 * U} fill={pal.outline} />
            <circle cx={X(sg * 0.092)} cy={Y(-0.322)} r={0.031 * U} fill={pal.light} />
            <circle cx={X(sg * 0.092 + 0.003)} cy={Y(-0.325)} r={0.026 * U} fill={pal.eye} />
            <circle cx={X(sg * 0.092 - 0.009)} cy={Y(-0.335)} r={0.008 * U} fill="rgba(255,255,255,0.85)" />
          </g>
        ))}
      </g>
      <Claw arm={ARM_L} pal={pal} />
      <Claw arm={ARM_R} pal={pal} className="pv-crab-claw" />
    </svg>
  );
};