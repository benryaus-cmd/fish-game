import type { Seahorse } from '@/utils/seahorseModel';
import { turnAmt, turnSign } from '@/utils/seahorseTurn';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ease = (r: number, dt: number) => 1 - Math.exp(-r * dt);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Layered procedural life, all eased (no snapping): dorsal flutter, pectoral balancing, body rock + turn lean,
 *  head nods and glances, torso bend and sideways sway, breathing chest, tail curl with spring follow-through, blinks, bob. */
export function animate(s: Seahorse, dt: number) {
  const eat = s.mode === 'eat', hunt = eat || s.mode === 'approach';
  const sp = Math.min(1.4, Math.hypot(s.vx, s.vy) / (s.H * 0.12));
  const ta = turnAmt(s), tsg = turnSign(s);
  const fwd = clamp((s.vx * s.face) / (s.H * 0.1), -1, 1);

  s.finAmp += (0.5 + 0.4 * Math.min(1, sp) + 0.35 * ta + (hunt ? 0.1 : 0) - s.finAmp) * ease(2.5, dt);
  s.finPh += TAU * (5.5 + 4 * sp + 2.5 * ta) * dt;
  s.pecPh += TAU * (2.4 + 1.6 * sp + 1.4 * ta) * dt;

  const lean = clamp(s.vx / (s.H * 0.1), -1, 1) * 0.06;
  const rock = Math.sin(s.clock * 0.47 + s.ph) * 0.035 + Math.sin(s.clock * 1.13 + s.ph * 2.3) * 0.01;
  s.rot += (rock + lean + ta * tsg * 0.07 - s.rot) * ease(2, dt);

  if (!eat) s.suck += -s.suck * ease(4, dt);
  if (!hunt) s.aim += -s.aim * ease(1.5, dt);
  s.lookT -= dt;
  if (s.lookT <= 0) { s.lookT = rnd(1.6, 4.5); s.lookTo = Math.random() < 0.35 ? 0 : rnd(-1, 1); }
  s.look += ((hunt || ta > 0 ? 0 : s.lookTo) - s.look) * ease(1.6, dt);
  const nod = Math.sin(s.clock * 0.41 + s.ph * 1.7) * 0.035 + Math.sin(s.clock * 1.07 + s.ph) * 0.012;
  s.head += (nod + s.aim + Math.max(0, s.suck) * 0.05 - s.head) * ease(3, dt);
  s.bend += (Math.sin(s.clock * 0.53 + s.ph * 1.3) * 0.6 - fwd * 0.45 - s.bend) * ease(1.5, dt);
  s.sway += (Math.sin(s.clock * 0.37 + s.ph) * 0.4 + ta * tsg * 0.9 - s.sway) * ease(2, dt);

  const curlT = 1 + 0.06 * Math.sin(s.clock * 0.29 + s.tailPh) + 0.05 * clamp(s.vy / (s.H * 0.12), -1, 1);
  s.curl += (curlT - s.curl) * ease(1.2, dt);
  const swT = fwd * 0.45 + Math.sin(s.clock * 0.62 + s.tailPh * 1.3) * 0.3 + ta * 0.35;
  s.swingV += ((swT - s.swing) * 6 - s.swingV * 3.4) * dt;
  s.swing += s.swingV * dt;
  s.wave += dt * (1.1 + 1.4 * sp);

  s.breath = Math.sin(s.clock * 1.15 + s.ph) * (1 - Math.max(0, s.suck) * 0.6);
  s.blinkT -= dt;
  if (s.blinkT < 0) {
    const b = -s.blinkT / 0.22;
    if (b >= 1) { s.blink = 0; s.blinkT = rnd(3, 7); } else s.blink = Math.sin(Math.PI * b);
  }
  s.bob = (Math.sin(s.clock * 0.63 + s.ph) + 0.35 * Math.sin(s.clock * 1.7 + s.ph * 3)) * s.H * 0.011;
}