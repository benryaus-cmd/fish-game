/** Code-drawn Small Castle decoration: painted once into a cached sprite, drawn fixed on the sand. */
import { mix } from '@/utils/colorUtils';

type C = CanvasRenderingContext2D;
const cache = new Map<string, HTMLCanvasElement>();
const DARK = '#2e2a26';

function block(ctx: C, x: number, y: number, w: number, h: number, color: string, seed: number) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, mix(color, '#fff8e8', 0.3));
  g.addColorStop(0.45, color);
  g.addColorStop(1, mix(color, '#3a3a44', 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = mix(color, DARK, 0.5, 0.32);
  ctx.lineWidth = 0.7;
  for (let r = 0, yy = y; yy < y + h; r++, yy += 6) {
    ctx.beginPath(); ctx.moveTo(x, yy + 6); ctx.lineTo(x + w, yy + 6); ctx.stroke();
    for (let xx = x + ((r + seed) % 2) * 4.5; xx < x + w; xx += 9) {
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 6); ctx.stroke();
      const n = Math.abs(Math.sin(r * 12.9898 + xx * 78.233 + seed * 3.7) * 43758.5) % 1;
      if (n > 0.62) { ctx.fillStyle = 'rgba(255,248,230,0.14)'; ctx.fillRect(xx + 0.6, yy + 0.6, 7.8, 4.8); }
      else if (n < 0.16) { ctx.fillStyle = mix(color, DARK, 0.6, 0.12); ctx.fillRect(xx + 0.6, yy + 0.6, 7.8, 4.8); }
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,250,235,0.38)';
  ctx.fillRect(x, y, w, 1.1);
}

function crenels(ctx: C, x: number, y: number, w: number, n: number, color: string) {
  const cw = w / (n * 2 - 1);
  for (let i = 0; i < n; i++) block(ctx, x + i * 2 * cw, y, cw, 8.5, color, i);
}

function archPath(ctx: C, cx: number, bottom: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, bottom);
  ctx.lineTo(cx - w / 2, bottom - h + w / 2);
  ctx.arc(cx, bottom - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, bottom);
  ctx.closePath();
}

function opening(ctx: C, cx: number, bottom: number, w: number, h: number, color: string) {
  archPath(ctx, cx, bottom, w + 2, h + 1.5);
  ctx.fillStyle = mix(color, '#fff8e8', 0.35);
  ctx.fill();
  archPath(ctx, cx, bottom, w, h);
  const g = ctx.createLinearGradient(0, bottom - h, 0, bottom);
  g.addColorStop(0, '#16232a');
  g.addColorStop(1, '#34474f');
  ctx.fillStyle = g;
  ctx.fill();
}

function paint(ctx: C, color: string) {
  const roof = mix(color, '#9a5a44', 0.62);
  block(ctx, 70, 22, 22, 78, color, 1);
  block(ctx, 26, 46, 48, 54, color, 0);
  crenels(ctx, 26, 38, 48, 4, color);
  block(ctx, 8, 30, 22, 70, color, 2);
  ctx.fillStyle = mix(color, DARK, 0.3);
  ctx.fillRect(6, 27.5, 26, 3);
  crenels(ctx, 6, 19.5, 26, 3, color);
  // Conical roof on the tall tower
  const rg = ctx.createLinearGradient(66, 0, 96, 0);
  rg.addColorStop(0, mix(roof, '#ffe8d0', 0.25));
  rg.addColorStop(1, mix(roof, DARK, 0.4));
  ctx.beginPath(); ctx.moveTo(66, 23); ctx.quadraticCurveTo(76, 12, 81, 0); ctx.quadraticCurveTo(86, 12, 96, 23); ctx.closePath();
  ctx.fillStyle = rg; ctx.fill();
  ctx.fillStyle = mix(roof, DARK, 0.5); ctx.fillRect(66, 22, 30, 2.2);
  ctx.beginPath(); ctx.arc(81, 0.5, 1.8, 0, Math.PI * 2); ctx.fillStyle = mix(color, '#f2d48a', 0.7); ctx.fill();
  opening(ctx, 50, 100, 18, 27, color);
  for (const [x, y] of [[19, 52], [19, 74], [81, 44], [81, 66], [37, 68], [63, 68]]) opening(ctx, x, y, 5, 9, color);
  ctx.fillStyle = mix(color, DARK, 0.35); ctx.fillRect(38, 98, 24, 2);
  // Moss tufts and an aquatic tint over the whole castle
  ctx.fillStyle = mix(color, '#4f7f56', 0.75, 0.6);
  for (const [x, y, r] of [[11, 98, 5], [27, 99, 4], [69, 99, 4.5], [89, 98, 5.5], [8, 62, 2.2], [92, 82, 2.4]]) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-atop';
  const tg = ctx.createLinearGradient(0, 0, 0, 100);
  tg.addColorStop(0, 'rgba(180,235,240,0.10)');
  tg.addColorStop(1, 'rgba(40,110,130,0.16)');
  ctx.fillStyle = tg; ctx.fillRect(-5, -5, 110, 110);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.beginPath(); ctx.ellipse(50, 100, 50, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,45,55,0.28)'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function sprite(size: number, color: string, dpr: number): HTMLCanvasElement {
  const key = `${color}|${Math.round(size)}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 6) cache.clear();
  const c = document.createElement('canvas');
  const s = (size * dpr) / 100;
  c.width = c.height = Math.ceil(110 * s);
  const ctx = c.getContext('2d');
  if (ctx) { ctx.setTransform(s, 0, 0, s, 5 * s, 5 * s); paint(ctx, color); }
  cache.set(key, c);
  return c;
}

/** cx = castle center, baseY = where the castle rests on the sand. */
export function drawCastle(ctx: C, cx: number, baseY: number, size: number, color: string, alpha = 1, scale = 1) {
  if (alpha <= 0.001 || size <= 0) return;
  const dpr = Math.max(1, Math.min(3, Math.round(ctx.getTransform().a * 2) / 2));
  const img = sprite(size, color, dpr);
  const d = size * 1.1 * scale;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, cx - d / 2, baseY - d * (105 / 110), d, d);
  ctx.restore();
}

/** Bottom-left resting spot, kept clear of the left edge and above the Shop button. */
export function castleLayout(w: number, h: number, surfaceY: (x: number) => number) {
  const size = Math.max(84, Math.min(150, Math.min(w, h) * 0.26));
  const cx = 12 + size * 0.55;
  const baseY = Math.min(surfaceY(cx) + size * 0.05, h - 74);
  return { cx, baseY, size };
}