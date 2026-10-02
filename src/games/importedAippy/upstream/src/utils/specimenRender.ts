import { drawSeahorse } from '@/utils/seahorseRender';
import { makeSeaPalette, type SeaPalette } from '@/utils/seahorsePalette';
import { specimenSeahorsePose, seahorseMouthPoint } from '@/utils/specimenSeahorse';
export { specimenSeahorsePose } from '@/utils/specimenSeahorse';
import { computePose, fishScale, makeColorfulPalette, type Fish, type FishPalette } from '@/utils/fishModel';
import { drawFish } from '@/utils/fishRender';
import { drawAngelfish } from '@/utils/angelRender';
import type { AngelPose } from '@/utils/angelModel';
import { makeAngelPalette, type AngelPalette } from '@/utils/angelPalette';
import { mouthWorld, M } from '@/utils/angelProject';
import { getFishMouthPos } from '@/utils/survivalEcology';
import { inheritedFinForm, specimenColour } from '@/utils/specimenAppearance';
import { specimenBodyShape, specimenFinStyle, specimenPattern } from '@/utils/stockCatalog';
import { careColourQuality } from '@/utils/specimenCare';
import type { Specimen } from '@/utils/boutique';

/** Reuse the controlled fish's continuous yaw, pitch and phase with the original diamond hull. */
export function specimenAngelPose(f: Fish, specimen: Specimen): AngelPose {
  const ornate = specimen.traits.filter(trait => trait === 'ornate').length;
  const form = inheritedFinForm(specimen);
  return {
    finScale: 1 + ornate * 0.12,
    tailLength: (form === 'short' ? 0.75 : form === 'veil' ? 1.3 : 1) * (1 + ornate * 0.12),
    tailWidth: (form === 'short' ? 0.8 : form === 'fan' ? 1.2 : 1) * (1 + ornate * 0.16),
    x: f.x, y: f.y, S: fishScale(f) * 0.64, fade: f.fade, rot: 0, pitch: f.pitch + f.tilt,
    finStyle: specimenFinStyle(specimen), bob: 0,
    yh: f.yaw, yb: f.yawBody, yp: f.yawTail, yt: f.yawTail, yf: f.yawTail,
    sway: f.amp * Math.sin(f.phase) * 0.07, bend: f.amp * Math.sin(f.phase - 1) * 0.1,
    drag: Math.min(0.5, Math.abs(f.speed) / Math.max(1, f.L) * 0.3), lift: Math.sin(f.pitch) * 0.2,
    finPh: f.finPhase, tailPh: f.phase, tailAmp: f.amp * 0.65,
    gape: f.mouth, recoil: 0, vary: [0,0,0,0,1],
  };
}
const palettes = new Map<string, { fish: FishPalette; angel: AngelPalette; sea: SeaPalette }>();
function appearance(specimen: Specimen) {
  const body = specimenColour(specimen, specimen.color);
  const accent = specimenColour(specimen, specimen.accent);
  const finAccent = specimen.traits.includes('ornate') ? specimenColour(specimen, '#fff0b3') : accent;
  const pattern = specimenPattern(specimen);
  const key = [body, accent, finAccent, pattern].join('/');
  const saved = palettes.get(key);
  if (saved) return saved;
  const angel = makeAngelPalette(body);
  angel.pattern = pattern;
  angel.accent = accent;
  const sea = makeSeaPalette(body);
  sea.blush = finAccent;
  sea.finEdge = finAccent;
  const value = { fish: makeColorfulPalette(body, finAccent), angel, sea };
  if (palettes.size >= 128) palettes.delete(palettes.keys().next().value!);
  palettes.set(key, value);
  return value;
}
export function drawSpecimenFish(ctx: CanvasRenderingContext2D, fish: Fish, _palette: FishPalette, specimen: Specimen) {
  const pal = appearance(specimen);
  if (specimenBodyShape(specimen) === 'seahorse') drawSeahorse(ctx, specimenSeahorsePose(fish, specimen), pal.sea);
  else if (specimenBodyShape(specimen) === 'angel') drawAngelfish(ctx, specimenAngelPose(fish,specimen),pal.angel);
  else drawFish(ctx,fish,pal.fish,specimenPattern(specimen),careColourQuality(specimen));
}
/** Contact uses precisely the same projected angel snout as its rendered mouth. */
export function specimenMouthPoint(fish: Fish, specimen: Specimen): { x: number; y: number } {
  if (specimenBodyShape(specimen) === 'seahorse') return seahorseMouthPoint(specimenSeahorsePose(fish, specimen));
  if (specimenBodyShape(specimen) === 'angel') {
    mouthWorld(specimenAngelPose(fish,specimen));
    return { x: M.x, y: M.y };
  }
  computePose(fish);
  return getFishMouthPos(fish);
}

/** Fit the authored silhouette, including inherited long tails and hybrid sails, into 180×110. */
export function fitSpecimenPortrait(fish: Fish, specimen: Specimen) {
  if (specimenBodyShape(specimen) === 'seahorse') {
    fish.L = 86 / (1 + specimen.traits.filter(trait => trait === 'ornate').length * .035);
    fish.x = 82; fish.y = 53;
    return;
  }
  if (specimenBodyShape(specimen) === 'angel') {
    fish.L = (66 + specimen.growth * 0.035) / (1 + specimen.traits.filter(trait => trait === 'ornate').length * 0.12); fish.x = 93; fish.y = 55;
    return;
  }
  const body = Math.max(...fish.tr.hh), tail = fish.tr.tail;
  const reach = (side: number) => Math.max(body, tail.TH * 1.1, ...fish.tr.fins.filter(fin => fin.side === side).map(fin => body * 0.7 + fin.h * 1.08));
  const up = reach(-1), down = reach(1);
  fish.L = Math.min(fish.L, 154 / (1 + tail.TL), 84 / (up + down + 0.06));
  fish.x = 90 + (0.16 + tail.TL) * fish.L * 0.5;
  fish.y = 55 + (up - down) * fish.L * 0.5;
}
