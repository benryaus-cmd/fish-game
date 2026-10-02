import type { Fish, FishPalette } from '@/utils/fishModel';
import { fishScale } from '@/utils/fishModel';
import { drawFish, drawFishShadow } from '@/utils/fishRender';
import { createFeedBrain, type FeedBrain } from '@/utils/fishFeeding';
import type { SpeciesId } from '@/utils/fishSpecies';

export interface SchoolMember { fish: Fish; brain: FeedBrain }
export const makeMember = (fish: Fish): SchoolMember => ({ fish, brain: createFeedBrain(fish.id) });

export function countSpecies(list: SchoolMember[], id: SpeciesId): number {
  let n = 0;
  for (const m of list) if (m.fish.tr.id === id) n++;
  return n;
}

/** Soft steering apart — no hard collisions, small overlaps allowed. Works across species. */
export function separateSchool(list: SchoolMember[], dtRaw: number) {
  const dt = Math.min(dtRaw, 0.05);
  for (let i = 0; i < list.length; i++) {
    const a = list[i].fish;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j].fish;
      const R = (a.L + b.L) * 0.5;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > R || Math.abs(dy) > R * 0.7) continue;
      const d = Math.hypot(dx, dy * 1.4);
      if (d >= R) continue;
      const k = 1 - d / R;
      let ny = dy / Math.max(d, 1e-3);
      if (Math.abs(dy) < a.L * 0.08) ny = a.id < b.id ? 1 : -1;
      const nx = dx / Math.max(d, 1e-3);
      const L = (a.L + b.L) * 0.5;
      const push = k * k * L * 1.6 * dt;
      a.vy -= ny * push; b.vy += ny * push;
      a.x -= nx * push * 0.3; b.x += nx * push * 0.3;
      if (!a.seek) a.ty -= ny * push * 0.8;
      if (!b.seek) b.ty += ny * push * 0.8;
    }
  }
}

let off: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;

/** Fading fish is rendered to a reusable offscreen buffer so its layered parts fade as one. */
function drawFaded(ctx: CanvasRenderingContext2D, f: Fish, pal: FishPalette) {
  const half = fishScale(f) * Math.max(0.9, 0.6 + f.tr.tail.TL);
  const scale = ctx.getTransform().a || 1;
  const px = Math.ceil(half * 2 * scale);
  if (!off) { off = document.createElement('canvas'); offCtx = off.getContext('2d'); }
  if (!offCtx) { drawFish(ctx, f, pal); return; }
  if (off.width < px || off.height < px) { off.width = px; off.height = px; }
  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, px, px);
  offCtx.setTransform(scale, 0, 0, scale, -(f.x - half) * scale, -(f.y - half) * scale);
  drawFish(offCtx, f, pal);
  ctx.globalAlpha = f.fade * f.fade * (3 - 2 * f.fade);
  ctx.drawImage(off, 0, 0, px, px, f.x - half, f.y - half, half * 2, half * 2);
  ctx.globalAlpha = 1;
}

/** Farther fish first so closer ones overlap them naturally. */
export function drawSchool(ctx: CanvasRenderingContext2D, list: SchoolMember[], pals: Record<SpeciesId, FishPalette>, surfaceY: (x: number) => number) {
  list.sort((m1, m2) => m1.fish.depth - m2.fish.depth);
  for (const m of list) {
    const f = m.fish;
    const pal = pals[f.tr.id];
    if (f.fade >= 1) drawFishShadow(ctx, f, surfaceY);
    if (f.fade < 1) drawFaded(ctx, f, pal);
    else drawFish(ctx, f, pal);
  }
}