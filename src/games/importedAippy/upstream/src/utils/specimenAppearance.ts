import { makeColorfulPalette, type Fish } from '@/utils/fishModel';
import { COLORFUL, STARTER } from '@/utils/fishSpecies';
import { specimenBodyShape, specimenFinStyle } from '@/utils/stockCatalog';
import { mixHex } from '@/utils/colorUtils';
import { careColourQuality } from '@/utils/specimenCare';
import type { Specimen } from '@/utils/boutique';

export function inheritedFinForm(specimen: Specimen) {
  return specimen.origin === 'legacy' && !specimen.inherited?.bodyShape ? undefined : specimen.inherited?.finForm;
}

export function applySpecimenAppearance(fish: Fish, specimen: Specimen) {
  const ornate = specimen.traits.filter(trait => trait === 'ornate').length;
  // Historic legacy fish have no new body axis; bred legacy-origin children carry explicit inheritance.
  const form = inheritedFinForm(specimen);
  const base = form === 'short'
    ? { tailWidth: 0.68, tailLength: 0.7, finHeight: 0.72, pectoral: 0.85, notch: 0.74, lower: 0.97 }
    : form === 'fan'
      ? { tailWidth: 1.5, tailLength: 1.08, finHeight: 1.2, pectoral: 1.05, notch: 0.35, lower: 1 }
      : form === 'veil'
        ? { tailWidth: 1.2, tailLength: 1.65, finHeight: 1.5, pectoral: 1.3, notch: 0.42, lower: 1.18 }
        : { tailWidth: 1, tailLength: 1, finHeight: 1, pectoral: 1, notch: STARTER.tail.notch, lower: STARTER.tail.lower };
  const body = specimenBodyShape(specimen) === 'colorful' ? COLORFUL : STARTER;
  const style = specimenFinStyle(specimen);
  const fins = style === 'sail'
    ? [{ t0: 0.2, t1: 0.83, side: -1 as const, h: 0.42, skew: 0.4 }, { t0: 0.3, t1: 0.83, side: 1 as const, h: 0.34, skew: 0.45 }]
    : style === 'triangle' ? COLORFUL.fins : STARTER.fins;
  fish.tr = {
    ...body,
    tail: { ...body.tail, TH: body.tail.TH * base.tailWidth * (1 + ornate * 0.22), TL: body.tail.TL * base.tailLength * (1 + ornate * 0.12), notch: base.notch, lower: base.lower },
    fins: fins.map(fin => ({ ...fin, h: fin.h * base.finHeight * (1 + ornate * 0.22) })),
    pectLen: body.pectLen * base.pectoral * (1 + ornate * 0.18),
  };
  return specimenPalette(specimen);
}

/** Heredity fixes hue; maturity and today's care control saturation and sheen. */
export function specimenColour(specimen: Specimen, color: string): string {
  const maturity = 0.55 + Math.min(100, specimen.growth) / 100 * 0.45;
  const quality = Math.min(1.3, careColourQuality(specimen) + specimen.traits.filter(trait => trait === 'vibrancy').length * .12);
  return mixHex('#889496', color, maturity * (0.38 + quality * 0.62));
}
export function specimenPalette(specimen: Specimen) {
  const ornate = specimen.traits.includes('ornate');
  return makeColorfulPalette(specimenColour(specimen, specimen.color), specimenColour(specimen, ornate ? '#fff0b3' : specimen.accent));
}

export function specimenModifiers(specimen: Specimen) {
  const swift = specimen.traits.filter(trait => trait === 'swift').length;
  const vital = specimen.traits.filter(trait => trait === 'vital').length;
  return { foodEfficiency: 1 + vital * 0.12, recoveryMultiplier: 1 + vital * 0.2, speedMultiplier: 1 + swift * 0.12, staminaDrainMultiplier: 1 + swift * 0.08 };
}
