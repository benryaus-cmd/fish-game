import { makeColorfulPalette, type Fish } from '@/utils/fishModel';
import { STARTER } from '@/utils/fishSpecies';
import type { Specimen } from '@/utils/boutique';

export function applySpecimenAppearance(fish: Fish, specimen: Specimen) {
  const ornate = specimen.traits.filter(trait => trait === 'ornate').length;
  // Legacy individuals retain the exact pre-stock silhouette, including acquired ornamentation.
  const form = specimen.origin === 'legacy' ? undefined : specimen.inherited?.finForm;
  const base = form === 'short'
    ? { tailWidth: 0.68, tailLength: 0.7, finHeight: 0.72, pectoral: 0.85, notch: 0.74, lower: 0.97 }
    : form === 'fan'
      ? { tailWidth: 1.5, tailLength: 1.08, finHeight: 1.2, pectoral: 1.05, notch: 0.35, lower: 1 }
      : form === 'veil'
        ? { tailWidth: 1.2, tailLength: 1.65, finHeight: 1.5, pectoral: 1.3, notch: 0.42, lower: 1.18 }
        : { tailWidth: 1, tailLength: 1, finHeight: 1, pectoral: 1, notch: STARTER.tail.notch, lower: STARTER.tail.lower };
  fish.tr = {
    ...STARTER,
    tail: { ...STARTER.tail, TH: STARTER.tail.TH * base.tailWidth * (1 + ornate * 0.22), TL: STARTER.tail.TL * base.tailLength * (1 + ornate * 0.12), notch: base.notch, lower: base.lower },
    fins: STARTER.fins.map(fin => ({ ...fin, h: fin.h * base.finHeight * (1 + ornate * 0.22) })),
    pectLen: STARTER.pectLen * base.pectoral * (1 + ornate * 0.18),
  };
  return makeColorfulPalette(specimen.color, ornate ? '#fff0b3' : specimen.accent);
}

export function specimenModifiers(specimen: Specimen) {
  const swift = specimen.traits.filter(trait => trait === 'swift').length;
  const vital = specimen.traits.filter(trait => trait === 'vital').length;
  return { foodEfficiency: 1 + vital * 0.12, recoveryMultiplier: 1 + vital * 0.2, speedMultiplier: 1 + swift * 0.12, staminaDrainMultiplier: 1 + swift * 0.08 };
}
