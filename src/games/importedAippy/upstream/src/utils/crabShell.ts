import { mix } from '@/utils/colorUtils';
import type { CrabPalette } from '@/utils/crabModel';
import { SHELL_D } from '@/utils/crabRig';

const TAU = Math.PI * 2, RES = 2.5;
/** Sprite box in S units: covers the carapace and the underside plate. */
export const SH_W = 1.06, SH_H = 0.52, SH_X = 0.53, SH_Y = 0.32;
const GRAIN: [number, number, number][] = [
  [-0.19, -0.17, 0.017], [0.19, -0.17, 0.017], [-0.3, -0.1, 0.014], [0.3, -0.1, 0.014],
  [-0.09, -0.11, 0.012], [0.09, -0.11, 0.012], [0, -0.19, 0.011], [-0.37, -0.03, 0.011], [0.37, -0.03, 0.011],
];
let SHELL: Path2D | null = null;
const cache = new Map<string, HTMLCanvasElement>();

function glow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, a: number) {
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx);
  const r = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  r.addColorStop(0, `rgba(255,248,236,${a})`); r.addColorStop(1, 'rgba(255,248,236,0)');
  g.fillStyle = r;
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}
function disc(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
}

/** Pre-baked domed carapace + underside plate — gradients are never rebuilt per frame. */
function bake(pal: CrabPalette, S: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.ceil(SH_W * S * RES));
  cv.height = Math.max(2, Math.ceil(SH_H * S * RES));
  const g = cv.getContext('2d');
  if (!g) return cv;
  const k = S * RES;
  if (!SHELL) SHELL = new Path2D(SHELL_D);
  const shell = SHELL;
  g.setTransform(k, 0, 0, k, SH_X * k, SH_Y * k);
  // underside plate peeking below the rim
  const bg = g.createLinearGradient(0, 0.09, 0, 0.19);
  bg.addColorStop(0, pal.belly); bg.addColorStop(1, pal.bellyDark);
  g.fillStyle = bg; disc(g, 0, 0.128, 0.25, 0.058);
  g.strokeStyle = pal.outline; g.lineWidth = 0.01; g.stroke();
  g.globalAlpha = 0.28; g.strokeStyle = pal.bellyDark; g.lineWidth = 0.009; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-0.12, 0.162); g.quadraticCurveTo(0, 0.182, 0.12, 0.162); g.moveTo(0, 0.146); g.lineTo(0, 0.178); g.stroke();
  g.globalAlpha = 1;
  // domed carapace
  const grad = g.createRadialGradient(-0.12, -0.2, 0.02, 0, -0.06, 0.58);
  grad.addColorStop(0, pal.light); grad.addColorStop(0.4, pal.base); grad.addColorStop(0.78, pal.shade); grad.addColorStop(1, pal.dark);
  g.fillStyle = grad; g.fill(shell);
  g.save();
  g.clip(shell);
  const ao = g.createLinearGradient(0, -0.01, 0, 0.14);
  ao.addColorStop(0, mix(pal.key, '#3e170e', 0.6, 0)); ao.addColorStop(1, mix(pal.key, '#3e170e', 0.6, 0.5));
  g.fillStyle = ao; g.fillRect(-0.55, -0.35, 1.1, 0.55);
  // frontal ridge following the upper margin
  g.strokeStyle = pal.light; g.globalAlpha = 0.32; g.lineWidth = 0.026;
  g.beginPath();
  g.moveTo(-0.4, -0.16); g.bezierCurveTo(-0.26, -0.265, -0.12, -0.25, -0.05, -0.232);
  g.moveTo(0.05, -0.232); g.bezierCurveTo(0.12, -0.25, 0.26, -0.265, 0.4, -0.16);
  g.stroke();
  // eye orbits
  g.globalAlpha = 0.34; g.fillStyle = pal.dark;
  disc(g, -0.075, -0.24, 0.048, 0.024, 0.15); disc(g, 0.075, -0.24, 0.048, 0.024, -0.15);
  // raised granules with soft top light
  for (const [x, y, r] of GRAIN) {
    g.globalAlpha = 0.16; g.fillStyle = pal.mark; disc(g, x, y + r * 0.35, r, r);
    g.globalAlpha = 0.28; g.fillStyle = pal.light; disc(g, x - r * 0.2, y - r * 0.25, r * 0.6, r * 0.6);
  }
  g.globalAlpha = 0.3; g.strokeStyle = pal.mark; g.lineWidth = 0.01;
  g.beginPath();
  g.moveTo(-0.44, -0.11); g.quadraticCurveTo(-0.475, -0.09, -0.46, -0.06);
  g.moveTo(0.44, -0.11); g.quadraticCurveTo(0.475, -0.09, 0.46, -0.06);
  g.stroke();
  g.globalAlpha = 0.14; g.lineWidth = 0.014;
  g.beginPath(); g.moveTo(-0.13, -0.06); g.quadraticCurveTo(0, 0, 0.13, -0.06); g.stroke();
  // warm light bounced up from the sand along the lower rim
  g.globalAlpha = 0.26; g.strokeStyle = pal.belly; g.lineWidth = 0.018;
  g.beginPath(); g.moveTo(-0.36, 0.08); g.bezierCurveTo(-0.2, 0.13, 0.2, 0.13, 0.36, 0.08); g.stroke();
  g.globalAlpha = 1;
  glow(g, -0.15, -0.18, 0.2, 0.07, -0.2, 0.46);
  glow(g, 0.24, -0.15, 0.1, 0.04, 0.25, 0.16);
  g.restore();
  g.strokeStyle = pal.outline; g.lineWidth = 0.012;
  g.stroke(shell);
  return cv;
}

export function shellSprite(pal: CrabPalette, S: number): HTMLCanvasElement {
  const q = Math.max(4, Math.round(S / 4) * 4), key = pal.key + ':' + q;
  let spr = cache.get(key);
  if (!spr) {
    if (cache.size > 10) cache.clear();
    spr = bake(pal, q);
    cache.set(key, spr);
  }
  return spr;
}