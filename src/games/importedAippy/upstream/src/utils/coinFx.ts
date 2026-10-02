/** Reward coins: pop at the fish's mouth, rise, pause, then arc (quadratic Bézier) to the HUD. */
export interface CoinFly {
  x: number; y: number; sx: number; sy: number; cx: number; cy: number; tx: number; ty: number;
  t: number; dur: number; rise: number; spin: number; r: number; amount: number;
}
export interface CoinFx { list: CoinFly[] }
export const createCoinFx = (): CoinFx => ({ list: [] });
export const MAX_FLYING = 10;

const POP_T = 0.44;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const outCubic = (v: number) => 1 - Math.pow(1 - clamp(v, 0, 1), 3);
const inOutCubic = (v: number) => { const t = clamp(v, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** Returns false when the flight cap is hit (caller then credits without animation). */
export function spawnCoin(fx: CoinFx, x: number, y: number, tx: number, ty: number, L: number, w: number, amount = 1): boolean {
  if (fx.list.length >= MAX_FLYING) return false;
  const rise = L * 0.32;
  const sx = x, sy = Math.max(12, y - rise);
  const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const bow = len * (0.2 + Math.random() * 0.16) * (Math.random() < 0.2 ? -0.6 : 1);
  const cx = clamp((sx + tx) / 2 + nx * bow, 10, w - 10);
  const cy = Math.max(6, (sy + ty) / 2 + ny * bow);
  fx.list.push({
    x, y, sx, sy, cx, cy, tx, ty, t: 0, rise: sy - y,
    dur: 0.62 + Math.min(0.4, len / 1400), spin: 5 + Math.random() * 3,
    r: clamp(L * 0.085, 7, 11), amount,
  });
  return true;
}

export function updateCoinFx(fx: CoinFx, dt: number, onArrive: (amount: number) => void) {
  for (let i = fx.list.length - 1; i >= 0; i--) {
    const c = fx.list[i];
    c.t += dt;
    if (c.t >= POP_T + c.dur) { fx.list.splice(i, 1); onArrive(c.amount); }
  }
}

const spriteCache = new Map<number, HTMLCanvasElement>();
const SS = 3;
function coinSprite(r: number): HTMLCanvasElement {
  const key = Math.round(r);
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const R = key * SS, size = R * 2 + 4;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  if (g) {
    g.translate(size / 2, size / 2);
    const k = R / 11.6;
    g.scale(k, k); // work in the same 24-unit space as the HUD icon, centred at 0,0
    g.fillStyle = '#a9772a';
    g.beginPath(); g.arc(0, 0.8, 10.9, 0, Math.PI * 2); g.fill();
    const rim = g.createLinearGradient(0, -11, 0, 11);
    rim.addColorStop(0, '#ffeab2'); rim.addColorStop(0.55, '#e6b956'); rim.addColorStop(1, '#b9862f');
    g.fillStyle = rim;
    g.beginPath(); g.arc(0, 0, 10.9, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(150,100,32,0.4)';
    g.beginPath(); g.arc(0, 0, 8.7, 0, Math.PI * 2); g.fill();
    const face = g.createRadialGradient(-1.6, -2.6, 0.5, 0, 0.35, 8.4);
    face.addColorStop(0, '#fff4cc'); face.addColorStop(0.55, '#f4d07a'); face.addColorStop(1, '#dfab4c');
    g.fillStyle = face;
    g.beginPath(); g.arc(0, 0.35, 8.4, 0, Math.PI * 2); g.fill();
    const sparkle = (oy: number) => {
      g.beginPath(); g.moveTo(0, -5.1 + oy);
      g.quadraticCurveTo(0.95, -0.95 + oy, 5.1, oy);
      g.quadraticCurveTo(0.95, 0.95 + oy, 0, 5.1 + oy);
      g.quadraticCurveTo(-0.95, 0.95 + oy, -5.1, oy);
      g.quadraticCurveTo(-0.95, -0.95 + oy, 0, -5.1 + oy);
      g.closePath(); g.fill();
    };
    g.fillStyle = 'rgba(168,112,36,0.5)'; sparkle(0.75);
    const sg = g.createLinearGradient(0, -5, 0, 5);
    sg.addColorStop(0, '#fffdf4'); sg.addColorStop(1, '#fbe2a0');
    g.fillStyle = sg; sparkle(0);
    g.fillStyle = 'rgba(255,250,240,0.9)';
    g.beginPath(); g.arc(4.4, -4.1, 0.95, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,252,240,0.75)'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 7.4, Math.PI * 1.13, Math.PI * 1.4); g.stroke();
  }
  spriteCache.set(key, cv);
  return cv;
}

export function drawCoinFx(ctx: CanvasRenderingContext2D, fx: CoinFx) {
  if (fx.list.length === 0) return;
  for (const c of fx.list) {
    const t = c.t;
    let x: number, y: number, s: number, a: number, sx = 1;
    if (t < POP_T) {
      s = t < 0.14 ? 0.7 + 0.38 * outCubic(t / 0.14) : 1.08 - 0.08 * smooth((t - 0.14) / 0.12);
      x = c.x;
      y = c.y + c.rise * outCubic(t / 0.34);
      a = smooth(t / 0.08);
    } else {
      const u = (t - POP_T) / c.dur, e = inOutCubic(u), m = 1 - e;
      x = m * m * c.sx + 2 * m * e * c.cx + e * e * c.tx;
      y = m * m * c.sy + 2 * m * e * c.cy + e * e * c.ty;
      s = 1 - 0.35 * smooth((u - 0.6) / 0.4);
      a = 1 - smooth((u - 0.8) / 0.2);
      sx = 0.84 + 0.16 * Math.cos((t - POP_T) * c.spin);
    }
    if (a <= 0.01) continue;
    const sp = coinSprite(c.r), hw = (sp.width / SS / 2) * s;
    ctx.globalAlpha = a;
    ctx.drawImage(sp, x - hw * sx, y - hw, hw * 2 * sx, hw * 2);
  }
  ctx.globalAlpha = 1;
}