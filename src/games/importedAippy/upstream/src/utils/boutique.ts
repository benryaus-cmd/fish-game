import { getStock, type StockId, type ColorFamily, type FinForm, type BodyShape, type FinStyle, type ColorPattern, type OrnamentalSpecies } from './stockCatalog.ts';
export type { StockId, ColorFamily, FinForm, BodyShape, FinStyle, ColorPattern, OrnamentalSpecies } from './stockCatalog.ts';

/** The entire boutique and current excursion share one atomic JSON profile. */
export type Adaptation = 'swift' | 'ornate' | 'vital' | 'vibrancy';
import type { SpecimenCare } from './specimenCare.ts';
import { ensureSpecimenCare, advanceSpecimenCare } from './specimenCare.ts';
import type { WorldClock } from './worldClock.ts';
import type { BreedingCycle } from './breeding.ts';
export interface Specimen {
  id: string;
  name: string;
  species: OrnamentalSpecies;
  growth: number;
  health: number;
  /** 100 is fully fed; 0 is starving. Advances only during active play. */
  hunger: number;
  traits: Adaptation[];
  color: string;
  accent: string;
  raisedSeconds: number;
  care?: SpecimenCare;
  deathAtMs?: number;
  origin?: StockId;
  inherited?: { colorFamily: ColorFamily; finForm: FinForm; parents: string[]; bodyShape?: BodyShape; finStyle?: FinStyle; colorPattern?: ColorPattern };
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
  tankCare?: { dirt: number; lastUpdatedMs: number; pellets: number };
}

const SAVE_KEY = 'aqualume.boutique.v1';
const CORAL = '#f47f69';
const GOLD = '#ffd36e';
const MAX_COINS = 1_000_000_000;
const MAX_SALES = 1_000_000;
export const NURSERY_CAPACITY = 10;
/** Includes individuals swimming and the fry already reserved by a nursery cycle. */
export function ownedFishCount(save: BoutiqueSave): number {
  return save.kept.length + (save.activeRun ? 1 : 0) + (save.breeding ? 1 : 0);
}
const MAX_HISTORY = 10_000;
let fallbackId = 0;

