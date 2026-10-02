interface Crumb { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
interface Ripple { x: number; y: number; age: number; max: number; r: number }
export interface FeedFx { crumbs: Crumb[]; ripples: Ripple[] }

const MAX_CRUMBS = 12;
const MAX_RIPPLES = 4;
const TAU = Math.PI * 2;

export const createFeedFx = (): FeedFx => ({ crumbs: [], ripples: [] });

/** 1–3 tiny crumbs and one faint ripple at the bite moment. */
export function spawnBite(fx: FeedFx, x: number, y: number, L: number) {
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n && fx.crumbs.length < MAX_CRUMBS; i++) {
    fx.crumbs.push({
      x, y,
      vx: (Math.random() - 0.5) * L * 0.35, vy: -L * (0.04 + Math.random() * 0.12),
      life: 0, max: 0.7 + Math.random() * 0.5, r: L * (0.008 + Math.random() * 0.007),
    });
  }
  if (fx.ripples.length < MAX_RIPPLES) fx.ripples.push({ x, y, age: 0, max: 0.6, r: L * 0.14 });
}

export function updateFeedFx(fx: FeedFx, dt: number) {
  for (let i = fx.crumbs.length - 1; i >= 0; i--) {
    const c = fx.crumbs[i];
    c.life += dt;
    const k = Math.exp(-2.2 * dt);
    c.vx *= k; c.vy *= k;
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.life >= c.max) fx.crumbs.splice(i, 1);
  }
  for (let i = fx.ripples.length - 1; i >= 0; i--) {
    const r = fx.ripples[i];
    r.age += dt;
    if (r.age >= r.max) fx.ripples.splice(i, 1);
  }
}

export function drawFeedFx(ctx: CanvasRenderingContext2D, fx: FeedFx) {
  ctx.strokeStyle = 'rgba(232,248,255,1)';
  ctx.lineWidth = 1;
  for (const r of fx.ripples) {
    const k = r.age / r.max;
    ctx.globalAlpha = 0.2 * (1 - k) * (1 - k);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.9 * k), 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(190,146,96,1)';
  for (const c of fx.crumbs) {
    ctx.globalAlpha = 0.55 * (1 - c.life / c.max);
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}