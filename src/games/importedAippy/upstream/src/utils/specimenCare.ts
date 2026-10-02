import type { Specimen } from './boutique.ts';
export type FoodKind = 'flake' | 'pellet' | 'algae' | 'prey';
export type FeedingPreference = 'day' | 'night' | 'any';
export interface SpecimenCare {
  /** Acquired vibrancy, independent of inherited palette and current condition. */
  colourQuality?: number;
  bornAtMs: number; lastCareAtMs: number; healthySeconds: number; nutrition: number;
  meals: { flake: number; algae: number; prey: number }; feedingPreference: FeedingPreference;
}
export const ADULT_HEALTHY_SECONDS = 600;
export const GUPPY_DIET = { flake: { minGrowth: 0, nutrition: 18 }, pellet: { minGrowth: 0, nutrition: 18 }, algae: { minGrowth: 0, nutrition: 14 }, prey: { minGrowth: 35, nutrition: 24 } } as const;
const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
const timestamp = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
export function ensureSpecimenCare(fish: Specimen, now = Date.now()): Specimen {
  if (fish.care) return fish;
  const at = timestamp(now);
  // Legacy age credit preserves already earned development, without granting new fry adulthood.
  const credit = Math.max(clamp(fish.growth) / 75 * ADULT_HEALTHY_SECONDS, fish.raisedSeconds || 0);
  return { ...fish, care: { colourQuality: fish.inherited?.bodyShape ? .35 + .65 * clamp(fish.growth) / 100 : 1, bornAtMs: Math.max(0, at - credit * 1000), lastCareAtMs: at, healthySeconds: credit, nutrition: Math.max(clamp(fish.growth), 45), meals: { flake: 0, algae: 0, prey: 0 }, feedingPreference: fish.origin === 'blueveil' ? 'night' : 'day' } };
}
export function advanceSpecimenCare(fish: Specimen, now = Date.now(), location: 'home' | 'growing' = 'home'): Specimen {
  const original = ensureSpecimenCare(fish, now), care = original.care!;
  const at = Math.max(care.lastCareAtMs, timestamp(now));
  const seconds = (at - care.lastCareAtMs) / 1000;
  if (!seconds) return original;
  const depletion = 100 / (location === 'home' ? 2700 : 840);
  const hunger = clamp(original.hunger - seconds * depletion);
  const healthyWindow = Math.max(0, (original.hunger - 20) / depletion);
  const vitality = original.traits.filter(trait => trait === 'vital').length;
  const recoveryRate = (1 + vitality * .2) / 120;
  const recoverySeconds = Math.min(seconds, Math.max(0, (original.hunger - 40) / depletion));
  const recoveryToHealthy = original.health >= 60 ? 0 : (60 - original.health) / recoveryRate;
  const healthySeconds = care.healthySeconds + (recoveryToHealthy <= recoverySeconds ? Math.max(0, Math.min(seconds, healthyWindow) - recoveryToHealthy) : 0);
  const starvingSeconds = Math.max(0, seconds - original.hunger / depletion);
  const health = Math.max(location === 'home' ? 40 : 0, clamp(clamp(original.health + recoverySeconds * recoveryRate) - starvingSeconds / 30));
  const timeCeiling = healthySeconds < ADULT_HEALTHY_SECONDS ? Math.min(74.99, healthySeconds / ADULT_HEALTHY_SECONDS * 75) : Math.min(100, 75 + (healthySeconds - ADULT_HEALTHY_SECONDS) / 24);
  const growth = Math.max(original.growth, Math.min(care.nutrition, timeCeiling));
  return { ...original, hunger, health, growth, raisedSeconds: Math.max(original.raisedSeconds, healthySeconds), care: { ...care, lastCareAtMs: at, healthySeconds, colourQuality: Math.min(1, (care.colourQuality ?? 1) + (healthySeconds - care.healthySeconds) / 1200 * clamp(care.nutrition) / 100) } };
}
export function feedSpecimen(fish: Specimen, kind: FoodKind, now = Date.now(), phase: 'day' | 'night' = 'day'): Specimen {
  const original = advanceSpecimenCare(fish, now, 'growing');
  const food = GUPPY_DIET[kind];
  if (!food || original.growth < food.minGrowth) return original;
  const care = original.care!, preference = care.feedingPreference;
  const vitality = original.traits.filter(trait => trait === 'vital').length;
  const benefit = food.nutrition * (1 + vitality * .12) * (preference === 'any' || preference === phase ? 1 : .75);
  const mealKind = kind === 'pellet' ? 'flake' : kind;
  return { ...original, hunger: clamp(original.hunger + benefit), health: clamp(original.health + benefit * .2 * (1 + vitality * .2)), care: { ...care, nutrition: clamp(care.nutrition + benefit), meals: { ...care.meals, [mealKind]: care.meals[mealKind] + 1 } } };
}
export function careSummary(fish: Specimen, now = Date.now()) {
  const care = ensureSpecimenCare(fish, now).care!;
  return { healthySeconds: care.healthySeconds, adultReadyInSeconds: Math.max(0, ADULT_HEALTHY_SECONDS - care.healthySeconds), nutrition: care.nutrition, feedingPreference: care.feedingPreference };
}

/** Renderer multiplier 0..1; inherited hue/pattern never changes. Legacy vibrancy defaults to 1. */
export function careColourQuality(fish: Specimen): number {
  const acquired = fish.care?.colourQuality ?? 1;
  const condition = .35 + .65 * (.7 * clamp(fish.health) + .3 * clamp(fish.hunger)) / 100;
  return clamp(acquired, 1) * condition;
}
