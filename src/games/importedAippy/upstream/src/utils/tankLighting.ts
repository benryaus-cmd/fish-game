import { drawCaustics } from '@/utils/aquaScene';

export interface LightingView { x: number; y: number; width: number; height: number }
let sandLightBuffer: HTMLCanvasElement | null = null;
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));

/** Sand is the receiver: light follows the world floor and never fills the water wall. */
export function drawSandCaustics(
  ctx: CanvasRenderingContext2D, pattern: CanvasPattern, time: number, view: LightingView,
  surfaceY: (x: number) => number, daylight: number, worldHeight: number,
): void {
  const { x, y, width: w, height: h } = view;
  if (w <= 0 || h <= 0 || worldHeight <= 0 || !Number.isFinite(x + y + w + h + worldHeight)) return;
  if (!sandLightBuffer) sandLightBuffer = document.createElement('canvas');
  const width = Math.min(2048, Math.ceil(w / 64) * 64), height = Math.min(2048, Math.ceil(h / 64) * 64);
  if (sandLightBuffer.width !== width) sandLightBuffer.width = width;
  if (sandLightBuffer.height !== height) sandLightBuffer.height = height;
  const light = sandLightBuffer.getContext('2d');
  if (!light) return;
  const sx = Math.min(1, width / w), sy = Math.min(1, height / h);
  light.setTransform(1, 0, 0, 1, 0, 0); light.globalAlpha = 1; light.globalCompositeOperation = 'source-over'; light.clearRect(0, 0, width, height);
  light.setTransform(sx, 0, 0, sy, -x * sx, -y * sy);
  light.save(); light.beginPath(); light.moveTo(x, surfaceY(x));
  for (let px = x + 4; px < x + w; px += 4) light.lineTo(px, surfaceY(px));
  light.lineTo(x + w, surfaceY(x + w)); light.lineTo(x + w, worldHeight); light.lineTo(x, worldHeight); light.closePath(); light.clip();
  // Compressed vertical spacing projects the original caustic network onto the sand plane.
  drawCaustics(light, pattern, time, x, y, w, h, 1, 0.85, 0.24);
  const horizon = surfaceY(0) - 16;
  const fade = light.createLinearGradient(0, horizon, 0, Math.max(horizon + 40, worldHeight));
  fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(0.26, 'rgba(255,255,255,.8)'); fade.addColorStop(1, 'rgba(255,255,255,.6)');
  light.globalCompositeOperation = 'destination-in'; light.fillStyle = fade; light.fillRect(x, y, w, h); light.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.055 + clamp(daylight) * 0.245;
  ctx.drawImage(sandLightBuffer, 0, 0, w * sx, h * sy, x, y, w, h); ctx.restore();
}

/** Screen-space water volume: a gentle warm daylight wash or readable blue night depth. */
export function drawCycleTint(ctx: CanvasRenderingContext2D, width: number, height: number, daylight: number): void {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height)) return;
  const day = clamp(daylight), night = 1 - day;
  ctx.save();
  const volume = ctx.createLinearGradient(0, 0, width * 0.18, height);
  volume.addColorStop(0, `rgba(${Math.round(17 + day * 215)},${Math.round(39 + day * 191)},${Math.round(73 + day * 114)},${0.035 + night * 0.13})`);
  volume.addColorStop(0.55, `rgba(8,25,49,${night * 0.19})`);
  volume.addColorStop(1, `rgba(5,17,39,${night * 0.26})`);
  ctx.fillStyle = volume; ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.37, -height * 0.12, 0, width * 0.37, 0, height * 0.87);
  glow.addColorStop(0, `rgba(${Math.round(166 + day * 79)},${Math.round(204 + day * 33)},${Math.round(230 - day * 38)},${0.025 + day * 0.075})`);
  glow.addColorStop(1, 'rgba(187,225,232,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height); ctx.restore();
}
