import type { Specimen, Adaptation } from './boutique.ts';
export type FoodKind = 'flake' | 'pellet' | 'algae' | 'prey';
export type FeedingPreference = 'day' | 'night' | 'any';
export interface SpecimenCare {
  /** Acquired vibrancy, independent of inherited palette and current condition. */
  colourQuality?: number;
  development?: { resolvedStages: number[]; pending: { stage: number; slots: number; options: Adaptation[] }[] };
  bornAtMs: number; lastCareAtMs: number; healthySeconds: number; nutrition: number;
  meals: { flake: number; algae: number; prey: number }; feedingPreference: FeedingPreference;
}
export const ADULT_HEALTHY_SECONDS = 600;
export const GUPPY_DIET = { flake: { minGrowth: 0, nutrition: 18 }, pellet: { minGrowth: 0, nutrition: 18 }, algae: { minGrowth: 0, nutrition: 14 }, prey: { minGrowth: 35, nutrition: 24 } } as const;
const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
const timestamp = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
export function ensureSpecimenCare(fish: Specimen, now = Date.now()): Specimen {
  if (fish.care) return fish.care.development ? fish : { ...fish, care: { ...fish.care, development: { resolvedStages: [35,75].filter((stage,index) => fish.growth >= stage || fish.traits.length > index), pending: [] } } };
  const at = timestamp(now);
  // Legacy age credit preserves already earned development, without granting new fry adulthood.
  const credit = Math.max(clamp(fish.growth) / 75 * ADULT_HEALTHY_SECONDS, fish.raisedSeconds || 0);
  return { ...fish, care: { development: { resolvedStages: [35,75].filter((stage,index) => fish.growth >= stage || fish.traits.length > index), pending: [] }, colourQuality: fish.inherited?.bodyShape ? .35 + .65 * clamp(fish.growth) / 100 : 1, bornAtMs: Math.max(0, at - credit * 1000), lastCareAtMs: at, healthySeconds: credit, nutrition: Math.max(clamp(fish.growth), 45), meals: { flake: 0, algae: 0, prey: 0 }, feedingPreference: fish.origin === 'blueveil' ? 'night' : 'day' } };
}
export function advanceSpecimenCare(fish: Specimen, now = Date.now(), location: 'home' | 'growing' = 'home', presence: 'present' | 'away' = 'away'): Specimen {
  const ensured = ensureSpecimenCare(fish, now);
  const original = presence === 'away' ? resolvePendingAway(ensured) : ensured, care = original.care!;
  const at = Math.max(care.lastCareAtMs, timestamp(now));
  const seconds = (at - care.lastCareAtMs) / 1000;
  if (!seconds || original.health <= 0) return original;
  const depletion = 100 / (location === 'home' ? 2700 : 840);
  const hunger = clamp(original.hunger - seconds * depletion);
  const healthyWindow = Math.max(0, (original.hunger - 20) / depletion);
  const vitality = original.traits.filter(trait => trait === 'vital').length;
  const recoveryRate = (1 + vitality * .2) / 120;
  const recoverySeconds = Math.min(seconds, Math.max(0, (original.hunger - 40) / depletion));
  const recoveryToHealthy = original.health >= 60 ? 0 : (60 - original.health) / recoveryRate;
  const healthySeconds = care.healthySeconds + (recoveryToHealthy <= recoverySeconds ? Math.max(0, Math.min(seconds, healthyWindow) - recoveryToHealthy) : 0);
  // Split a long absence at the same milestone instant used by frame updates.
  const nextStage = [35,75].find(stage => original.growth < stage && care.nutrition >= stage && !care.development!.resolvedStages.includes(stage));
  if(nextStage) {
    const required = nextStage === 35 ? 280 : 600;
    const crossing = Math.max(0,required-care.healthySeconds)+recoveryToHealthy;
    const elapsedGate = nextStage === 75 ? Math.max(0,(care.bornAtMs+450_000-care.lastCareAtMs)/1000) : 0;
    const boundary = Math.max(crossing,elapsedGate);
    if(boundary > .000001 && boundary < seconds-.000001 && recoveryToHealthy <= recoverySeconds && boundary <= healthyWindow && healthySeconds >= required) {
      const milestone = advanceSpecimenCare(original,care.lastCareAtMs+boundary*1000,location,presence);
      return advanceSpecimenCare(milestone,at,location,presence);
    }
  }
  const starvingSeconds = Math.max(0, seconds - original.hunger / depletion);
  const health = Math.max(location === 'home' ? 40 : 0, clamp(clamp(original.health + recoverySeconds * recoveryRate) - starvingSeconds / 30));
  const timeCeiling = healthySeconds < ADULT_HEALTHY_SECONDS || (at-care.bornAtMs)/1000 < 450 ? Math.min(74.99, healthySeconds / ADULT_HEALTHY_SECONDS * 75) : Math.min(100, 75 + (healthySeconds - ADULT_HEALTHY_SECONDS) / 24);
  const rawGrowth = Math.max(original.growth, Math.min(care.nutrition, timeCeiling));
  const growth = [35,75].find(stage=>Math.abs(rawGrowth-stage)<1e-7) ?? rawGrowth;
  const advanced: Specimen = { ...original, ...(health <= 0 ? { deathAtMs: original.deathAtMs ?? care.lastCareAtMs + (original.hunger/depletion + clamp(original.health + recoverySeconds * recoveryRate)*30)*1000 } : {}), hunger, health, growth, raisedSeconds: Math.max(original.raisedSeconds, healthySeconds), care: { ...care, lastCareAtMs: at, healthySeconds, colourQuality: Math.min(1, (care.colourQuality ?? 1) + (healthySeconds - care.healthySeconds) / 1200 * clamp(care.nutrition) / 100) } };
  return resolveMilestones(original, advanced, presence, location);
}
export function feedSpecimen(fish: Specimen, kind: FoodKind, now = Date.now(), phase: 'day' | 'night' = 'day'): Specimen {
  const original = advanceSpecimenCare(fish, now, 'growing', 'present');
  if (original.health <= 0) return original;
  const food = GUPPY_DIET[kind];
  if (!food || original.growth < food.minGrowth) return original;
  const care = original.care!, preference = care.feedingPreference;
  const vitality = original.traits.filter(trait => trait === 'vital').length;
  const benefit = food.nutrition * (1 + vitality * .12) * (preference === 'any' || preference === phase ? 1 : .75);
  const mealKind = kind === 'pellet' ? 'flake' : kind;
  const overfed = original.hunger > 85;
  const credit = overfed ? 0 : Math.min(15, Math.max(0, 600-care.healthySeconds));
  const health = overfed ? clamp(original.health - Math.min(6, Math.max(0, original.hunger + benefit - 85) * .2)) : original.health;
  return { ...original, ...(health <= 0 ? {deathAtMs: original.deathAtMs ?? Math.max(care.lastCareAtMs,timestamp(now))}: {}), hunger: clamp(original.hunger + benefit), health, care: { ...care, healthySeconds: care.healthySeconds + credit, nutrition: overfed ? care.nutrition : clamp(care.nutrition + benefit), meals: { ...care.meals, [mealKind]: care.meals[mealKind] + 1 } } };
}
export function careSummary(fish: Specimen, now = Date.now()) {
  const care = ensureSpecimenCare(fish, now).care!;
  return { healthySeconds: care.healthySeconds, adultReadyInSeconds: Math.max(0, ADULT_HEALTHY_SECONDS - care.healthySeconds, 450 - Math.max(0, timestamp(now)-care.bornAtMs)/1000), nutrition: care.nutrition, feedingPreference: care.feedingPreference };
}

