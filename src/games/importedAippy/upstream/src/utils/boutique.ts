import { getStock, type StockId, type ColorFamily, type FinForm } from './stockCatalog.ts';
export type { StockId, ColorFamily, FinForm } from './stockCatalog.ts';

/** The entire boutique and current excursion share one atomic JSON profile. */
export type Adaptation = 'swift' | 'ornate' | 'vital';
import type { SpecimenCare } from './specimenCare.ts';
import { ensureSpecimenCare, advanceSpecimenCare } from './specimenCare.ts';
import type { WorldClock } from './worldClock.ts';
import type { BreedingCycle } from './breeding.ts';
export interface Specimen {
  id: string;
  name: string;
  species: 'guppy';
  growth: number;
  health: number;
  /** 100 is fully fed; 0 is starving. Advances only during active play. */
  hunger: number;
  traits: Adaptation[];
  color: string;
  accent: string;
  raisedSeconds: number;
  care?: SpecimenCare;
  origin?: StockId;
  inherited?: { colorFamily: ColorFamily; finForm: FinForm; parents: string[] };
}
export interface ActiveRun { specimen: Specimen; x: number; y: number; stamina: number; source?: 'resident'; visitId?: string }
export interface BoutiqueSave {
  version: 1;
  coins: number;
  sales: number;
  kept: Specimen[];
  activeRun: ActiveRun | null;
  completedRunIds: string[];
  placements?: Record<string, 'home'>;
  worldClock?: WorldClock;
  breeding?: BreedingCycle | null;
}

const SAVE_KEY = 'aqualume.boutique.v1';
const CORAL = '#f47f69';
const GOLD = '#ffd36e';
const MAX_COINS = 1_000_000_000;
const MAX_SALES = 1_000_000;
export const NURSERY_CAPACITY = 100;
const MAX_KEPT = NURSERY_CAPACITY;
const MAX_HISTORY = 10_000;
let fallbackId = 0;

