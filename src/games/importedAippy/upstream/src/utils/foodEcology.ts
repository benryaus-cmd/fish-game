import type { Fish } from '@/utils/fishModel';
import { mulberry } from '@/utils/aquaTextures';
import { worldSurfaceY, WORLD_WIDTH } from '@/utils/worldCamera';
export type FoodKind = 'flake' | 'pellet' | 'algae' | 'prey';
export interface DietPolicy { foods: readonly FoodKind[]; preyMinimumGrowth: number; mouthSizeRatio: number }
// Authored guppy policy; future species can supply their own foods and mouth limits.
export const GUPPY_DIET: DietPolicy = { foods: ['flake', 'pellet', 'algae', 'prey'], preyMinimumGrowth: 35, mouthSizeRatio: 0.45 };
export function canEatFood(kind: FoodKind, growth: number, foodSize: number, fishLength: number, diet = GUPPY_DIET) {
  return diet.foods.includes(kind) && foodSize <= fishLength * diet.mouthSizeRatio && (kind !== 'prey' || growth >= diet.preyMinimumGrowth);
}
export const BITE_INTERVAL_SECONDS = 0.42;
export interface FoodParticle { x: number; y: number; size: number; kind: Exclude<FoodKind, 'prey'>; active: boolean; respawn: number; seed: number }
export function createFoodEcology(): FoodParticle[] {
  const rnd = mulberry(39151);
  const food: FoodParticle[] = Array.from({ length: 76 }, (_, i) => {
    const kind = i < 32 ? 'flake' : i < 50 ? 'pellet' : 'algae';
    const wallAlgae = kind === 'algae' && i < 56;
    const x = wallAlgae ? 52 : kind === 'flake' ? 225 + rnd() * 480 : 55 + rnd() * (WORLD_WIDTH - 110);
    const y = wallAlgae ? 500 + rnd() * 900 : kind === 'flake' ? 1340 + rnd() * 170 : kind === 'pellet' ? 90 + rnd() * 1200 : worldSurfaceY(x) - 12;
    return { x, y, size: kind === 'algae' ? 13 : kind === 'pellet' ? 7 : 8, kind, active: true, respawn: 0, seed: rnd() * 6.28 };
  });
  // One visible tutorial flake sits at the newborn's mouth; the rest form a nearby trail.
  Object.assign(food[0], { x: 414, y: 1520 });
  Object.assign(food[1], { x: 475, y: 1500 });
  Object.assign(food[2], { x: 545, y: 1470 });
  return food;
}
export function updateFoodEcology(food: FoodParticle[], dt: number) {
  for (const f of food) {
    if (!f.active) {
      f.respawn -= dt;
      if (f.respawn <= 0) { f.active = true; if (f.kind === 'pellet') f.y = 70; }
      continue;
    }
    if (f.kind === 'pellet') f.y = Math.min(worldSurfaceY(f.x) - 16, f.y + dt * 16);
  }
}
export function biteFood(food: FoodParticle[], mouth: {x:number;y:number}, fish: Fish, growth: number): FoodKind | null {
  const found = food.find(f => f.active && canEatFood(f.kind, growth, f.size, fish.L) && Math.hypot(f.x - mouth.x, f.y - mouth.y) <= fish.L * 0.27 + f.size);
  if (!found) return null;
  found.active = false; found.respawn = found.kind === 'algae' ? 18 : 8;
  return found.kind;
}
export function drawFoodEcology(ctx: CanvasRenderingContext2D, food: FoodParticle[], time: number) {
  for (const f of food) {
    if (!f.active) continue;
    ctx.save(); ctx.translate(f.x, f.y);
    if (f.kind === 'algae') {
      ctx.strokeStyle = '#84b85e'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, 7); ctx.quadraticCurveTo(i * 4 + Math.sin(time + f.seed) * 2, 0, i * 3 + 2, -7); ctx.stroke(); }
    } else if (f.kind === 'flake') {
      ctx.rotate(f.seed + Math.sin(time + f.seed) * 0.2); ctx.fillStyle = '#e7bd78';
      ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(1, -4); ctx.lineTo(5, 1); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9c683a'; ctx.lineWidth = 0.8; ctx.stroke();
    } else {
      ctx.fillStyle = '#b68650'; ctx.beginPath(); ctx.arc(0,0,3.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ebd09a';ctx.fillRect(-1,-2,2,1.5);
    }
    ctx.restore();
  }
}