export function createBoutiqueSave(): BoutiqueSave {
  return { version: 1, coins: 0, sales: 0, kept: [], activeRun: null, completedRunIds: [], placements: {} };
}
export function createSpecimen(stockId: StockId = 'ordinary', id?: string): Specimen {
  const stock = getStock(stockId);
  const specimenId = id ?? globalThis.crypto?.randomUUID?.() ?? `guppy-${Date.now().toString(36)}-${(++fallbackId).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id: specimenId, name: stock?.name ?? 'Coral', species: stock?.species ?? 'guppy', growth: 0, health: 100, hunger: 100,
    traits: [], color: stock?.color ?? CORAL, accent: stock?.accent ?? GOLD, raisedSeconds: 0,
    origin: stock?.id ?? 'legacy',
    ...(stock ? { inherited: { colorFamily: stock.colorFamily, finForm: stock.finForm, parents: [], bodyShape: stock.bodyShape, finStyle: stock.finStyle, colorPattern: stock.colorPattern } } : {}),
  };
}
/** Pure candidate transaction. Commit this entire profile before installing it in UI state. */
export function startStockRun(save: BoutiqueSave, stockId: StockId, runId: string, now = Date.now()): BoutiqueSave {
  const stock = getStock(stockId);
  if (!stock || !validId(runId) || save.activeRun || ownedFishCount(save) >= NURSERY_CAPACITY || !Number.isFinite(save.coins) || save.coins < stock.price
    || save.breeding?.id === runId || save.breeding?.offspring.id === runId || save.completedRunIds.includes(runId) || save.completedRunIds.includes(`sale:${runId}`) || save.kept.some(specimen => specimen.id === runId)) return save;
  return {
    ...save,
    coins: save.coins - stock.price,
    activeRun: { specimen: ensureSpecimenCare({...createSpecimen(stock.id, runId), hunger:70}, now), x: 380, y: 1520, stamina: 100 },
  };
}
/** A View purchase can safely park the currently selected individual before the new outing. */
function parkSelectedFish(save: BoutiqueSave): BoutiqueSave {
  const active = save.activeRun;
  if (!active) return save;
  if (active.specimen.health <= 0 || save.kept.some(f=>f.id===active.specimen.id)) return save;
  const historyId=active.source==='resident' ? active.visitId : active.specimen.id;
  const parked={...save,kept:[...save.kept,cloneSpecimen(active.specimen)],activeRun:null,
    placements:{...save.placements,[active.specimen.id]:'home' as const},
    completedRunIds:historyId?[...new Set([...save.completedRunIds,historyId])].slice(-MAX_HISTORY):save.completedRunIds};
  return parked;
}
export function purchaseStockRun(save: BoutiqueSave, stockId: StockId, runId: string, now = Date.now()): BoutiqueSave {
  const parked=parkSelectedFish(save);
  const next=startStockRun(parked,stockId,runId,now);
  return next===parked ? save : next;
}
/** Choosing another owned fish parks the current selection without a sale or ownership change. */
export function selectResidentRun(save: BoutiqueSave, id: string, visitId: string, now = Date.now()): BoutiqueSave {
  if(save.activeRun?.specimen.id===id)return save;
  const parked=parkSelectedFish(save),next=startResidentRun(parked,id,visitId,now);
  return next===parked ? save : next;
}
/** Persist a caught shrimp and its live care in the same profile as the one-credit reward. */
export function rewardShrimpCatch(save: BoutiqueSave, active: ActiveRun): BoutiqueSave {
  if (!save.activeRun || save.activeRun.specimen.id!==active.specimen.id || save.activeRun.visitId!==active.visitId) return save;
  return {...save,activeRun:active,coins:Math.min(MAX_COINS,save.coins+1)};
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
  const traitPremium = specimen.traits.filter(trait => trait === 'ornate' || trait === 'swift' || trait === 'vital' || trait === 'vibrancy').slice(0, 8)
    .reduce((total, trait) => total + (trait === 'ornate' ? 24 : trait === 'vibrancy' ? 22 : trait === 'vital' ? 18 : 12), 0);
  const condition = 0.3 + bounded(specimen.health, 100) / 100 * 0.55 + bounded(specimen.hunger, 100) / 100 * 0.15;
  return Math.round((10 + growth * 1.2 + stagePremium + traitPremium) * condition);
}
function cloneSpecimen(specimen: Specimen): Specimen {
  return { ...specimen, ...(specimen.care ? { care: { ...specimen.care, meals: { ...specimen.care.meals } } } : {}), traits: [...specimen.traits], ...(specimen.inherited ? { inherited: { ...specimen.inherited, parents: [...specimen.inherited.parents] } } : {}) };
}
/** Atomic sale of one owned individual; caller persists the returned profile before applying it. */
export function sellOwnedFish(save: BoutiqueSave, id: string): BoutiqueSave {
  const active = save.activeRun?.specimen.id === id ? save.activeRun : null;
  const specimen = active?.specimen ?? save.kept.find(fish => fish.id === id);
  const historyId = active ? (active.source === 'resident' ? active.visitId : id) : `sale:${id}`;
  if (!specimen || !historyId || specimen.health <= 0 || !Number.isFinite(specimen.growth)
    || save.completedRunIds.includes(historyId) || save.completedRunIds.includes(`sale:${id}`)) return save;
  const placements = { ...save.placements }; delete placements[id];
  const history = [...save.completedRunIds, historyId];
  if (active?.source === 'resident') history.push(`sale:${id}`);
  const cancelledCycle = save.breeding?.parentIds.includes(id) || save.breeding?.offspring.id === id;
  if (cancelledCycle && save.breeding && !history.includes(save.breeding.id)) history.push(save.breeding.id);
  return {
    ...save,
    coins: Math.min(MAX_COINS, save.coins + appraiseFish(specimen)),
    sales: Math.min(MAX_SALES, save.sales + 1),
    kept: save.kept.filter(fish => fish.id !== id),
    placements,
    activeRun: active ? null : save.activeRun,
    ...(cancelledCycle ? { breeding: null } : {}),
    completedRunIds: history.slice(-MAX_HISTORY),
  };
}
export function settleRun(save: BoutiqueSave, runId: string, kind: 'sell' | 'keep'): BoutiqueSave {
  const active = save.activeRun;
  const specimen = active?.specimen;
  const resident = active?.source === 'resident';
  const historyId = resident ? active?.visitId : runId;
  if (!specimen || !historyId || (specimen.id !== runId && (!resident || historyId !== runId)) || save.completedRunIds.includes(historyId) || save.kept.some(fish => fish.id === runId)
    || specimen.health <= 0 || !Number.isFinite(specimen.growth) || (kind !== 'sell' && kind !== 'keep')
    || (kind === 'keep' && !resident && specimen.growth < 10)) return save;
  if (kind === 'sell') return sellOwnedFish(save, specimen.id);
  // Returning an existing individual does not consume another ownership slot.
  return {
    ...save,
    kept: [...save.kept, cloneSpecimen(specimen)],
    placements: { ...save.placements, [specimen.id]: 'home' },
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
  if (!record(value) || !validId(value.id) || !['guppy', 'tropical', 'angelfish', 'seahorse'].includes(value.species as string)) return null;
  const origin: StockId = getStock(value.origin)?.id ?? 'legacy';
  const inherited = record(value.inherited) && ['silver', 'warm', 'cool'].includes(value.inherited.colorFamily as string)
    && ['short', 'fan', 'veil'].includes(value.inherited.finForm as string)
    ? {
      colorFamily: value.inherited.colorFamily as ColorFamily,
      finForm: value.inherited.finForm as FinForm,
      ...(['starter', 'colorful', 'angel', 'seahorse'].includes(value.inherited.bodyShape as string) ? { bodyShape: value.inherited.bodyShape as BodyShape } : {}),
      ...(['rounded', 'triangle', 'sail'].includes(value.inherited.finStyle as string) ? { finStyle: value.inherited.finStyle as FinStyle } : {}),
      ...(['solid', 'rainbow', 'banded', 'koi'].includes(value.inherited.colorPattern as string) ? { colorPattern: value.inherited.colorPattern as ColorPattern } : {}),
      parents: Array.isArray(value.inherited.parents) ? [...new Set(value.inherited.parents.filter(validId))].slice(0, 2) : [],
    } : undefined;
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.slice(0, 40) : 'Coral',
    species: value.species as OrnamentalSpecies,
    growth: bounded(value.growth, 100),
    health: bounded(value.health, 100, 100),
    hunger: bounded(value.hunger, 100, 100),
    traits: Array.isArray(value.traits) ? value.traits.filter((trait): trait is Adaptation => trait === 'swift' || trait === 'ornate' || trait === 'vital' || trait === 'vibrancy').slice(0, 8) : [],
    color: color(value.color, CORAL),
    accent: color(value.accent, GOLD),
    raisedSeconds: bounded(value.raisedSeconds, 604_800),
    ...(typeof value.deathAtMs === 'number' && Number.isFinite(value.deathAtMs) ? { deathAtMs: bounded(value.deathAtMs,Number.MAX_SAFE_INTEGER) } : {}),
    origin,
    ...(inherited ? { inherited } : {}),
    ...(readCare(value.care) ? { care: readCare(value.care)! } : {}),
  };
}
function readSave(value: unknown): BoutiqueSave {
  if (!record(value) || value.version !== 1 || typeof value.coins !== 'number' || !Number.isFinite(value.coins)
    || typeof value.sales !== 'number' || !Number.isFinite(value.sales) || !Array.isArray(value.kept)
    || !Array.isArray(value.completedRunIds) || (value.activeRun !== null && !record(value.activeRun))) return createBoutiqueSave();
  const completedRunIds = [...new Set(value.completedRunIds.filter(validId))].slice(-MAX_HISTORY);
  const ids = new Set<string>();
  const kept: Specimen[] = [];
  for (const candidate of value.kept) {
    const specimen = readSpecimen(candidate);
    if (specimen && !ids.has(specimen.id) && !completedRunIds.includes(`death:${specimen.id}`) && !completedRunIds.includes(`sale:${specimen.id}`)) { ids.add(specimen.id); kept.push(specimen); }
  }
  let activeRun: ActiveRun | null = null;
  if (record(value.activeRun)) {
    const specimen = readSpecimen(value.activeRun.specimen);
    const resident = value.activeRun.source === 'resident' && validId(value.activeRun.visitId);
    if (specimen && !ids.has(specimen.id) && !completedRunIds.includes(`death:${specimen.id}`) && !completedRunIds.includes(`sale:${specimen.id}`) && !(resident ? completedRunIds.includes(value.activeRun.visitId as string) : completedRunIds.includes(specimen.id))) {
      activeRun = { ...(resident ? { source: 'resident' as const, visitId: value.activeRun.visitId as string } : {}), specimen, x: bounded(value.activeRun.x, 100_000), y: bounded(value.activeRun.y, 100_000), stamina: bounded(value.activeRun.stamina, 100, 100) };
    }
  }
  const placements: Record<string, 'home'> = Object.fromEntries(kept.map(specimen => [specimen.id, 'home']));
  const worldClock = record(value.worldClock) && Number.isFinite(value.worldClock.startedAtMs) && Number.isFinite(value.worldClock.lastSeenMs) ? { startedAtMs: bounded(value.worldClock.startedAtMs, Number.MAX_SAFE_INTEGER), lastSeenMs: Math.max(bounded(value.worldClock.startedAtMs, Number.MAX_SAFE_INTEGER), bounded(value.worldClock.lastSeenMs, Number.MAX_SAFE_INTEGER)) } : undefined;
  const rawCycle = value.breeding;
  const child = record(rawCycle) ? readSpecimen(rawCycle.offspring) : null;
  const breeding = record(rawCycle) && validId(rawCycle.id) && !completedRunIds.includes(rawCycle.id) && Array.isArray(rawCycle.parentIds) && rawCycle.parentIds.length === 2 && rawCycle.parentIds[0] !== rawCycle.parentIds[1] && rawCycle.parentIds.every(id => validId(id) && ids.has(id)) && child && !ids.has(child.id) && Number.isFinite(rawCycle.startedAtMs) && Number.isFinite(rawCycle.readyAtMs) ? { id: rawCycle.id, parentIds: rawCycle.parentIds as [string,string], startedAtMs: bounded(rawCycle.startedAtMs, Number.MAX_SAFE_INTEGER), readyAtMs: Math.max(bounded(rawCycle.startedAtMs, Number.MAX_SAFE_INTEGER) + 120000, bounded(rawCycle.readyAtMs, Number.MAX_SAFE_INTEGER)), offspring: child } : undefined;
  const tankCare = record(value.tankCare) ? { dirt: bounded(value.tankCare.dirt,100), lastUpdatedMs: bounded(value.tankCare.lastUpdatedMs,Number.MAX_SAFE_INTEGER), pellets: bounded(value.tankCare.pellets,1e9) } : undefined;
  return { ...(tankCare ? {tankCare}: {}), ...(worldClock ? { worldClock } : {}), ...(breeding ? { breeding } : value.breeding === null ? { breeding: null } : {}), version: 1, coins: Math.floor(bounded(value.coins, MAX_COINS)), sales: Math.floor(bounded(value.sales, MAX_SALES)), kept, activeRun, completedRunIds, placements };
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
  const rawDevelopment=record(value.development) ? value.development : undefined;
  const development=rawDevelopment ? { resolvedStages: Array.isArray(rawDevelopment.resolvedStages) ? [...new Set(rawDevelopment.resolvedStages.filter((stage): stage is number => stage===35||stage===75))] : [], pending: Array.isArray(rawDevelopment.pending) ? rawDevelopment.pending.filter(record).filter(choice => (choice.stage===35||choice.stage===75) && Number.isInteger(choice.slots) && Number(choice.slots)>0 && Number(choice.slots)<=3 && Array.isArray(choice.options)).map(choice => ({stage:Number(choice.stage),slots:Number(choice.slots),options:[...new Set((choice.options as unknown[]).filter((trait): trait is Adaptation => trait==='swift'||trait==='ornate'||trait==='vital'||trait==='vibrancy'))]})).filter(choice=>choice.options.length>=choice.slots).slice(0,2) : [] } : undefined;
  return { ...(development ? {development}: {}), ...(typeof value.colourQuality === 'number' && Number.isFinite(value.colourQuality) ? { colourQuality: bounded(value.colourQuality, 1) } : {}), bornAtMs, lastCareAtMs: Math.max(bornAtMs, bounded(value.lastCareAtMs, Number.MAX_SAFE_INTEGER)), healthySeconds: bounded(value.healthySeconds, Number.MAX_SAFE_INTEGER), nutrition: bounded(value.nutrition,100), meals: { flake: bounded(value.meals.flake,1e9), algae: bounded(value.meals.algae,1e9), prey: bounded(value.meals.prey,1e9) }, feedingPreference: value.feedingPreference === 'night' || value.feedingPreference === 'any' ? value.feedingPreference : 'day' };
}
export function startResidentRun(save: BoutiqueSave, id: string, visitId: string, now = Date.now()): BoutiqueSave {
  const fish = save.kept.find(fish => fish.id === id);
  if (!fish || !validId(visitId) || save.activeRun || save.completedRunIds.includes(visitId) || save.kept.some(fish => fish.id === visitId) || save.breeding?.id === visitId || save.breeding?.parentIds.includes(id)) return save;
  const placements = { ...save.placements }; delete placements[id];
  return { ...save, kept: save.kept.filter(fish => fish.id !== id), placements, activeRun: { source: 'resident', visitId, specimen: advanceSpecimenCare(ensureSpecimenCare(fish,now),now,'home'), x:380,y:1520,stamina:100 } };
}

/** Atomic loss transaction: a dead individual closes once without any payout. */
export function finishDeath(save: BoutiqueSave, id: string, now=Date.now()): BoutiqueSave {
  const historyId=`death:${id}`;
  if(!Number.isFinite(now)) return save;
  const active=save.activeRun?.specimen.id===id ? save.activeRun : null;
  const fish=active?.specimen ?? save.kept.find(fish=>fish.id===id);
  if(!fish || fish.health>0 || save.completedRunIds.includes(historyId)) return save;
  const placements={...save.placements}; delete placements[id];
  const history=[...save.completedRunIds,historyId];
  if(active?.source==='resident' && active.visitId && !history.includes(active.visitId)) history.push(active.visitId);
  return {...save,kept:save.kept.filter(fish=>fish.id!==id),activeRun:active?null:save.activeRun,placements,breeding:save.breeding?.parentIds.includes(id) || save.breeding?.offspring.id===id ? null : save.breeding,completedRunIds:history.slice(-MAX_HISTORY)};
}

/** Naming changes identity text only; care, run state and breeding links stay intact. */
export function renameOwnedFish(save:BoutiqueSave,id:string,proposed:string):BoutiqueSave {
  const name=proposed.replace(/\s+/g,' ').trim().slice(0,40);
  const fish=save.activeRun?.specimen.id===id?save.activeRun.specimen:save.kept.find(f=>f.id===id);
  if(!name||!fish||fish.name===name)return save;
  return {...save,kept:save.kept.map(f=>f.id===id?{...f,name}:f),activeRun:save.activeRun?.specimen.id===id?{...save.activeRun,specimen:{...save.activeRun.specimen,name}}:save.activeRun};
}

/** Leaderboard score is the wallet after a new sale, never growth or death. */
export function creditScoreForSale(previous:BoutiqueSave,next:BoutiqueSave):number|null {
  return next.sales>previous.sales&&Number.isFinite(next.coins)&&next.coins>=0?Math.floor(next.coins):null;
}
