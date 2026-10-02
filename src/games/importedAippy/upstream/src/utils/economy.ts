/** Single source of truth for the coin economy, owned fish + local save (version 3). */
const SAVE_KEY = 'serene-aquarium-save';
const SAVE_VERSION = 3;
export const STARTING_COINS = 5;
export const STARTER_FISH_PRICE = 8;
export const MAX_STARTER_FISH = 6;
export const COLORFUL_FISH_PRICE = 18;
export const MAX_COLORFUL_FISH = 4;
export const CRAB_PRICE = 30;
export const MAX_CRAB = 3;
export const STARFISH_PRICE = 40;
export const MAX_STARFISH = 3;
export const SEAHORSE_PRICE = 50;
export const MAX_SEAHORSE = 3;
export const SHRIMP_PRICE = 65;
export const MAX_SHRIMP = 3;
export const ANGELFISH_PRICE = 85;
export const MAX_ANGELFISH = 3;
export const WATER_FILTER_PRICE = 40;
export const SMALL_CASTLE_PRICE = 35;
export const ROCK_SET_PRICE = 20;
export const AQUATIC_PLANTS_PRICE = 25;
const COIN_CAP = 999_999_999;

export type CreatureKey = 'starterFish' | 'colorfulFish' | 'crab' | 'starfish' | 'seahorse' | 'shrimp' | 'angelfish';
export const FISH_SHOP: Record<CreatureKey, { price: number; max: number; min: number }> = {
  starterFish: { price: STARTER_FISH_PRICE, max: MAX_STARTER_FISH, min: 1 },
  colorfulFish: { price: COLORFUL_FISH_PRICE, max: MAX_COLORFUL_FISH, min: 0 },
  crab: { price: CRAB_PRICE, max: MAX_CRAB, min: 0 },
  starfish: { price: STARFISH_PRICE, max: MAX_STARFISH, min: 0 },
  seahorse: { price: SEAHORSE_PRICE, max: MAX_SEAHORSE, min: 0 },
  shrimp: { price: SHRIMP_PRICE, max: MAX_SHRIMP, min: 0 },
  angelfish: { price: ANGELFISH_PRICE, max: MAX_ANGELFISH, min: 0 },
};

export interface SaveSettings { soundMuted: boolean }
type SaveCreatures = Record<CreatureKey, number>;
export interface SaveEquipment { waterFilterOwned: boolean; smallCastleOwned: boolean; rockSetOwned: boolean; aquaticPlantsOwned: boolean }
interface SaveData { version: number; coins: number; creatures: SaveCreatures; equipment: SaveEquipment; settings: SaveSettings }
interface LegacySave extends Partial<Omit<SaveData, 'creatures' | 'equipment'>> { creatures?: Partial<SaveCreatures>; equipment?: Partial<SaveEquipment>; starterFishOwned?: number }

/** Integer-only, never negative, never NaN; falls back when invalid. */
export function sanitizeCoins(v: unknown, fallback = STARTING_COINS): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(COIN_CAP, Math.floor(n));
}

/** The first Starter Fish is permanent (min 1); other species may be 0. */
function sanitizeOwned(v: unknown, key: CreatureKey): number {
  const { min, max } = FISH_SHOP[key];
  const n = typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n) || n < min) return min;
  return Math.min(max, Math.floor(n));
}

let needsMigrationSave = false;
function load(): SaveData {
  const base: SaveData = { version: SAVE_VERSION, coins: STARTING_COINS, creatures: { starterFish: 1, colorfulFish: 0, crab: 0, starfish: 0, seahorse: 0, shrimp: 0, angelfish: 0 }, equipment: { waterFilterOwned: false, smallCastleOwned: false, rockSetOwned: false, aquaticPlantsOwned: false }, settings: { soundMuted: false } };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { needsMigrationSave = true; return base; }
    const d = JSON.parse(raw) as LegacySave | null;
    if (!d || typeof d !== 'object') return base;
    const s = (d.settings && typeof d.settings === 'object' ? d.settings : {}) as Partial<SaveSettings>;
    const c = (d.creatures && typeof d.creatures === 'object' ? d.creatures : {}) as Partial<SaveCreatures>;
    const eq = (d.equipment && typeof d.equipment === 'object' ? d.equipment : null) as Partial<SaveEquipment> | null;
    if (!eq || eq.smallCastleOwned === undefined || eq.rockSetOwned === undefined || eq.aquaticPlantsOwned === undefined) needsMigrationSave = true;
    if (d.version !== SAVE_VERSION || c.colorfulFish === undefined || c.crab === undefined || c.starfish === undefined || c.seahorse === undefined || c.shrimp === undefined || c.angelfish === undefined || 'pufferfish' in c) needsMigrationSave = true;
    // Older saves: v2 stored a flat count; v1 had none (defaults to the one free fish)
    return {
      version: SAVE_VERSION,
      coins: sanitizeCoins(d.coins),
      creatures: {
        starterFish: sanitizeOwned(c.starterFish ?? d.starterFishOwned, 'starterFish'),
        colorfulFish: sanitizeOwned(c.colorfulFish, 'colorfulFish'),
        crab: sanitizeOwned(c.crab, 'crab'),
        starfish: sanitizeOwned(c.starfish, 'starfish'),
        seahorse: sanitizeOwned(c.seahorse, 'seahorse'),
        shrimp: sanitizeOwned(c.shrimp, 'shrimp'),
        angelfish: sanitizeOwned(c.angelfish, 'angelfish'),
      },
      equipment: { waterFilterOwned: eq?.waterFilterOwned === true, smallCastleOwned: eq?.smallCastleOwned === true, rockSetOwned: eq?.rockSetOwned === true, aquaticPlantsOwned: eq?.aquaticPlantsOwned === true },
      settings: { soundMuted: s.soundMuted === true },
    };
  } catch (e) {
    console.warn('[Aippy] Save data unreadable, using defaults', e);
    return base;
  }
}

