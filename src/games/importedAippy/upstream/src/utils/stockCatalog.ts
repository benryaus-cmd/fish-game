export type StockId = 'ordinary' | 'sunburst' | 'blueveil' | 'rainbow' | 'neon' | 'pearlangel' | 'koiangel' | 'rainbowangel' | 'seahorse' | 'legacy';
export type BodyShape = 'starter' | 'colorful' | 'angel' | 'seahorse';
export type FinStyle = 'rounded' | 'triangle' | 'sail';
export type ColorPattern = 'solid' | 'rainbow' | 'banded' | 'koi';
export type OrnamentalSpecies = 'guppy' | 'tropical' | 'angelfish' | 'seahorse';
export type ColorFamily = 'silver' | 'warm' | 'cool';
export type FinForm = 'short' | 'fan' | 'veil';
export interface Stock {
  id: Exclude<StockId, 'legacy'>;
  name: string;
  price: number;
  color: string;
  accent: string;
  finForm: FinForm;
  colorFamily: ColorFamily;
  bodyShape: BodyShape;
  finStyle: FinStyle;
  colorPattern: ColorPattern;
  species: OrnamentalSpecies;
  potential: string;
  description: string;
}

export const STOCK_CATALOG: readonly Stock[] = [
  { id: 'ordinary', name: 'Ordinary', price: 0, color: '#b8bbb1', accent: '#e4c7a2', finForm: 'short', colorFamily: 'silver', bodyShape: 'starter', finStyle: 'rounded', colorPattern: 'solid', species: 'guppy', potential: 'A modest silver adult with short, translucent fins.', description: 'A hardy silver guppy with a warm shimmer and a simple tail.' },
  { id: 'sunburst', name: 'Sunburst', price: 40, color: '#edab4e', accent: '#f07554', finForm: 'fan', colorFamily: 'warm', bodyShape: 'starter', finStyle: 'rounded', colorPattern: 'solid', species: 'guppy', potential: 'Warm gold colour and a broad fan tail as it grows.', description: 'Golden stock with an inherited coral fan tail.' },
  { id: 'blueveil', name: 'Blue Veil', price: 75, color: '#659cc2', accent: '#a7d2e9', finForm: 'veil', colorFamily: 'cool', bodyShape: 'starter', finStyle: 'rounded', colorPattern: 'solid', species: 'guppy', potential: 'Cool blue colour and long flowing fins as it grows.', description: 'Cool blue stock with an inherited long veil tail.' },
  { id: 'rainbow', name: 'Rainbow', price: 80, color: '#df639d', accent: '#64d6be', finForm: 'fan', colorFamily: 'warm', bodyShape: 'colorful', finStyle: 'triangle', colorPattern: 'rainbow', species: 'tropical', potential: 'A slender tropical body with rainbow colour and triangular fins.', description: 'Bright rainbow tropical stock with a lively fan tail.' },
  { id: 'neon', name: 'Neon', price: 110, color: '#48bde1', accent: '#f2708a', finForm: 'short', colorFamily: 'cool', bodyShape: 'colorful', finStyle: 'triangle', colorPattern: 'banded', species: 'tropical', potential: 'A slender tropical body with bright bands and triangular fins.', description: 'Blue and coral tropical stock with inherited bands.' },
  { id: 'pearlangel', name: 'Pearl Angel', price: 160, color: '#d9dfec', accent: '#8598bd', finForm: 'veil', colorFamily: 'silver', bodyShape: 'angel', finStyle: 'sail', colorPattern: 'banded', species: 'angelfish', potential: 'An angular angel body with pearl bands and tall sail fins.', description: 'Pearlescent angel stock with sweeping sail fins.' },
  { id: 'koiangel', name: 'Koi Angel', price: 200, color: '#efd9b2', accent: '#ed8c4f', finForm: 'fan', colorFamily: 'warm', bodyShape: 'angel', finStyle: 'sail', colorPattern: 'koi', species: 'angelfish', potential: 'An angular angel body with koi patches and tall sail fins.', description: 'Cream and orange angel stock with inherited koi patches.' },
  { id: 'seahorse', name: 'Seahorse', price: 140, color: '#d9a25c', accent: '#efad86', finForm: 'short', colorFamily: 'warm', bodyShape: 'seahorse', finStyle: 'rounded', colorPattern: 'solid', species: 'seahorse', potential: 'An upright golden body, delicate fluttering fins and a curled tail.', description: 'A little golden seahorse with its original articulated snout and curled tail.' },
  { id: 'rainbowangel', name: 'Rainbow Angel', price: 220, color: '#dd77b4', accent: '#63d8c1', finForm: 'veil', colorFamily: 'warm', bodyShape: 'angel', finStyle: 'sail', colorPattern: 'rainbow', species: 'angelfish', potential: 'Rainbow colour across an angular angel body with tall sail fins.', description: 'Rainbow angel stock with sweeping translucent fins.' },
];

/** Legacy is a migration origin, never a purchasable stock. */
export function getStock(id: unknown): Stock | undefined {
  return STOCK_CATALOG.find(stock => stock.id === id);
}

interface AppearanceSpecimen { origin?: StockId; inherited?: { bodyShape?: BodyShape; finStyle?: FinStyle; colorPattern?: ColorPattern } }
/** Additive axes fall back to authored origin, then the original guppy geometry. */
export function specimenBodyShape(fish: AppearanceSpecimen): BodyShape { return fish.inherited?.bodyShape ?? getStock(fish.origin)?.bodyShape ?? 'starter'; }
export function specimenFinStyle(fish: AppearanceSpecimen): FinStyle { return fish.inherited?.finStyle ?? getStock(fish.origin)?.finStyle ?? 'rounded'; }
export function specimenPattern(fish: AppearanceSpecimen): ColorPattern { return fish.inherited?.colorPattern ?? getStock(fish.origin)?.colorPattern ?? 'solid'; }
export function bodyShapeSpecies(shape: BodyShape): OrnamentalSpecies { return shape === 'seahorse' ? 'seahorse' : shape === 'angel' ? 'angelfish' : shape === 'colorful' ? 'tropical' : 'guppy'; }

/** Shop grouping is independent of anatomical species and breeding compatibility. */
export function stockFamily(shape: BodyShape): 'starter' | 'colorful' | 'angel' { return shape === 'seahorse' ? 'colorful' : shape; }

/** Player-facing anatomy names; save axes retain their existing identifiers. */
export function specimenFormLabel(fish: AppearanceSpecimen): string {
  return ({starter:'Guppy form',colorful:'Tropical form',angel:'Angelfish form',seahorse:'Seahorse form'} as const)[specimenBodyShape(fish)];
}