export function createBoutiqueSave(): BoutiqueSave {
  return { version: 1, coins: 0, sales: 0, kept: [], activeRun: null, completedRunIds: [], placements: {} };
}
export function createSpecimen(stockId: StockId = 'ordinary', id?: string): Specimen {
  const stock = getStock(stockId);
  const specimenId = id ?? globalThis.crypto?.randomUUID?.() ?? `guppy-${Date.now().toString(36)}-${(++fallbackId).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id: specimenId, name: stock?.name ?? 'Coral', species: 'guppy', growth: 0, health: 100, hunger: 100,
    traits: [], color: stock?.color ?? CORAL, accent: stock?.accent ?? GOLD, raisedSeconds: 0,
    origin: stock?.id ?? 'legacy',
    ...(stock ? { inherited: { colorFamily: stock.colorFamily, finForm: stock.finForm, parents: [] } } : {}),
  };
}
/** Pure candidate transaction. Commit this entire profile before installing it in UI state. */
export function startStockRun(save: BoutiqueSave, stockId: StockId, runId: string, now = Date.now()): BoutiqueSave {
  const stock = getStock(stockId);
  if (!stock || !validId(runId) || save.activeRun || !Number.isFinite(save.coins) || save.coins < stock.price
    || save.breeding?.id === runId || save.breeding?.offspring.id === runId || save.completedRunIds.includes(runId) || save.kept.some(specimen => specimen.id === runId)) return save;
  return {
    ...save,
    coins: save.coins - stock.price,
    activeRun: { specimen: ensureSpecimenCare(createSpecimen(stock.id, runId), now), x: 380, y: 1520, stamina: 100 },
  };
}
const bounded = (value: unknown, maximum: number, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : fallback;
export function getStage(growth: number): 'fry' | 'juvenile' | 'adult' {
  const value = bounded(growth, 100);
  return value >= 75 ? 'adult' : value >= 35 ? 'juvenile' : 'fry';
}
/** Disclosed nursery price: maturity + adaptations, multiplied by condition. */
export function appraiseFish(specimen: Specimen): number {
  const growth = bounded(specimen.growth, 100);
  if (growth < 10) return 0;
  const stagePremium = growth >= 75 ? 45 : growth >= 35 ? 18 : 0;
  const traitPremium = specimen.traits.filter(trait => trait === 'ornate' || trait === 'swift' || trait === 'vital').slice(0, 2)
    .reduce((total, trait) => total + (trait === 'ornate' ? 24 : trait === 'vital' ? 18 : 12), 0);
  const condition = 0.3 + bounded(specimen.health, 100) / 100 * 0.55 + bounded(specimen.hunger, 100) / 100 * 0.15;
  return Math.round((10 + growth * 1.2 + stagePremium + traitPremium) * condition);
}
function cloneSpecimen(specimen: Specimen): Specimen {
  return { ...specimen, ...(specimen.care ? { care: { ...specimen.care, meals: { ...specimen.care.meals } } } : {}), traits: [...specimen.traits], ...(specimen.inherited ? { inherited: { ...specimen.inherited, parents: [...specimen.inherited.parents] } } : {}) };
}
export function settleRun(save: BoutiqueSave, runId: string, kind: 'sell' | 'keep'): BoutiqueSave {
  const active = save.activeRun;
  const specimen = active?.specimen;
  const resident = active?.source === 'resident';
  const historyId = resident ? active?.visitId : runId;
  if (!specimen || !historyId || (specimen.id !== runId && (!resident || historyId !== runId)) || save.completedRunIds.includes(historyId) || save.kept.some(fish => fish.id === runId)
    || !Number.isFinite(specimen.growth) || (!resident && specimen.growth < 10) || (kind !== 'sell' && kind !== 'keep')
    || (kind === 'keep' && save.kept.length + (save.breeding ? 1 : 0) >= MAX_KEPT)) return save;
  return {
    ...save,
    coins: kind === 'sell' ? Math.min(MAX_COINS, save.coins + appraiseFish(specimen)) : save.coins,
    sales: kind === 'sell' ? Math.min(MAX_SALES, save.sales + 1) : save.sales,
    kept: kind === 'keep' ? [...save.kept, cloneSpecimen(specimen)] : save.kept,
    placements: kind === 'keep' ? { ...save.placements, [specimen.id]: 'home' } : save.placements,
    activeRun: null,
    completedRunIds: [...save.completedRunIds, historyId].slice(-MAX_HISTORY),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
}
function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
function readSpecimen(value: unknown): Specimen | null {
  if (!record(value) || !validId(value.id) || value.species !== 'guppy') return null;
  const origin: StockId = getStock(value.origin)?.id ?? 'legacy';
  const inherited = record(value.inherited) && ['silver', 'warm', 'cool'].includes(value.inherited.colorFamily as string)
    && ['short', 'fan', 'veil'].includes(value.inherited.finForm as string)
    ? {
      colorFamily: value.inherited.colorFamily as ColorFamily,
      finForm: value.inherited.finForm as FinForm,
      parents: Array.isArray(value.inherited.parents) ? [...new Set(value.inherited.parents.filter(validId))].slice(0, 2) : [],
    } : undefined;
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.slice(0, 40) : 'Coral',
    species: 'guppy',
    growth: bounded(value.growth, 100),
    health: bounded(value.health, 100, 100),
    hunger: bounded(value.hunger, 100, 100),
    traits: Array.isArray(value.traits) ? value.traits.filter((trait): trait is Adaptation => trait === 'swift' || trait === 'ornate' || trait === 'vital').slice(0, 2) : [],
    color: color(value.color, CORAL),
    accent: color(value.accent, GOLD),
    raisedSeconds: bounded(value.raisedSeconds, 604_800),
    origin,
    ...(inherited ? { inherited } : {}),
    ...(readCare(value.care) ? { care: readCare(value.care)! } : {}),
  };
}
function readSave(value: unknown): BoutiqueSave {
  if (!record(value) || value.version !== 1 || typeof value.coins !== 'number' || !Number.isFinite(value.coins)
    || typeof value.sales !== 'number' || !Number.isFinite(value.sales) || !Array.isArray(value.kept)
    || !Array.isArray(value.completedRunIds) || (value.activeRun !== null && !record(value.activeRun))) return createBoutiqueSave();
  const ids = new Set<string>();
  const kept: Specimen[] = [];
  for (const candidate of value.kept.slice(0, MAX_KEPT)) {
    const specimen = readSpecimen(candidate);
    if (specimen && !ids.has(specimen.id)) { ids.add(specimen.id); kept.push(specimen); }
  }
  const completedRunIds = [...new Set(value.completedRunIds.filter(validId))].slice(-MAX_HISTORY);
  let activeRun: ActiveRun | null = null;
  if (record(value.activeRun)) {
    const specimen = readSpecimen(value.activeRun.specimen);
    const resident = value.activeRun.source === 'resident' && validId(value.activeRun.visitId);
    if (specimen && !ids.has(specimen.id) && !(resident ? completedRunIds.includes(value.activeRun.visitId as string) : completedRunIds.includes(specimen.id))) {
      activeRun = { ...(resident ? { source: 'resident' as const, visitId: value.activeRun.visitId as string } : {}), specimen, x: bounded(value.activeRun.x, 100_000), y: bounded(value.activeRun.y, 100_000), stamina: bounded(value.activeRun.stamina, 100, 100) };
    }
  }
  const placements: Record<string, 'home'> = Object.fromEntries(kept.map(specimen => [specimen.id, 'home']));
  const worldClock = record(value.worldClock) && Number.isFinite(value.worldClock.startedAtMs) && Number.isFinite(value.worldClock.lastSeenMs) ? { startedAtMs: bounded(value.worldClock.startedAtMs, Number.MAX_SAFE_INTEGER), lastSeenMs: Math.max(bounded(value.worldClock.startedAtMs, Number.MAX_SAFE_INTEGER), bounded(value.worldClock.lastSeenMs, Number.MAX_SAFE_INTEGER)) } : undefined;
  const rawCycle = value.breeding;
  const child = record(rawCycle) ? readSpecimen(rawCycle.offspring) : null;
  const breeding = record(rawCycle) && validId(rawCycle.id) && !completedRunIds.includes(rawCycle.id) && Array.isArray(rawCycle.parentIds) && rawCycle.parentIds.length === 2 && rawCycle.parentIds[0] !== rawCycle.parentIds[1] && rawCycle.parentIds.every(id => validId(id) && ids.has(id)) && child && !ids.has(child.id) && kept.length < MAX_KEPT && Number.isFinite(rawCycle.startedAtMs) && Number.isFinite(rawCycle.readyAtMs) ? { id: rawCycle.id, parentIds: rawCycle.parentIds as [string,string], startedAtMs: bounded(rawCycle.startedAtMs, Number.MAX_SAFE_INTEGER), readyAtMs: Math.max(bounded(rawCycle.startedAtMs, Number.MAX_SAFE_INTEGER) + 120000, bounded(rawCycle.readyAtMs, Number.MAX_SAFE_INTEGER)), offspring: child } : undefined;
  return { ...(worldClock ? { worldClock } : {}), ...(breeding ? { breeding } : value.breeding === null ? { breeding: null } : {}), version: 1, coins: Math.floor(bounded(value.coins, MAX_COINS)), sales: Math.floor(bounded(value.sales, MAX_SALES)), kept, activeRun, completedRunIds, placements };
}
export function loadBoutique(storage?: Pick<Storage, 'getItem'>): BoutiqueSave {
  try {
    const source = storage ?? globalThis.localStorage;
    const json = source?.getItem(SAVE_KEY);
    return json ? readSave(JSON.parse(json)) : createBoutiqueSave();
  } catch { return createBoutiqueSave(); }
}
/** One setItem commits both the payout and the completed ID; false leaves caller in control. */
export function writeBoutique(save: BoutiqueSave, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const destination = storage ?? globalThis.localStorage;
    if (!destination) return false;
    destination.setItem(SAVE_KEY, JSON.stringify(readSave(save)));
    return true;
  } catch { return false; }
}

function readCare(value: unknown): SpecimenCare | undefined {
  if (!record(value) || !Number.isFinite(value.bornAtMs) || !Number.isFinite(value.lastCareAtMs) || !record(value.meals)) return undefined;
  const bornAtMs = bounded(value.bornAtMs, Number.MAX_SAFE_INTEGER);
  return { bornAtMs, lastCareAtMs: Math.max(bornAtMs, bounded(value.lastCareAtMs, Number.MAX_SAFE_INTEGER)), healthySeconds: bounded(value.healthySeconds, Number.MAX_SAFE_INTEGER), nutrition: bounded(value.nutrition,100), meals: { flake: bounded(value.meals.flake,1e9), algae: bounded(value.meals.algae,1e9), prey: bounded(value.meals.prey,1e9) }, feedingPreference: value.feedingPreference === 'night' || value.feedingPreference === 'any' ? value.feedingPreference : 'day' };
}
export function startResidentRun(save: BoutiqueSave, id: string, visitId: string, now = Date.now()): BoutiqueSave {
  const fish = save.kept.find(fish => fish.id === id);
  if (!fish || !validId(visitId) || save.activeRun || save.completedRunIds.includes(visitId) || save.kept.some(fish => fish.id === visitId) || save.breeding?.id === visitId || save.breeding?.parentIds.includes(id)) return save;
  const placements = { ...save.placements }; delete placements[id];
  return { ...save, kept: save.kept.filter(fish => fish.id !== id), placements, activeRun: { source: 'resident', visitId, specimen: advanceSpecimenCare(ensureSpecimenCare(fish,now),now,'home'), x:380,y:1520,stamina:100 } };
}
