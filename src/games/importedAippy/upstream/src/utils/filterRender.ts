import { mix } from '@/utils/colorUtils';
import { INCOME_AMOUNT, TEXT_LIFE, type FilterFx, type FilterLayout } from '@/utils/waterFilter';

const SS = 3;
const DASH = [4, 7];
const NO_DASH: number[] = [];
const cache = new Map<string, HTMLCanvasElement>();

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

/** Static housing, spout, intake tube and strainer, baked once per size/color (no per-frame gradients). */
function housing(W: number, H: number, color: string) {
  const key = `${W}|${H}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const PL = W * 0.36, lw = PL + W + 8, lh = H * 2.14 + 8;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(lw * SS); cv.height = Math.ceil(lh * SS);
  const g = cv.getContext('2d');
  if (g) {
    g.scale(SS, SS); g.translate(PL, 2);
    const light = mix(color, '#a9b8c6', 0.4), dark = mix(color, '#11161b', 0.5), mid = mix(color, '#11161b', 0.25);
    g.fillStyle = 'rgba(8,24,36,0.1)'; rr(g, 3.5, 5, W, H, W * 0.14); g.fill();
    rr(g, 1.8, 2.8, W, H, W * 0.14); g.fill();
    // Intake tube (semi-transparent) and slotted strainer
    const tx = W * 0.57, tw = W * 0.14;
    const tg = g.createLinearGradient(tx, 0, tx + tw, 0);
    tg.addColorStop(0, 'rgba(170,195,210,0.35)'); tg.addColorStop(0.35, 'rgba(230,245,252,0.5)'); tg.addColorStop(1, 'rgba(90,115,130,0.45)');
    g.fillStyle = tg; g.fillRect(tx, H - 2, tw, H * 0.84);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(tx + tw * 0.25, H, tw * 0.14, H * 0.8);
    const sx = tx - W * 0.05, sw = tw + W * 0.1, sy = H * 1.8, sh = H * 0.3;
    const sg = g.createLinearGradient(sx, 0, sx + sw, 0);
    sg.addColorStop(0, light); sg.addColorStop(0.4, color); sg.addColorStop(1, dark);
    g.fillStyle = sg; rr(g, sx, sy, sw, sh, W * 0.05); g.fill();
    g.fillStyle = 'rgba(8,12,16,0.6)';
    for (let i = 0; i < 5; i++) g.fillRect(sx + sw * 0.18, sy + sh * (0.14 + i * 0.16), sw * 0.64, sh * 0.06);
    // Outlet spout with downward lip
    const pg = g.createLinearGradient(0, H * 0.55, 0, H * 0.78);
    pg.addColorStop(0, light); pg.addColorStop(1, dark);
    g.fillStyle = pg; rr(g, -W * 0.28, H * 0.55, W * 0.34, H * 0.12, H * 0.03); g.fill();
    rr(g, -W * 0.31, H * 0.58, W * 0.15, H * 0.19, W * 0.045); g.fill();
    g.fillStyle = 'rgba(6,10,14,0.75)';
    g.beginPath(); g.ellipse(-W * 0.235, H * 0.765, W * 0.055, H * 0.014, 0, 0, Math.PI * 2); g.fill();
    // Main housing with soft plastic shading
    const hg = g.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, light); hg.addColorStop(0.28, color); hg.addColorStop(0.78, mid); hg.addColorStop(1, dark);
    g.fillStyle = hg; rr(g, 0, 0, W, H, W * 0.14); g.fill();
    g.save(); rr(g, 0, 0, W, H, W * 0.14); g.clip();
    const lg = g.createLinearGradient(0, 0, 0, H * 0.15);
    lg.addColorStop(0, mix(color, '#2a3138', 0.35)); lg.addColorStop(1, dark);
    g.fillStyle = lg; g.fillRect(0, 0, W, H * 0.15);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, H * 0.15, W, 0.8);
    const vg = g.createLinearGradient(0, H * 0.6, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,10,16,0.28)');
    g.fillStyle = vg; g.fillRect(0, H * 0.6, W, H * 0.4);
    g.restore();
    for (let i = 0; i < 4; i++) {
      const y = H * (0.2 + i * 0.042);
      g.fillStyle = 'rgba(8,12,16,0.6)'; rr(g, W * 0.16, y, W * 0.68, H * 0.017, 1); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(W * 0.17, y + H * 0.019, W * 0.66, 0.6);
    }
    // Transparent window showing the blue-gray sponge
    const wg = g.createLinearGradient(0, H * 0.38, 0, H * 0.86);
    wg.addColorStop(0, mix(color, '#3d5468', 0.5, 0.8)); wg.addColorStop(1, mix(color, '#1b2a36', 0.7, 0.92));
    g.fillStyle = wg; rr(g, W * 0.14, H * 0.38, W * 0.46, H * 0.48, W * 0.06); g.fill();
    g.fillStyle = 'rgba(170,200,220,0.12)';
    for (let i = 0; i < 20; i++) {
      const px = W * (0.18 + ((i * 37) % 19) / 19 * 0.38), py = H * (0.42 + ((i * 53) % 23) / 23 * 0.4);
      g.beginPath(); g.arc(px, py, W * 0.018, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; rr(g, W * 0.14, H * 0.38, W * 0.46, H * 0.48, W * 0.06); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(W * 0.18, H * 0.4, W * 0.04, H * 0.44);
    g.fillStyle = 'rgba(8,12,16,0.55)';
    for (let i = 0; i < 3; i++) { rr(g, W * (0.68 + i * 0.065), H * 0.4, W * 0.03, H * 0.42, 1); g.fill(); }
    g.fillStyle = dark; rr(g, W - 2, H * 0.03, 6, H * 0.22, 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.9; rr(g, 0.5, 0.5, W - 1, H - 1, W * 0.14); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.16)'; rr(g, W * 0.05, H * 0.2, W * 0.05, H * 0.68, W * 0.025); g.fill();
  }
  cache.set(key, cv);
  return cv;
}

export function drawFilter(ctx: CanvasRenderingContext2D, fx: FilterFx, L: FilterLayout, color: string) {
  if (fx.alpha <= 0) return;
  const { x, y, W, H, outX, outY } = L, t = fx.t, a = fx.alpha;
  const sp = housing(W, H, color), PL = W * 0.36;
  ctx.globalAlpha = a;
  // Gentle water stream leaving the outlet
  const sway = Math.sin(t * 1.7) * W * 0.03;
  const ex = outX - W * 0.32 + sway, ey = outY + H * 0.85, cx = outX - W * 0.02 + sway * 0.5, cy = outY + H * 0.42;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(220,245,255,0.09)'; ctx.lineWidth = W * 0.11;
  ctx.beginPath(); ctx.moveTo(outX, outY); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
  ctx.setLineDash(DASH); ctx.lineWidth = 1.1;
  for (let i = 0; i < 2; i++) {
    const o = (i - 0.5) * W * 0.05;
    ctx.lineDashOffset = -t * (24 + i * 7);
    ctx.strokeStyle = `rgba(235,250,255,${0.24 - i * 0.06})`;
    ctx.beginPath(); ctx.moveTo(outX + o * 0.4, outY); ctx.quadraticCurveTo(cx + o, cy, ex + o * 1.6, ey); ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
  const rp = (t * 0.6) % 1;
  ctx.strokeStyle = `rgba(230,248,255,${0.16 * (1 - rp)})`; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(outX, outY + H * 0.06, W * (0.06 + rp * 0.1), H * (0.015 + rp * 0.02), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.drawImage(sp, x - PL, y - 2, sp.width / SS, sp.height / SS);
  // Subtle internal motion behind the window and a calm status light
  ctx.fillStyle = 'rgba(200,230,245,0.28)';
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.14 + i * 0.33) % 1;
    ctx.beginPath(); ctx.arc(x + W * (0.24 + i * 0.13), y + H * (0.82 - p * 0.4), W * 0.018, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = `rgba(120,230,210,${(0.55 + 0.3 * Math.sin(t * 1.6)) * a})`;
  ctx.beginPath(); ctx.arc(x + W * 0.8, y + H * 0.075, W * 0.035, 0, Math.PI * 2); ctx.fill();
  for (const b of fx.bubbles) {
    const k = Math.min(1, b.life / 0.3) * (1 - b.life / 4.5);
    if (k <= 0) continue;
    ctx.globalAlpha = a * k;
    ctx.strokeStyle = 'rgba(235,250,255,0.6)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const LABEL = `+${INCOME_AMOUNT}`;

/** Small "+10" near the outlet, drawn in the top overlay layer. */
export function drawFilterTexts(ctx: CanvasRenderingContext2D, fx: FilterFx) {
  if (fx.texts.length === 0) return;
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  for (const tx of fx.texts) {
    const u = tx.t / TEXT_LIFE;
    const k = Math.min(1, tx.t / 0.15) * (1 - Math.max(0, (u - 0.6) / 0.4));
    if (k <= 0) continue;
    const yy = tx.y - 16 * (1 - Math.pow(1 - u, 2));
    ctx.globalAlpha = k * 0.9;
    ctx.fillStyle = 'rgba(20,40,55,0.45)'; ctx.fillText(LABEL, tx.x + 0.6, yy + 0.8);
    ctx.fillStyle = '#f5dc92'; ctx.fillText(LABEL, tx.x, yy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
}