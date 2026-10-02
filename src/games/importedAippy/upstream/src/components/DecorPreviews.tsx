import { useEffect, useRef } from 'react';
import { drawRock, type RockDef } from '@/utils/rockRender';
import { drawPlant, type PlantDef } from '@/utils/plantRender';

const W = 76, H = 52;
const ROCKS: { x: number; d: RockDef }[] = [
  { x: 34, d: { w: 1.45, h: 0.95, seed: 3, tone: 0 } },
  { x: 56, d: { w: 0.95, h: 0.42, seed: 8, tone: 1 } },
  { x: 16, d: { w: 0.5, h: 0.34, seed: 14, tone: 3 } },
];
const PLANTS: { x: number; d: PlantDef }[] = [
  { x: 44, d: { kind: 'tall', h: 2.1, seed: 31, tone: 1 } },
  { x: 26, d: { kind: 'grass', h: 1.6, seed: 11, tone: 0 } },
  { x: 58, d: { kind: 'leafy', h: 1.0, seed: 42, tone: 0 } },
];

function setup(cv: HTMLCanvasElement | null) {
  const ctx = cv?.getContext('2d');
  if (!cv || !ctx) return null;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return ctx;
}

/** Code-drawn Rock Set preview, using the same renderer as the aquarium rocks. */
export const RockPreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = setup(ref.current);
    if (!ctx) return;
    for (const r of ROCKS) drawRock(ctx, r.x, H - 8, r.d, 20, color);
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};

/** Code-drawn Aquatic Plants preview, using the same renderer as the aquarium plants. */
export const PlantPreview = ({ color }: { color: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = setup(ref.current);
    if (!ctx) return;
    for (const p of PLANTS) drawPlant(ctx, p.x, H - 5, p.d, 20, color, 0);
  }, [color]);
  return <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} aria-hidden="true" />;
};