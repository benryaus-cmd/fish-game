import { createFish, TAU, type Fish } from '@/utils/fishModel';
import { STARTER, type SpeciesTraits } from '@/utils/fishSpecies';

let nextId = 1;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/**
 * Creates a fish of the given species with its own personality and animation phase.
 * `entrance` = swims in from a screen edge (purchase); otherwise placed in open water (load).
 */
export function spawnFish(tr: SpeciesTraits, w: number, floorY: number, L: number, entrance: boolean, slot: number, total: number): Fish {
  const f = createFish(w, floorY, L, tr);
  f.id = nextId++;
  f.pSpeed = rnd(0.85, 1.15);
  f.pHeight = rnd(tr.heightLo, tr.heightHi);
  f.pTurn = rnd(0.8, 1.3);
  f.pRest = rnd(0.6, 1.5);
  f.pCurious = rnd(0.82, 1.2);
  f.pReact = rnd(0.7, 1.5);
  f.phase = rnd(0, TAU);
  f.finPhase = rnd(0, TAU);
  f.wander = rnd(0, TAU);
  f.prefY = f.pHeight;
  f.depth = f.depthTarget = rnd(0.95, 1.05);
  f.turnCool = rnd(1, 3);
  const top = L * 0.9, bot = Math.max(top + 1, floorY - L * 0.7);
  f.y = top + (bot - top) * clamp(f.pHeight + rnd(-0.1, 0.1), 0.05, 0.95);
  f.ty = f.y;
  const m = Math.min(L * 1.9, w * 0.3);
  let dir: 1 | -1;
  if (entrance) {
    const fromLeft = Math.random() < 0.5;
    dir = fromLeft ? 1 : -1;
    f.x = fromLeft ? -L * 0.45 : w + L * 0.45;
    f.tx = fromLeft ? w * rnd(0.45, 0.65) : w * rnd(0.35, 0.55);
    f.entering = true;
    f.fade = 0;
    f.cruise = 0.5;
    f.speed = L * 0.32;
    f.decide = 9;
  } else {
    const span = Math.max(1, w - 2 * m);
    f.x = m + span * ((slot + rnd(0.2, 0.8)) / Math.max(1, total));
    dir = Math.random() < 0.5 ? 1 : -1;
    f.tx = clamp(f.x + dir * w * rnd(0.2, 0.35), m, w - m);
    if ((f.tx - f.x) * dir < L) dir = dir === 1 ? -1 : 1;
    f.tx = clamp(f.x + dir * w * rnd(0.2, 0.35), m, w - m);
    f.cruise = rnd(tr.cruiseMin, tr.cruiseMin + tr.cruiseRange * 0.9);
    f.speed = L * f.cruise * 0.5;
    f.decide = rnd(2, 6);
  }
  f.dir = dir;
  f.yaw = f.yawBody = f.yawTail = dir === 1 ? 0 : Math.PI;
  return f;
}

export const spawnStarterFish = (w: number, floorY: number, L: number, entrance: boolean, slot: number, total: number) =>
  spawnFish(STARTER, w, floorY, L, entrance, slot, total);