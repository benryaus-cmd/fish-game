import { makeColorfulPalette, type Fish } from '@/utils/fishModel';
import { STARTER } from '@/utils/fishSpecies';
import type { Specimen } from '@/utils/boutique';

export function applySpecimenAppearance(fish: Fish, specimen: Specimen) {
  const ornate = specimen.traits.filter(trait => trait === 'ornate').length;
  fish.tr = {
    ...STARTER,
    tail: { ...STARTER.tail, TH: STARTER.tail.TH * (1 + ornate * 0.22), TL: STARTER.tail.TL * (1 + ornate * 0.12) },
    fins: STARTER.fins.map(fin => ({ ...fin, h: fin.h * (1 + ornate * 0.22) })),
    pectLen: STARTER.pectLen * (1 + ornate * 0.18),
  };
  return makeColorfulPalette(specimen.color, ornate ? '#fff0b3' : specimen.accent);
}

export function specimenModifiers(specimen: Specimen) {
  const swift = specimen.traits.filter(trait => trait === 'swift').length;
  return { speedMultiplier: 1 + swift * 0.12, staminaDrainMultiplier: 1 + swift * 0.08 };
}
