export interface Mote {
  x: number; y: number; vx: number; vy: number; r: number; a: number;
  age: number; life: number; ph: number; near: boolean;
}

const MAX_MOTES = 70;
const rr = (a: number, b: number) => a + Math.random() * (b - a);

function reset(m: Mote, w: number, h: number, fresh: boolean): void {
  m.x = Math.random() * w;
  m.y = Math.random() * h * 0.92;
  m.near = Math.random() < 0.1;
  m.r = m.near ? rr(2.2, 3.6) : rr(0.5, 1.7);
  m.a = m.near ? rr(0.05, 0.1) : rr(0.12, 0.34);
  m.vx = rr(-4, 4) * (m.near ? 1.6 : 1);
  m.vy = rr(-2.5, 1.5);
  m.life = rr(9, 22);
  m.age = fresh ? Math.random() * m.life : 0;
  m.ph = rr(0, 6.28);
}

export function createMotes(w: number, h: number, amount: number): Mote[] {
  const n = Math.min(MAX_MOTES, Math.max(0, Math.round(((w * h) / 9500) * amount)));
  const list: Mote[] = [];
  for (let i = 0; i < n; i++) {
    const m: Mote = { x: 0, y: 0, vx: 0, vy: 0, r: 1, a: 0, age: 0, life: 1, ph: 0, near: false };
    reset(m, w, h, true);
    list.push(m);
  }
  return list;
}

export function updateMotes(list: Mote[], dt: number, w: number, h: number): void {
  for (const m of list) {
    m.age += dt;
    if (m.age >= m.life) { reset(m, w, h, false); continue; }
    m.x += (m.vx + Math.sin(m.ph + m.age * 0.35) * 1.6) * dt;
    m.y += (m.vy + Math.cos(m.ph * 1.3 + m.age * 0.27) * 1.1) * dt;
    if (m.x < -8) m.x = w + 8; else if (m.x > w + 8) m.x = -8;
    if (m.y < -8) m.y = h * 0.9; else if (m.y > h) m.y = 0;
  }
}

export function drawMotes(ctx: CanvasRenderingContext2D, list: Mote[], sprite: HTMLCanvasElement, near: boolean): void {
  for (const m of list) {
    if (m.near !== near) continue;
    const a = m.a * Math.sin((Math.PI * m.age) / m.life);
    if (a <= 0.004) continue;
    const s = m.r * 3.2;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}