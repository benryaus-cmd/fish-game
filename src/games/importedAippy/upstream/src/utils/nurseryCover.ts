import { NURSERY_ZONE, type WorldPlant } from '@/utils/worldCamera';
import type { Fish } from '@/utils/fishModel';
import { drawPlant } from '@/utils/plantRender';

/** Shelter is a world volume, independent of the foreground visibility treatment. */
export function isInNursery(x: number, y: number): boolean {
  return x >= NURSERY_ZONE.x0 && x <= NURSERY_ZONE.x1 &&
    y >= NURSERY_ZONE.y0 && y <= NURSERY_ZONE.y1;
}

interface CoverLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}
const layers = new WeakMap<WorldPlant[], CoverLayer>();

function coverLayer(plants: WorldPlant[]): CoverLayer | null {
  const cached = layers.get(plants);
  if (cached) return cached;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of plants) {
    // The full leaf length bounds even the widest, swaying leafy silhouette.
    const radius = p.h * p.S * 1.15 + 8;
    x0 = Math.min(x0, p.x - radius); x1 = Math.max(x1, p.x + radius);
    y0 = Math.min(y0, p.baseY - radius); y1 = Math.max(y1, p.baseY + 8);
  }
  if (!Number.isFinite(x0 + y0 + x1 + y1)) return null;
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  const width = Math.ceil(x1) - x0, height = Math.ceil(y1) - y0;
  // One reusable layer for the nursery; keep backing memory bounded for custom scenes.
  const scale = Math.min(1, 2048 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const result = { canvas, ctx, x: x0, y: y0, width, height, scale };
  layers.set(plants, result);
  return result;
}

/** Draw after creatures. Only foreground foliage over the player's body softens. */
export function drawNurseryCover(
  ctx: CanvasRenderingContext2D,
  plants: WorldPlant[],
  player: Fish | null,
  time: number,
  color: string
): void {
  if (plants.length === 0) return;
  if (!player || !isInNursery(player.x, player.y) || !Number.isFinite(player.L) || player.L <= 0) {
    for (const p of plants) drawPlant(ctx, p.x, p.baseY, p, p.S, color, time, 1, 'front');
    return;
  }
  const layer = coverLayer(plants);
  if (!layer) {
    for (const p of plants) drawPlant(ctx, p.x, p.baseY, p, p.S, color, time, 1, 'front');
    return;
  }
  const g = layer.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  g.setTransform(layer.scale, 0, 0, layer.scale, -layer.x * layer.scale, -layer.y * layer.scale);
  for (const p of plants) drawPlant(g, p.x, p.baseY, p, p.S, color, time, 1, 'front');

  const pitch = Number.isFinite(player.pitch + player.tilt) ? player.pitch + player.tilt : 0;
  const yaw = Number.isFinite(player.yawBody) ? player.yawBody : 0;
  const headingX = Math.cos(yaw) * Math.cos(pitch), headingY = -Math.sin(pitch);
  const projection = Math.hypot(headingX, headingY);
  const length = player.L * (Number.isFinite(player.depth) ? Math.max(0.2, player.depth) : 1);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.translate(player.x - headingX * length * 0.07, player.y - headingY * length * 0.07);
  g.rotate(Math.atan2(headingY, headingX));
  g.scale(length * Math.max(0.4, projection) * 0.76, length * 0.30);
  const fade = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  fade.addColorStop(0, 'rgba(0,0,0,0.76)');
  fade.addColorStop(0.55, 'rgba(0,0,0,0.70)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
  g.restore();
  ctx.drawImage(layer.canvas, 0, 0, layer.canvas.width, layer.canvas.height,
    layer.x, layer.y, layer.canvas.width / layer.scale, layer.canvas.height / layer.scale);
}
