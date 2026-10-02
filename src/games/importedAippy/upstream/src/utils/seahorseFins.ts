import type { SeaPose } from '@/utils/seahorseModel';
import type { SeaPalette } from '@/utils/seahorsePalette';
import { BD, HF, HP, headProj, NBD, NXA, NYA, PA, PX, PY, PZ } from '@/utils/seahorseGeom';
import { smoothClosed, smoothOpen } from '@/utils/seahorsePath';

const NR = 7;
const FH = [0.03, 0.058, 0.074, 0.08, 0.074, 0.058, 0.032];
const BX = new Float32Array(NR), BY = new Float32Array(NR), TX = new Float32Array(NR), TY = new Float32Array(NR);
const FX = new Float32Array(NR * 2), FY = new Float32Array(NR * 2);
const PXs = new Float32Array(5), PYs = new Float32Array(5);

/** Dorsal fin on the lower back: a travelling flutter wave, rays sway sideways (visible as the body turns). */
export function buildDorsal(s: SeaPose) {
  for (let j = 0; j < NR; j++) {
    const f = 5.3 + (j * 3.6) / (NR - 1), i = Math.min(NBD - 2, Math.floor(f)), t = f - i, k = i + 1;
    const x = PX[i] + (PX[k] - PX[i]) * t, y = PY[i] + (PY[k] - PY[i]) * t, z = PZ[i] + (PZ[k] - PZ[i]) * t;
    const a = PA[i] + (PA[k] - PA[i]) * t, nx = NXA[i] + (NXA[k] - NXA[i]) * t, ny = NYA[i] + (NYA[k] - NYA[i]) * t;
    const th = BD[i].th + (BD[k].th - BD[i].th) * t, c = Math.cos(th), sn = Math.sin(th);
    const w = Math.sin(s.finPh - j * 0.85) * s.finAmp, h = FH[j];
    const r0 = a * 0.8, r1 = r0 + h * (0.95 + 0.06 * w), up = h * (0.34 + 0.18 * w);
    const tx = x - nx * r1 + ny * up, ty = y - ny * r1 - nx * up, tz = z + h * 0.6 * w;
    BX[j] = (x - nx * r0) * c - z * sn; BY[j] = y - ny * r0;
    TX[j] = tx * c - tz * sn; TY[j] = ty;
  }
}

export function drawDorsal(ctx: CanvasRenderingContext2D, pal: SeaPalette, al: number) {
  let k = 0;
  for (let j = 0; j < NR; j++) { FX[k] = BX[j]; FY[k++] = BY[j]; }
  for (let j = NR - 1; j >= 0; j--) { FX[k] = TX[j]; FY[k++] = TY[j]; }
  ctx.globalAlpha = al;
  ctx.beginPath(); smoothClosed(ctx, FX, FY, k); ctx.fillStyle = pal.fin; ctx.fill();
  ctx.beginPath();
  for (let j = 0; j < NR; j++) { ctx.moveTo(BX[j], BY[j]); ctx.lineTo(TX[j], TY[j]); }
  ctx.strokeStyle = pal.finRay; ctx.lineWidth = 0.0045; ctx.stroke();
  ctx.beginPath(); smoothOpen(ctx, TX, TY, NR); ctx.strokeStyle = pal.finEdge; ctx.lineWidth = 0.006; ctx.stroke();
}

/** Tiny pectoral fans behind the cheeks; they splay sideways near the front view and balance independently. */
export function drawPecs(ctx: CanvasRenderingContext2D, s: SeaPose, pal: SeaPalette, al: number, near: boolean) {
  for (let q = 0; q < 2; q++) {
    const sg = q === 0 ? 1 : -1;
    if ((sg * HF.c > 0.02) !== near) continue;
    headProj(0.004, -0.028, sg * 0.04);
    PXs[0] = HP.x; PYs[0] = HP.y;
    for (let r = 0; r < 4; r++) {
      const ang = -0.55 + r * 0.38 + 0.28 * Math.sin(s.pecPh + r * 0.7 + q * 1.9), L = r === 0 || r === 3 ? 0.044 : 0.052;
      headProj(0.004 - Math.cos(ang) * 0.62 * L, -0.028 + Math.sin(ang) * 0.62 * L, sg * (0.04 + 0.78 * L));
      PXs[r + 1] = HP.x; PYs[r + 1] = HP.y;
    }
    ctx.globalAlpha = al * (near ? 1 : 0.8);
    ctx.beginPath(); ctx.moveTo(PXs[0], PYs[0]); ctx.lineTo(PXs[1], PYs[1]);
    for (let r = 2; r < 4; r++) ctx.quadraticCurveTo(PXs[r], PYs[r], (PXs[r] + PXs[r + 1]) / 2, (PYs[r] + PYs[r + 1]) / 2);
    ctx.lineTo(PXs[4], PYs[4]); ctx.closePath();
    ctx.fillStyle = pal.fin; ctx.fill();
    ctx.beginPath();
    for (let r = 1; r < 5; r++) { ctx.moveTo(PXs[0], PYs[0]); ctx.lineTo(PXs[r], PYs[r]); }
    ctx.strokeStyle = pal.finRay; ctx.lineWidth = 0.004; ctx.stroke();
  }
}