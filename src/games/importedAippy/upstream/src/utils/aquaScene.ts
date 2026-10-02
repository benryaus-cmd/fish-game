import { getCausticTexture, getRaySprite, mulberry } from '@/utils/aquaTextures';
import { buildBackdrop, type WaterColors } from '@/utils/waterBackdrop';
import { buildSand, type SandLayer } from '@/utils/sandLayer';

export interface Ray { x: number; width: number; len: number; angle: number; alpha: number; ph: number; sp: number }
export interface Scene { backdrop: HTMLCanvasElement; sand: SandLayer; rays: Ray[] }

export function buildScene(w: number, h: number, colors: WaterColors): Scene {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sand = buildSand(w, h, dpr, colors.sand, colors.deep);
  const backdrop = buildBackdrop(w, h, dpr, colors, sand.top);
  const rnd = mulberry(99);
  const count = w < 600 ? 4 : Math.min(7, Math.round(w / 230));
  const rays: Ray[] = [];
  for (let i = 0; i < count; i++) {
    rays.push({
      x: ((i + 0.5 + (rnd() - 0.5) * 0.5) / count) * w * 1.05,
      width: Math.min(200, Math.max(70, w * 0.16)) * (0.7 + rnd() * 0.6),
      len: h * (0.65 + rnd() * 0.3),
      angle: 0.17 + (rnd() - 0.5) * 0.07,
      alpha: 0.045 + rnd() * 0.045,
      ph: rnd() * 6.28,
      sp: 0.025 + rnd() * 0.025,
    });
  }
  return { backdrop, sand, rays };
}

export function drawRays(ctx: CanvasRenderingContext2D, rays: Ray[], t: number, intensity: number): void {
  if (intensity <= 0) return;
  const sprite = getRaySprite();
  for (const r of rays) {
    const sway = Math.sin(t * r.sp + r.ph) * 18;
    const a = r.alpha * intensity * (0.7 + 0.3 * Math.sin(t * r.sp * 1.7 + r.ph * 2));
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.translate(r.x + sway, -30);
    ctx.rotate(r.angle + Math.sin(t * r.sp * 0.8 + r.ph) * 0.015);
    ctx.drawImage(sprite, -r.width / 2, 0, r.width, r.len);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

let pattern: CanvasPattern | null = null;
export function getCausticPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (!pattern) pattern = ctx.createPattern(getCausticTexture(), 'repeat');
  return pattern;
}

const TILE = 256;
function layer(ctx: CanvasRenderingContext2D, ox: number, oy: number, kx: number, ky: number, x: number, y: number, w: number, h: number): void {
  const mx = ox % (TILE * kx);
  const my = oy % (TILE * ky);
  ctx.save();
  ctx.translate(mx, my);
  ctx.scale(kx, ky);
  ctx.fillRect((x - mx) / kx, (y - my) / ky, w / kx, h / ky);
  ctx.restore();
}

/** Two slowly drifting caustic layers — their interference makes the shapes morph gradually. */
export function drawCaustics(
  ctx: CanvasRenderingContext2D, pat: CanvasPattern, t: number,
  x: number, y: number, w: number, h: number, alpha: number, kx: number, ky: number,
): void {
  if (alpha <= 0.001) return;
  ctx.fillStyle = pat;
  ctx.globalAlpha = alpha;
  layer(ctx, t * 5.2, t * 2.4, kx, ky, x, y, w, h);
  layer(ctx, 90 - t * 3.7, 40 + t * 3.3, kx * 1.31, ky * 1.31, x, y, w, h);
  ctx.globalAlpha = 1;
}

let waterLightBuffer: HTMLCanvasElement | null = null;

/** Full visible water lighting, attenuated in world depth rather than cropped in screen space. */
export function drawWaterCaustics(
  ctx: CanvasRenderingContext2D, pat: CanvasPattern, t: number,
  x: number, y: number, w: number, h: number, alpha: number, worldHeight: number,
): void {
  if (alpha <= 0 || w <= 0 || h <= 0 || !Number.isFinite(w + h + x + y) || worldHeight <= 0) return;
  if (!waterLightBuffer) waterLightBuffer = document.createElement('canvas');
  // Quantised dimensions avoid reallocating the buffer on every eased zoom frame.
  const width = Math.min(2048, Math.ceil(w / 64) * 64);
  const height = Math.min(2048, Math.ceil(h / 64) * 64);
  if (waterLightBuffer.width !== width) waterLightBuffer.width = width;
  if (waterLightBuffer.height !== height) waterLightBuffer.height = height;
  const light = waterLightBuffer.getContext('2d');
  if (!light) return;
  const sx = Math.min(1, width / w), sy = Math.min(1, height / h);
  light.setTransform(1, 0, 0, 1, 0, 0);
  light.globalCompositeOperation = 'source-over'; light.globalAlpha = 1;
  light.clearRect(0, 0, width, height);
  light.setTransform(sx, 0, 0, sy, -x * sx, -y * sy);
  drawCaustics(light, pat, t, x, y, w, h, 1, 1, 0.8);
  const depth = light.createLinearGradient(0, 0, 0, worldHeight);
  depth.addColorStop(0, 'rgba(255,255,255,1)');
  depth.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  depth.addColorStop(1, 'rgba(255,255,255,0.10)');
  light.globalCompositeOperation = 'destination-in'; light.fillStyle = depth;
  light.fillRect(x, y, w, h);
  light.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(waterLightBuffer, 0, 0, w * sx, h * sy, x, y, w, h);
  ctx.restore();
}
