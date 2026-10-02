export interface Bubble {
  x: number; y: number; bx: number; r: number; vy: number; ph: number;
  fq: number; amp: number; drift: number; a: number; age: number; far: boolean;
}
export interface BubbleSim { list: Bubble[]; timer: number; burst: number; burstX: number; gap: number }

const MAX_BUBBLES = 22;
const rr = (a: number, b: number) => a + Math.random() * (b - a);

export function createBubbleSim(): BubbleSim {
  return { list: [], timer: 1.2, burst: 0, burstX: 0, gap: 0 };
}

function spawn(sim: BubbleSim, x: number, y: number, far: boolean, small: boolean): void {
  if (sim.list.length >= MAX_BUBBLES) return;
  const r = far ? rr(0.9, 2) : small ? rr(1.4, 2.6) : rr(2, 4.4);
  sim.list.push({
    x, y, bx: x, r,
    vy: far ? rr(10, 17) : rr(18, 26) + r * 2.5,
    ph: rr(0, 6.28), fq: rr(1, 1.8),
    amp: far ? rr(1, 2.5) : rr(2.5, 6),
    drift: rr(-3, 3),
    a: far ? rr(0.22, 0.38) : rr(0.5, 0.8),
    age: 0, far,
  });
}

export function updateBubbles(
  sim: BubbleSim, dt: number, w: number, h: number,
  surfaceY: (x: number) => number, amount: number, onPop: (r: number) => void,
): void {
  if (amount > 0) {
    sim.timer -= dt;
    if (sim.burst > 0) {
      sim.gap -= dt;
      if (sim.gap <= 0) {
        const x = sim.burstX + rr(-4, 4);
        spawn(sim, x, surfaceY(x) + 3, false, true);
        sim.burst--;
        sim.gap = rr(0.3, 0.8);
      }
    }
    if (sim.timer <= 0) {
      sim.timer = rr(1.8, 4.5) / amount;
      const roll = Math.random();
      const x = w * rr(0.06, 0.94);
      if (roll < 0.3) { sim.burstX = x; sim.burst = 2 + Math.floor(Math.random() * 3); sim.gap = 0; }
      else if (roll < 0.7) spawn(sim, x, surfaceY(x) + 3, false, false);
      else spawn(sim, x, h * rr(0.4, 0.7), true, false);
    }
  }
  const topY = h * 0.04;
  for (let i = sim.list.length - 1; i >= 0; i--) {
    const b = sim.list[i];
    b.age += dt;
    b.y -= b.vy * dt;
    b.bx += b.drift * dt;
    b.x = b.bx + Math.sin(b.ph + b.age * b.fq) * b.amp;
    if (b.y < topY) {
      if (!b.far && b.r > 2.4 && Math.random() < 0.45) onPop(b.r);
      sim.list.splice(i, 1);
    }
  }
}

export function drawBubbles(ctx: CanvasRenderingContext2D, sim: BubbleSim, sprite: HTMLCanvasElement, h: number, far: boolean): void {
  const topY = h * 0.04;
  const fadeRange = h * 0.24;
  for (const b of sim.list) {
    if (b.far !== far) continue;
    const fadeTop = Math.min(1, Math.max(0, (b.y - topY) / fadeRange));
    const fadeIn = Math.min(1, b.age / 1.2);
    const a = b.a * fadeTop * fadeIn;
    if (a <= 0.005) continue;
    const d = b.r * 2.14;
    const sq = 1 + Math.sin(b.ph + b.age * b.fq * 2) * 0.035;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, b.x - (d * sq) / 2, b.y - d / sq / 2, d * sq, d / sq);
  }
  ctx.globalAlpha = 1;
}