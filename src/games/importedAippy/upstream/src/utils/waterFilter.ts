/** Water Filter state: fixed top-right placement, single passive-income accumulator, outlet bubbles and "+10" texts. */
export interface FilterLayout { x: number; y: number; W: number; H: number; outX: number; outY: number }
export interface FBubble { x: number; y: number; r: number; vy: number; ph: number; life: number }
export interface FText { x: number; y: number; t: number }
export interface FilterFx { alpha: number; t: number; income: number; nextBubble: number; bubbles: FBubble[]; texts: FText[] }

export const INCOME_INTERVAL = 30;
export const INCOME_AMOUNT = 10;
export const TEXT_LIFE = 1.7;
const MAX_BUBBLES = 8;
const MAX_TEXTS = 4;
const BUBBLE_LIFE = 4.5;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export const createFilterFx = (): FilterFx => ({ alpha: 0, t: 0, income: 0, nextBubble: 1.2, bubbles: [], texts: [] });

/** Anchored to the upper-right glass, below any top-right HUD control (`top`). */
export function filterLayout(w: number, h: number, top: number): FilterLayout {
  const W = Math.round(clamp(Math.min(w, h) * 0.11, 40, 62));
  const H = Math.round(W * 1.42);
  const x = w - W - 12;
  const y = Math.max(56, top);
  return { x, y, W, H, outX: x - W * 0.23, outY: y + H * 0.77 };
}

/**
 * `dt` drives visuals (follows motion speed); `realDt` drives income so it is exactly
 * +10 every 30.0 real seconds. One accumulator lives in this state — no timers are created.
 */
export function updateFilter(
  fx: FilterFx, dt: number, realDt: number, owned: boolean, L: FilterLayout,
  onIncome: (x: number, y: number) => void, onBubble: () => void,
) {
  if (!owned) {
    fx.alpha = 0; fx.income = 0; fx.bubbles.length = 0; fx.texts.length = 0;
    return;
  }
  fx.alpha = Math.min(1, fx.alpha + realDt / 1.2);
  fx.t += dt;
  fx.income += realDt;
  if (fx.income >= INCOME_INTERVAL) {
    fx.income -= INCOME_INTERVAL;
    if (fx.texts.length >= MAX_TEXTS) fx.texts.shift();
    fx.texts.push({ x: L.outX - L.W * 0.05, y: L.outY - L.H * 0.35, t: 0 });
    onIncome(L.outX, L.outY - L.H * 0.1);
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    fx.texts[i].t += realDt;
    if (fx.texts[i].t > TEXT_LIFE) fx.texts.splice(i, 1);
  }
  fx.nextBubble -= dt;
  if (fx.nextBubble <= 0) {
    fx.nextBubble = 1.1 + Math.random() * 1.8;
    if (fx.bubbles.length < MAX_BUBBLES) {
      fx.bubbles.push({
        x: L.outX - L.W * (0.05 + Math.random() * 0.2),
        y: L.outY + L.H * (0.3 + Math.random() * 0.35),
        r: 1 + Math.random() * 1.3,
        vy: 12 + Math.random() * 9,
        ph: Math.random() * 6.28,
        life: 0,
      });
      onBubble();
    }
  }
  for (let i = fx.bubbles.length - 1; i >= 0; i--) {
    const b = fx.bubbles[i];
    b.life += dt;
    b.y -= b.vy * dt;
    b.x += (Math.sin(b.life * 3 + b.ph) * 6 - 2.5) * dt;
    if (b.life > BUBBLE_LIFE || b.y < 6) fx.bubbles.splice(i, 1);
  }
}