/** Renderer multiplier 0..1; inherited hue/pattern never changes. Legacy vibrancy defaults to 1. */
export function careColourQuality(fish: Specimen): number {
  const acquired = fish.care?.colourQuality ?? 1;
  const condition = .35 + .65 * (.7 * clamp(fish.health) + .3 * clamp(fish.hunger)) / 100;
  return clamp(acquired, 1) * condition;
}

const DEVELOPMENT_OPTIONS: Adaptation[] = ['swift','ornate','vital','vibrancy'];
function milestoneOptions(id: string, stage: number): Adaptation[] {
  let seed=stage; for(const char of id) seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;
  const options=[...DEVELOPMENT_OPTIONS];
  for(let i=options.length-1;i>0;i--){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [options[i],options[j]]=[options[j],options[i]]; }
  return options;
}
function resolveMilestones(before: Specimen, after: Specimen, presence: 'present'|'away', location: 'home'|'growing'): Specimen {
  const development=after.care!.development!;
  let result=after;
  for(const stage of [35,75]) {
    if(result.growth<stage || development.resolvedStages.includes(stage)) continue;
    const required=stage===35 ? 280 : 600;
    const healthyOffset=Math.max(0,required-before.care!.healthySeconds);
    const seconds=(after.care!.lastCareAtMs-before.care!.lastCareAtMs)/1000;
    const elapsedGate=stage===75 ? Math.max(0,(before.care!.bornAtMs+450_000-before.care!.lastCareAtMs)/1000) : 0;
    const offset=Math.min(seconds,Math.max(elapsedGate,healthyOffset+Math.max(0,(60-before.health)/((1+before.traits.filter(t=>t==='vital').length*.2)/120))));
    const hunger=clamp(before.hunger-offset*100/(location==='home'?2700:840));
    const health=clamp(before.health+Math.min(offset,Math.max(0,(before.hunger-40)/(100/(location==='home'?2700:840))))*(1+before.traits.filter(t=>t==='vital').length*.2)/120);
    const quality=(health+hunger)/2;
    const slots=quality<40?0:quality<70?1:quality<90?2:3;
    const options=milestoneOptions(before.id,stage);
    const next={resolvedStages:[...result.care!.development!.resolvedStages,stage],pending:[...result.care!.development!.pending]};
    if(presence==='present' && slots) next.pending.push({stage,slots,options});
    result={...result,traits:presence==='away'?[...result.traits,...options.slice(0,slots)]:result.traits,care:{...result.care!,development:next}};
  }
  return result;
}
export function chooseDevelopment(fish: Specimen, stage: number, traits: Adaptation[]): Specimen {
  const pending=fish.care?.development?.pending.find(choice=>choice.stage===stage);
  if(!pending || traits.length!==pending.slots || new Set(traits).size!==traits.length || traits.some(trait=>!pending.options.includes(trait))) return fish;
  return {...fish,traits:[...fish.traits,...traits],care:{...fish.care!,development:{...fish.care!.development!,pending:fish.care!.development!.pending.filter(choice=>choice.stage!==stage)}}};
}

function resolvePendingAway(fish: Specimen): Specimen {
  const pending=fish.care?.development?.pending;
  if(!pending?.length || fish.health<=0) return fish;
  return {...fish,traits:[...fish.traits,...pending.flatMap(choice=>milestoneOptions(fish.id,choice.stage).filter(trait=>choice.options.includes(trait)).slice(0,choice.slots))],care:{...fish.care!,development:{...fish.care!.development!,pending:[]}}};
}
