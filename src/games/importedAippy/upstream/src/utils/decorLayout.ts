/** Predefined Rock Set + Aquatic Plants compositions for the bottom-center and bottom-right sand. */
import { castleLayout } from '@/utils/castleRender';
import { drawRock, type RockDef } from '@/utils/rockRender';
import { drawPlant, type PlantDef } from '@/utils/plantRender';

interface Piece { dx: number; dz: number; rock?: RockDef; plant?: PlantDef }
interface Placed { piece: Piece; x: number; y: number }
export interface DecorLayout { S: number; items: Placed[] }

// dx in decor-scale units from the cluster anchor; dz = depth (0 back → 0.5 front), listed back-to-front
const CENTER: Piece[] = [
  { dx: -0.75, dz: 0, plant: { kind: 'grass', h: 2.1, seed: 11, tone: 0 } },
  { dx: 0.6, dz: 0.08, plant: { kind: 'leafy', h: 1.05, seed: 23, tone: 1 } },
  { dx: -0.1, dz: 0.22, rock: { w: 1.45, h: 0.95, seed: 3, tone: 0 } },
  { dx: 0.85, dz: 0.38, rock: { w: 0.95, h: 0.42, seed: 8, tone: 1 } },
  { dx: -1.15, dz: 0.46, rock: { w: 0.5, h: 0.34, seed: 14, tone: 3 } },
];
const RIGHT: Piece[] = [
  { dx: 0.55, dz: 0, plant: { kind: 'tall', h: 3.0, seed: 31, tone: 1 } },
  { dx: 0.05, dz: 0.18, rock: { w: 1.25, h: 1.3, seed: 5, tone: 2 } },
  { dx: -0.5, dz: 0.3, plant: { kind: 'leafy', h: 1.15, seed: 42, tone: 0 } },
  { dx: 1.15, dz: 0.4, plant: { kind: 'grass', h: 1.0, seed: 37, tone: 2 } },
  { dx: -1.05, dz: 0.44, rock: { w: 0.42, h: 0.3, seed: 19, tone: 1 } },
  { dx: -0.78, dz: 0.5, rock: { w: 0.32, h: 0.24, seed: 21, tone: 3 } },
  { dx: -1.25, dz: 0.52, rock: { w: 0.28, h: 0.2, seed: 27, tone: 0 } },
];

let cached: DecorLayout = { S: 0, items: [] };
let lastW = -1, lastH = -1;
let lastSurf: ((x: number) => number) | null = null;

/** Recomputed only when the viewport or the sand surface changes. */
export function decorPlacement(w: number, h: number, surfaceY: (x: number) => number): DecorLayout {
  if (w === lastW && h === lastH && surfaceY === lastSurf) return cached;
  const S = Math.max(28, Math.min(52, Math.min(w, h) * 0.085));
  const castle = castleLayout(w, h, surfaceY);
  const centerX = Math.max(w * 0.5, castle.cx + castle.size * 0.5 + S * 1.6 + 8);
  const rightX = Math.max(centerX + S * 3, Math.min(w * 0.83, w - S * 1.5 - 10));
  const items: Placed[] = [];
  const place = (list: Piece[], ax: number) => {
    for (const piece of list) {
      const x = ax + piece.dx * S;
      items.push({ piece, x, y: Math.min(surfaceY(x) + S * (0.1 + piece.dz * 0.55), h - 70 + piece.dz * S * 0.3) });
    }
  };
  place(CENTER, centerX);
  place(RIGHT, rightX);
  cached = { S, items };
  lastW = w; lastH = h; lastSurf = surfaceY;
  return cached;
}

export function drawDecor(ctx: CanvasRenderingContext2D, L: DecorLayout, t: number, rockA: number, plantA: number, rockColor: string, plantColor: string) {
  for (const it of L.items) {
    const p = it.piece;
    if (p.rock && rockA > 0) drawRock(ctx, it.x, it.y, p.rock, L.S, rockColor, rockA);
    else if (p.plant && plantA > 0) drawPlant(ctx, it.x, it.y, p.plant, L.S, plantColor, t, plantA);
  }
}