const data = load();
let pending = 0; // coins credited but still flying to the HUD
let arrivals = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** One-time decor purchase: deduct exactly once, mark owned, save immediately. */
function buyDecor(key: 'rockSetOwned' | 'aquaticPlantsOwned', price: number): boolean {
  if (data.equipment[key]) return false;
  if (data.coins < price) return false;
  data.coins -= price;
  data.equipment[key] = true;
  pending = Math.min(pending, data.coins);
  writeNow();
  emit();
  return true;
}

function writeNow() {
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Aippy] Save failed', e);
  }
}
const scheduleSave = () => { if (timer) clearTimeout(timer); timer = setTimeout(writeNow, 500); };

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (timer) writeNow(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) writeNow(); });
  if (needsMigrationSave) scheduleSave();
}

export const economy = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  getCoins: () => data.coins,
  /** Balance shown in the HUD: catches up as each flying coin lands. */
  getDisplayed: () => Math.max(0, data.coins - pending),
  getArrivals: () => arrivals,
  getStarterFish: () => data.creatures.starterFish,
  getColorfulFish: () => data.creatures.colorfulFish,
  getCrab: () => data.creatures.crab,
  getStarfish: () => data.creatures.starfish,
  getSeahorse: () => data.creatures.seahorse,
  getShrimp: () => data.creatures.shrimp,
  getAngelfish: () => data.creatures.angelfish,
  getOwned: (key: CreatureKey) => data.creatures[key],
  getWaterFilter: () => data.equipment.waterFilterOwned,
  /** One-time purchase: deduct exactly once, mark owned, save immediately. */
  buyWaterFilter(): boolean {
    if (data.equipment.waterFilterOwned) return false;
    if (data.coins < WATER_FILTER_PRICE) return false;
    data.coins -= WATER_FILTER_PRICE;
    data.equipment.waterFilterOwned = true;
    pending = Math.min(pending, data.coins);
    writeNow();
    emit();
    return true;
  },
  getSmallCastle: () => data.equipment.smallCastleOwned,
  /** One-time decor purchase: deduct exactly once, mark owned, save immediately. */
  buySmallCastle(): boolean {
    if (data.equipment.smallCastleOwned) return false;
    if (data.coins < SMALL_CASTLE_PRICE) return false;
    data.coins -= SMALL_CASTLE_PRICE;
    data.equipment.smallCastleOwned = true;
    pending = Math.min(pending, data.coins);
    writeNow();
    emit();
    return true;
  },
  getRockSet: () => data.equipment.rockSetOwned,
  buyRockSet: () => buyDecor('rockSetOwned', ROCK_SET_PRICE),
  getAquaticPlants: () => data.equipment.aquaticPlantsOwned,
  buyAquaticPlants: () => buyDecor('aquaticPlantsOwned', AQUATIC_PLANTS_PRICE),
  canAfford: (price: number) => data.coins >= sanitizeCoins(price, Infinity),
  /** Credits (and saves) immediately so progress is never lost mid-animation. */
  reward(amount: number, animated: boolean) {
    const n = sanitizeCoins(amount, 0);
    if (n <= 0) return;
    data.coins = Math.min(COIN_CAP, data.coins + n);
    if (animated) pending += n;
    else arrivals++;
    scheduleSave();
    emit();
  },
  /** A flying coin reached the counter. */
  settle(amount = 1) {
    pending = Math.max(0, pending - sanitizeCoins(amount, 0));
    arrivals++;
    emit();
  },
  /** Deducts only when affordable. */
  spend(price: number): boolean {
    const n = sanitizeCoins(price, -1);
    if (n < 0 || data.coins < n) return false;
    data.coins -= n;
    scheduleSave();
    emit();
    return true;
  },
  /** Atomic purchase: deduct once, add one fish once, save immediately. */
  buyFish(key: CreatureKey): boolean {
    const { price, max } = FISH_SHOP[key];
    if (data.creatures[key] >= max) return false;
    if (data.coins < price) return false;
    data.coins -= price;
    data.creatures[key] += 1;
    pending = Math.min(pending, data.coins);
    writeNow();
    emit();
    return true;
  },
  getSettings: (): SaveSettings => ({ ...data.settings }),
  setSettings(patch: Partial<SaveSettings>) {
    data.settings = { ...data.settings, ...patch };
    scheduleSave();
  },
};