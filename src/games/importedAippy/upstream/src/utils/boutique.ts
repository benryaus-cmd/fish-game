/** The entire boutique and current excursion share one atomic JSON profile. */
export type Adaptation = 'swift' | 'ornate';
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
}
export interface ActiveRun { specimen: Specimen; x: number; y: number; stamina: number }
export interface BoutiqueSave {
  version: 1;
  coins: number;
  sales: number;
  kept: Specimen[];
  activeRun: ActiveRun | null;
  completedRunIds: string[];
}

const SAVE_KEY = 'aqualume.boutique.v1';
const CORAL = '#f47f69';
const GOLD = '#ffd36e';
const MAX_COINS = 1_000_000_000;
const MAX_SALES = 1_000_000;
const MAX_KEPT = 100;
const MAX_HISTORY = 10_000;
let fallbackId = 0;

export function createBoutiqueSave(): BoutiqueSave {
  return { version: 1, coins: 0, sales: 0, kept: [], activeRun: null, completedRunIds: [] };
}
export function createSpecimen(): Specimen {
  const id = globalThis.crypto?.randomUUID?.() ?? `guppy-${Date.now().toString(36)}-${(++fallbackId).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return { id, name: 'Coral', species: 'guppy', growth: 0, health: 100, hunger: 100, traits: [], color: CORAL, accent: GOLD, raisedSeconds: 0 };
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
  const traitPremium = specimen.traits.filter(trait => trait === 'ornate' || trait === 'swift').slice(0, 2)
    .reduce((total, trait) => total + (trait === 'ornate' ? 24 : 12), 0);
  const condition = 0.3 + bounded(specimen.health, 100) / 100 * 0.55 + bounded(specimen.hunger, 100) / 100 * 0.15;
  return Math.round((10 + growth * 1.2 + stagePremium + traitPremium) * condition);
}
function cloneSpecimen(specimen: Specimen): Specimen {
  return { ...specimen, traits: [...specimen.traits] };
}
export function settleRun(save: BoutiqueSave, runId: string, kind: 'sell' | 'keep'): BoutiqueSave {
  const specimen = save.activeRun?.specimen;
  if (!specimen || specimen.id !== runId || save.completedRunIds.includes(runId) || save.kept.some(fish => fish.id === runId)
    || !Number.isFinite(specimen.growth) || specimen.growth < 10 || (kind !== 'sell' && kind !== 'keep')
    || (kind === 'keep' && save.kept.length >= MAX_KEPT)) return save;
  return {
    ...save,
    coins: kind === 'sell' ? Math.min(MAX_COINS, save.coins + appraiseFish(specimen)) : save.coins,
    sales: kind === 'sell' ? Math.min(MAX_SALES, save.sales + 1) : save.sales,
    kept: kind === 'keep' ? [...save.kept, cloneSpecimen(specimen)] : save.kept,
    activeRun: null,
    completedRunIds: [...save.completedRunIds, runId].slice(-MAX_HISTORY),
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
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.slice(0, 40) : 'Coral',
    species: 'guppy',
    growth: bounded(value.growth, 100),
    health: bounded(value.health, 100, 100),
    hunger: bounded(value.hunger, 100, 100),
    traits: Array.isArray(value.traits) ? value.traits.filter((trait): trait is Adaptation => trait === 'swift' || trait === 'ornate').slice(0, 2) : [],
    color: color(value.color, CORAL),
    accent: color(value.accent, GOLD),
    raisedSeconds: bounded(value.raisedSeconds, 604_800),
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
    if (specimen && !ids.has(specimen.id) && !completedRunIds.includes(specimen.id)) {
      activeRun = { specimen, x: bounded(value.activeRun.x, 100_000), y: bounded(value.activeRun.y, 100_000), stamina: bounded(value.activeRun.stamina, 100, 100) };
    }
  }
  return { version: 1, coins: Math.floor(bounded(value.coins, MAX_COINS)), sales: Math.floor(bounded(value.sales, MAX_SALES)), kept, activeRun, completedRunIds };
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
