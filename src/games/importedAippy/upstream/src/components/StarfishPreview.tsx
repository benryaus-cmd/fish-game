import { makeStarPalette, type StarArm } from '@/utils/starfishModel';
import { C, OUTLINE_LEN, buildOutline, centerAt, computeArms, outlineD, widthAt, type StarPose } from '@/utils/starfishShape';

const U = 27, CX = 38, CY = 26, SY = 0.66;
const TAU = Math.PI * 2;
const LEN = [1.02, 0.95, 1.05, 0.98, 0.93];
const BEND = [0.08, -0.1, 0.05, -0.07, 0.1];
const JIT = [0.04, -0.06, 0.08, -0.03, 0.02];
const ARMS_PV: StarArm[] = LEN.map((len, k) => ({ base: (k / 5) * TAU + JIT[k], len, wid: 0.27, bend: BEND[k], f1: 0, f2: 0, p1: 0, p2: 0 }));
const POSE: StarPose = { heading: -Math.PI / 2, clock: 0, stride: 0, phase: 0, moveDir: 0, cover: 0, breathe: 0 };

/** Static geometry, solved with the same shape code as the live starfish. */
const build = () => {
  computeArms(ARMS_PV, POSE);
  const out = new Float32Array(OUTLINE_LEN);
  buildOutline(out, ARMS_PV, POSE);
  let ridge = '';
  const bumps: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 5; i++) {
    centerAt(i, 0.12);
    ridge += `M${C.x.toFixed(3)} ${C.y.toFixed(3)}`;
    for (const sv of [0.32, 0.52, 0.7, 0.84]) { centerAt(i, sv); ridge += `L${C.x.toFixed(3)} ${C.y.toFixed(3)}`; }
    for (const [sv, off] of [[0.3, 0.35], [0.46, -0.3], [0.62, 0.25], [0.78, -0.15]]) {
      centerAt(i, sv);
      const w = widthAt(ARMS_PV, i, sv, POSE);
      bumps.push({ x: C.x + C.nx * off * w, y: C.y + C.ny * off * w, r: 0.036 - sv * 0.018 });
    }
  }
  return { d: outlineD(out), ridge, bumps };
};
const GEO = build();

/** Code-drawn starfish preview, tinted from the live starfish colour. */
export const StarfishPreview = ({ color }: { color: string }) => {
  const pal = makeStarPalette(color);
  return (
    <svg width="76" height="52" viewBox="0 0 76 52" aria-hidden="true">
      <defs>
        <radialGradient id="pvStarBody" gradientUnits="userSpaceOnUse" cx="0" cy="-0.08" r="1.05">
          <stop offset="0" stopColor={pal.core} />
          <stop offset="0.3" stopColor={pal.base} />
          <stop offset="0.68" stopColor={pal.light} />
          <stop offset="1" stopColor={pal.tip} />
        </radialGradient>
        <radialGradient id="pvStarHump" gradientUnits="userSpaceOnUse" cx="-0.03" cy="-0.06" r="0.36">
          <stop offset="0" stopColor={pal.humpA} />
          <stop offset="1" stopColor={pal.humpB} />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY + 3} rx={U * 1.05} ry={U * SY * 0.9} fill="rgba(20,40,40,0.14)" />
      <g transform={`translate(${CX} ${CY}) scale(${U} ${U * SY})`}>
        <path d={GEO.d} transform="translate(0 0.1)" fill={pal.shade} />
        <path d={GEO.d} fill="url(#pvStarBody)" stroke={pal.rim} strokeWidth="0.03" />
        <path d={GEO.ridge} fill="none" stroke={pal.ridge} strokeWidth="0.09" strokeLinecap="round" strokeLinejoin="round" />
        {GEO.bumps.map((b, i) => (
          <circle key={i} cx={b.x.toFixed(3)} cy={b.y.toFixed(3)} r={b.r.toFixed(3)} fill={pal.bump} />
        ))}
        <circle cx="-0.03" cy="-0.06" r="0.36" fill="url(#pvStarHump)" />
        <circle cx="0.1" cy="0.04" r="0.035" fill={pal.bump} />
      </g>
    </svg>
  );
};