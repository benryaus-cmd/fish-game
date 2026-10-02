interface BubbleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface GlintParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface SurvivalJuiceFx {
  bubbles: BubbleParticle[];
  glints: GlintParticle[];
}

const MAX_BUBBLES = 40;
const MAX_GLINTS = 24;
const TAU = Math.PI * 2;

export function createSurvivalJuice(): SurvivalJuiceFx {
  return {
    bubbles: [],
    glints: [],
  };
}

// Burst bubble wake behind tail
export function spawnBurstWake(fx: SurvivalJuiceFx, tailX: number, tailY: number, dirX: number) {
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count && fx.bubbles.length < MAX_BUBBLES; i++) {
    fx.bubbles.push({
      x: tailX + (Math.random() - 0.5) * 8,
      y: tailY + (Math.random() - 0.5) * 8,
      vx: -dirX * (30 + Math.random() * 40) + (Math.random() - 0.5) * 15,
      vy: -15 - Math.random() * 25,
      r: 2.0 + Math.random() * 2.5,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      alpha: 0.7,
    });
  }
}

// Eating sparkles and glints
export function spawnEatGlints(fx: SurvivalJuiceFx, x: number, y: number, L: number) {
  const count = 4 + Math.floor(Math.random() * 4);
  const colors = ['#ffe8a3', '#ffffff', '#ffd073', '#8cedff'];
  for (let i = 0; i < count && fx.glints.length < MAX_GLINTS; i++) {
    const angle = Math.random() * TAU;
    const speed = 25 + Math.random() * 55;
    fx.glints.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 15,
      size: 2.5 + Math.random() * 3.0,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  // A couple of crisp bubbles on swallow
  for (let i = 0; i < 3 && fx.bubbles.length < MAX_BUBBLES; i++) {
    fx.bubbles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 20,
      vy: -20 - Math.random() * 30,
      r: 1.5 + Math.random() * 2.0,
      life: 0,
      maxLife: 0.7,
      alpha: 0.8,
    });
  }
}

export function updateSurvivalJuice(fx: SurvivalJuiceFx, dt: number) {
  for (let i = fx.bubbles.length - 1; i >= 0; i--) {
    const b = fx.bubbles[i];
    b.life += dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= Math.exp(-2.5 * dt);
    b.vy -= 15 * dt; // buoyant rise
    if (b.life >= b.maxLife) {
      fx.bubbles.splice(i, 1);
    }
  }

  for (let i = fx.glints.length - 1; i >= 0; i--) {
    const g = fx.glints[i];
    g.life += dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= Math.exp(-3.0 * dt);
    g.vy *= Math.exp(-3.0 * dt);
    if (g.life >= g.maxLife) {
      fx.glints.splice(i, 1);
    }
  }
}

export function drawSurvivalJuice(ctx: CanvasRenderingContext2D, fx: SurvivalJuiceFx) {
  // Bubbles
  ctx.strokeStyle = 'rgba(230, 250, 255, 0.85)';
  ctx.fillStyle = 'rgba(210, 245, 255, 0.4)';
  ctx.lineWidth = 1;

  for (const b of fx.bubbles) {
    const progress = b.life / b.maxLife;
    const a = b.alpha * (1 - progress);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (0.8 + 0.4 * progress), 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // Glints
  for (const g of fx.glints) {
    const progress = g.life / g.maxLife;
    const a = 1 - progress;
    ctx.globalAlpha = a;
    ctx.fillStyle = g.color;

    ctx.save();
    ctx.translate(g.x, g.y);
    const s = g.size * (1 - progress * 0.4);
    // Draw 4-point diamond sparkle
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.35, -s * 0.2);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.35, s * 0.2);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.35, s * 0.2);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.35, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}