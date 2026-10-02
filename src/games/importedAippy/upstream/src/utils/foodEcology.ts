import type { Fish } from '@/utils/fishModel';
import { mulberry } from '@/utils/aquaTextures';
import { worldSurfaceY, WORLD_WIDTH } from '@/utils/worldCamera';
export type FoodKind = 'flake' | 'pellet' | 'algae' | 'prey' | 'blue';
export interface DietPolicy { foods: readonly FoodKind[]; preyMinimumGrowth: number; mouthSizeRatio: number }
// Authored guppy policy; future species can supply their own foods and mouth limits.
export const GUPPY_DIET: DietPolicy = { foods: ['flake', 'pellet', 'algae', 'prey', 'blue'], preyMinimumGrowth: 35, mouthSizeRatio: 0.45 };
export function canEatFood(kind: FoodKind, growth: number, foodSize: number, fishLength: number, diet = GUPPY_DIET) {
  return diet.foods.includes(kind) && foodSize <= fishLength * diet.mouthSizeRatio && (kind !== 'prey' || growth >= diet.preyMinimumGrowth);
}
export const BITE_INTERVAL_SECONDS = 0.42;
export interface FoodParticle { x: number; y: number; size: number; kind: Exclude<FoodKind, 'prey'>; active: boolean; respawn: number; seed: number }
export function createFoodEcology(): FoodParticle[] {
  const rnd = mulberry(39151);
  const food: FoodParticle[] = Array.from({ length: 108 }, (_, i) => {
    const kind = i >= 76 ? (i % 2 === 0 ? 'flake' : 'pellet') : i === 46 || i === 49 ? 'blue' : i < 32 ? 'flake' : i < 50 ? 'pellet' : 'algae';
    const wallAlgae = kind === 'algae';
    const x = wallAlgae ? (i % 2 === 0 ? 2 : WORLD_WIDTH - 2) : kind === 'flake' ? 200 + rnd() * (WORLD_WIDTH - 400) : 55 + rnd() * (WORLD_WIDTH - 110);
    const y = wallAlgae ? 160 + rnd() * 1260 : 90 + rnd() * 1050;
    return { x, y, size: kind === 'algae' ? 13 : kind === 'pellet' || kind === 'blue' ? 7 : 8, kind, active: true, respawn: 0, seed: rnd() * 6.28 };
  });
  // One visible tutorial flake sits at the newborn's mouth; the rest form a nearby trail.
  Object.assign(food[0], { x: 414, y: 1520 });
  Object.assign(food[1], { x: 475, y: 1500 });
  Object.assign(food[2], { x: 545, y: 1470 });
  return food;
}
export function updateFoodEcology(food: FoodParticle[], dt: number) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 60)) : 0;
  const step = Math.min(elapsed, .1);
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    if (!f.active) {
      f.respawn -= elapsed;
      if (f.respawn <= 0) { f.active = true; if (f.kind === 'pellet') f.y = 70; }
      continue;
    }
    // Keep three reachable nursery flakes; the main food supply drifts higher up.
    if (f.kind !== 'algae' && i > 2) {
      f.seed += step * .11;
      f.x = Math.max(25, Math.min(WORLD_WIDTH - 25, f.x + Math.sin(f.seed) * step * 4));
      f.y = Math.max(80, Math.min(1200, f.y + Math.cos(f.seed * .7) * step * 2));
    }
  }
}
export function biteFood(food: FoodParticle[], mouth: {x:number;y:number}, fish: Fish, growth: number): FoodKind | null {
  const found = food.find(f => f.active && canEatFood(f.kind, growth, f.size, fish.L) && Math.hypot(f.x - mouth.x, f.y - mouth.y) <= fish.L * 0.27 + f.size);
  if (!found) return null;
  found.active = false; found.respawn = found.kind === 'algae' ? 18 : found.kind === 'blue' ? 35 : 8;
  return found.kind;
}
export function drawFoodEcology(ctx: CanvasRenderingContext2D, food: FoodParticle[], time: number, view?: {x:number;y:number;width:number;height:number}, consumer?: FoodConsumer) {
  const tau = Math.PI * 2;
  for (const f of food) {
    if (!f.active || (view && (f.x + 30 < view.x || f.x - 30 > view.x + view.width || f.y + 30 < view.y || f.y - 30 > view.y + view.height))) continue;
    ctx.save(); ctx.translate(f.x, f.y);
    if (consumer && foodIsNearbyEdible(f, consumer)) drawEdibleGlow(ctx, f.size, time + f.seed);
    if (f.kind === 'algae') {
      // Every tuft grows from one attached receiver, with fine, unequal filaments.
      ctx.rotate(f.x < WORLD_WIDTH / 2 ? Math.PI / 2 : -Math.PI / 2);
      const variation = .8 + .2 * Math.sin(f.seed * 3);
      const base = ctx.createRadialGradient(0, 1, 0, 0, 1, 9);
      base.addColorStop(0, 'rgba(55,92,46,.48)'); base.addColorStop(1, 'rgba(55,92,46,0)');
      ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, 1, 10, 3.5, 0, 0, tau); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const phase = f.seed * 2.7 + i * 2.13;
        const root = (i - 4) * 1.2;
        const h = (10 + (Math.sin(phase) + 1) * 5) * variation;
        const sway = Math.sin(time * .75 + phase * .12) * 2;
        const reach = root * 1.4 + Math.sin(phase) * 2 + sway;
        const color = ctx.createLinearGradient(0, 1, 0, -h);
        color.addColorStop(0, '#365b37'); color.addColorStop(.5, '#68924c'); color.addColorStop(1, '#a5ba72');
        ctx.strokeStyle = color; ctx.lineWidth = .7 + (i % 3) * .2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(root, 0); ctx.bezierCurveTo(root + sway * .3, -h * .35, reach - sway, -h * .7, reach, -h); ctx.stroke();
      }
    } else if (f.kind === 'flake') {
      ctx.rotate(f.seed + Math.sin(time * .6 + f.seed) * .16);
      ctx.scale(.9 + Math.sin(f.seed * 3) * .12, .85 + Math.cos(f.seed * 2) * .14);
      ctx.fillStyle = 'rgba(64,38,20,.12)'; ctx.beginPath(); ctx.ellipse(1.2, 2.1, 5.6, 2.5, 0, 0, tau); ctx.fill();
      const amber = ctx.createLinearGradient(-3, -5, 4, 4);
      amber.addColorStop(0, '#f4d08c'); amber.addColorStop(.4, '#dca253'); amber.addColorStop(1, '#a8692d');
      ctx.fillStyle = amber;
      ctx.beginPath(); ctx.moveTo(-5.7, -1.6); ctx.quadraticCurveTo(-3.6, -5.3, -.7, -3.5); ctx.quadraticCurveTo(1.8, -5.2, 4.8, -1.1); ctx.quadraticCurveTo(6, 1.9, 2.2, 2.5); ctx.quadraticCurveTo(-.9, 5.2, -4.5, 2.3); ctx.quadraticCurveTo(-3.8, .6, -5.7, -1.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(118,70,27,.8)'; ctx.lineWidth = .65; ctx.stroke();
      ctx.strokeStyle = '#f5d9a4'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-1.2, -3.3, 1, -.8); ctx.stroke();
      ctx.strokeStyle = 'rgba(130,76,31,.45)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.quadraticCurveTo(1, .3, 3.4, .8); ctx.stroke();
    } else {
      const r = f.size * .5;
      ctx.fillStyle = 'rgba(36,25,15,.18)'; ctx.beginPath(); ctx.ellipse(.8, 2.5, r * 1.2, r * .55, 0, 0, tau); ctx.fill();
      const pellet = ctx.createRadialGradient(-r * .35, -r * .4, .1, .3, .5, r * 1.2);
      pellet.addColorStop(0, f.kind === 'blue' ? '#c4f5ff' : '#e7c28a'); pellet.addColorStop(.25, f.kind === 'blue' ? '#6bd6f2' : '#c69c61'); pellet.addColorStop(.75, f.kind === 'blue' ? '#338ccf' : '#976331'); pellet.addColorStop(1, f.kind === 'blue' ? '#255582' : '#674323');
      ctx.fillStyle = pellet; ctx.beginPath(); ctx.arc(0, 0, r, 0, tau); ctx.fill();
      ctx.strokeStyle = 'rgba(87,55,25,.55)'; ctx.lineWidth = .5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,236,193,.55)'; ctx.beginPath(); ctx.ellipse(-r * .3, -r * .43, r * .31, r * .16, -.5, 0, tau); ctx.fill();
    }
    ctx.restore();
  }
}

export interface FoodConsumer { x:number; y:number; L:number; growth:number }
/** Discovery and deliberate bites share one authored diet and mouth-size policy. */
export function foodIsNearbyEdible(food:{x:number;y:number;size:number;kind:FoodKind;active:boolean}, consumer:FoodConsumer) {
  return food.active && canEatFood(food.kind, consumer.growth, food.size, consumer.L)
    && Math.hypot(food.x-consumer.x,food.y-consumer.y) <= Math.max(110, consumer.L*2.4);
}
export function drawEdibleGlow(ctx:CanvasRenderingContext2D,size:number,time:number) {
 const radius=size+13+Math.sin(time*2)*2;
 const glow=ctx.createRadialGradient(0,0,size*.35,0,0,radius);
 glow.addColorStop(0,'rgba(222,244,165,.24)');glow.addColorStop(.55,'rgba(213,242,144,.16)');glow.addColorStop(1,'rgba(213,242,144,0)');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
}
