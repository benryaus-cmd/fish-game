export type StockId = 'ordinary' | 'sunburst' | 'blueveil' | 'legacy';
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
  potential: string;
  description: string;
}

export const STOCK_CATALOG: readonly Stock[] = [
  { id: 'ordinary', name: 'Ordinary', price: 0, color: '#b8bbb1', accent: '#e4c7a2', finForm: 'short', colorFamily: 'silver', potential: 'A modest silver adult with short, translucent fins.', description: 'A hardy silver guppy with a warm shimmer and a simple tail.' },
  { id: 'sunburst', name: 'Sunburst', price: 40, color: '#edab4e', accent: '#f07554', finForm: 'fan', colorFamily: 'warm', potential: 'Warm gold colour and a broad fan tail as it grows.', description: 'Golden stock with an inherited coral fan tail.' },
  { id: 'blueveil', name: 'Blue Veil', price: 75, color: '#659cc2', accent: '#a7d2e9', finForm: 'veil', colorFamily: 'cool', potential: 'Cool blue colour and long flowing fins as it grows.', description: 'Cool blue stock with an inherited long veil tail.' },
];

/** Legacy is a migration origin, never a purchasable stock. */
export function getStock(id: unknown): Stock | undefined {
  return STOCK_CATALOG.find(stock => stock.id === id);
}
