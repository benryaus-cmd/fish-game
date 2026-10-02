import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { AQUATIC_PLANTS_PRICE, economy, FISH_SHOP, ROCK_SET_PRICE, SMALL_CASTLE_PRICE, WATER_FILTER_PRICE, type CreatureKey } from '@/utils/economy';
import { PlantPreview, RockPreview } from '@/components/DecorPreviews';
import ShopCard from '@/components/ShopCard';
import { FilterPreview } from '@/components/FilterPreview';
import { CastlePreview } from '@/components/CastlePreview';
import { ColorfulPreview, FishPreview } from '@/components/ShopIcons';
import { CrabPreview } from '@/components/CrabPreview';
import { StarfishPreview } from '@/components/StarfishPreview';
import { SeahorsePreview } from '@/components/SeahorsePreview';
import { ShrimpPreview } from '@/components/ShrimpPreview';
import { AngelfishPreview } from '@/components/AngelfishPreview';
import { CloseIcon, CoinIcon, DecorTabIcon, FishTabIcon } from '@/components/UiIcons';

interface ShopPanelProps {
  open: boolean;
  fishColor: string;
  colorfulColor: string;
  colorfulAccent: string;
  crabColor: string;
  starfishColor: string;
  seahorseColor: string;
  shrimpColor: string;
  angelfishColor: string;
  filterColor: string;
  castleColor: string;
  rockColor: string;
  plantColor: string;
  onClose: () => void;
  onBuy: (key: CreatureKey) => void;
  onBuyFilter: () => void;
  onBuyCastle: () => void;
  onBuyRocks: () => void;
  onBuyPlants: () => void;
}

type Tab = 'creatures' | 'decor';
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'creatures', label: 'Creatures', icon: <FishTabIcon /> },
  { id: 'decor', label: 'Decor', icon: <DecorTabIcon /> },
];

const ShopPanel = (p: ShopPanelProps) => {
  const [tab, setTab] = useState<Tab>('creatures');
  const filterOwned = useSyncExternalStore(economy.subscribe, economy.getWaterFilter);
  const castleOwned = useSyncExternalStore(economy.subscribe, economy.getSmallCastle);
  const rocksOwned = useSyncExternalStore(economy.subscribe, economy.getRockSet);
  const plantsOwned = useSyncExternalStore(economy.subscribe, economy.getAquaticPlants);
  const shrimp = useSyncExternalStore(economy.subscribe, economy.getShrimp);
  const angelfish = useSyncExternalStore(economy.subscribe, economy.getAngelfish);
  const starfish = useSyncExternalStore(economy.subscribe, economy.getStarfish);
  const seahorse = useSyncExternalStore(economy.subscribe, economy.getSeahorse);
  const coins = useSyncExternalStore(economy.subscribe, economy.getCoins);
  const starter = useSyncExternalStore(economy.subscribe, economy.getStarterFish);
  const colorful = useSyncExternalStore(economy.subscribe, economy.getColorfulFish);
  const crab = useSyncExternalStore(economy.subscribe, economy.getCrab);

  const creatures: { key: CreatureKey; name: string; owned: number; preview: ReactNode }[] = [
    { key: 'starterFish', name: 'Starter Fish', owned: starter, preview: <FishPreview color={p.fishColor} /> },
    { key: 'colorfulFish', name: 'Colorful Fish', owned: colorful, preview: <ColorfulPreview color={p.colorfulColor} accent={p.colorfulAccent} /> },
    { key: 'crab', name: 'Crab', owned: crab, preview: <CrabPreview color={p.crabColor} /> },
    { key: 'starfish', name: 'Starfish', owned: starfish, preview: <StarfishPreview color={p.starfishColor} /> },
    { key: 'seahorse', name: 'Seahorse', owned: seahorse, preview: <SeahorsePreview color={p.seahorseColor} /> },
    { key: 'shrimp', name: 'Shrimp', owned: shrimp, preview: <ShrimpPreview color={p.shrimpColor} /> },
    { key: 'angelfish', name: 'Angelfish', owned: angelfish, preview: <AngelfishPreview color={p.angelfishColor} /> },
  ];
  const decorItems: { name: string; price: number; owned: boolean; preview: ReactNode; onBuy: () => void }[] = [
    { name: 'Water Filter', price: WATER_FILTER_PRICE, owned: filterOwned, preview: <FilterPreview color={p.filterColor} />, onBuy: p.onBuyFilter },
    { name: 'Small Castle', price: SMALL_CASTLE_PRICE, owned: castleOwned, preview: <CastlePreview color={p.castleColor} />, onBuy: p.onBuyCastle },
    { name: 'Rock Set', price: ROCK_SET_PRICE, owned: rocksOwned, preview: <RockPreview color={p.rockColor} />, onBuy: p.onBuyRocks },
    { name: 'Aquatic Plants', price: AQUATIC_PLANTS_PRICE, owned: plantsOwned, preview: <PlantPreview color={p.plantColor} />, onBuy: p.onBuyPlants },
  ];
  const decor = tab === 'decor';

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-[25] bg-[#0a2533]/25 transition-opacity duration-500 ${p.open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={p.onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Shop"
        aria-hidden={!p.open}
        onPointerDown={(e) => e.stopPropagation()}
        className={`sheet absolute inset-x-0 bottom-0 z-30 mx-auto flex max-h-[80vh] max-w-md flex-col rounded-t-[28px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          p.open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[104%] opacity-80'
        }`}
      >
        <div className="shrink-0 px-5 pt-2.5">
          <div className="mx-auto h-1 w-9 rounded-full bg-[#1f2e36]/15" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[#1b2a31]">Shop</h2>
              <p className="mt-0.5 text-[12px] text-[#5f7881]">{decor ? 'Furnish and equip your tank' : 'Bring new life to your tank'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex h-9 items-center gap-1.5 rounded-full bg-white/85 pl-1.5 pr-3 text-[13px] font-semibold tabular-nums text-[#1b2a31] ring-1 ring-[#1f2e36]/[0.06]">
                <CoinIcon size={20} />
                {coins}
              </span>
              <button
                type="button"
                aria-label="Close shop"
                onClick={p.onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1f2e36]/[0.06] text-[#1f2e36]/70 transition-all duration-200 active:scale-90 active:bg-[#1f2e36]/[0.12]"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          <div role="tablist" className="relative mt-4 grid grid-cols-2 rounded-full bg-[#1f2e36]/[0.06] p-1">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_2px_10px_rgba(20,50,64,0.12)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: decor ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => switchTab(t.id)}
                className={`relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-300 ${
                  tab === t.id ? 'text-[#1b2a31]' : 'text-[#1b2a31]/45'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4"
          style={{ touchAction: 'pan-y', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <div key={tab} className="tab-fade grid grid-cols-2 gap-3">
            {decor
              ? decorItems.map((d) => (
                  <ShopCard key={d.name} name={d.name} price={d.price} owned={d.owned ? 1 : 0} max={1} coins={coins} preview={d.preview} single onBuy={d.onBuy} />
                ))
              : creatures.map((c) => (
                  <ShopCard
                    key={c.key}
                    name={c.name}
                    price={FISH_SHOP[c.key].price}
                    owned={c.owned}
                    max={FISH_SHOP[c.key].max}
                    coins={coins}
                    preview={c.preview}
                    onBuy={() => p.onBuy(c.key)}
                  />
                ))}
          </div>
          <p className="mt-4 text-center text-[11.5px] text-[#7c929a]">
            {decor ? 'Each item is a one-time purchase.' : 'Feed your creatures to earn coins.'}
          </p>
        </div>
      </div>
    </>
  );
};

export default ShopPanel;