import type { ReactNode } from 'react';
import { CheckIcon, CoinIcon } from '@/components/UiIcons';

interface ShopCardProps {
  name: string;
  price: number;
  owned: number;
  max: number;
  coins: number;
  preview: ReactNode;
  /** One-time items (decor/equipment) show an Owned state instead of a count. */
  single?: boolean;
  onBuy: () => void;
}

const ShopCard = ({ name, price, owned, max, coins, preview, single = false, onBuy }: ShopCardProps) => {
  const full = owned >= max;
  const afford = coins >= price;
  const canBuy = afford && !full;
  const label = full ? (single ? 'Owned' : 'Tank full') : afford ? 'Buy' : `Need ${price - coins} more`;
  const btn = full
    ? 'bg-[#e1f3f5] text-[#2b7486]'
    : canBuy
      ? 'bg-[#1f2e36] text-white shadow-[0_6px_14px_rgba(20,40,52,0.25)] active:scale-[0.96] active:bg-[#2c404b]'
      : 'bg-[#1f2e36]/[0.06] text-[#1f2e36]/40';
  const meta = single ? (full ? 'Installed' : 'One-time') : `Owned ${owned}`;

  return (
    <div className="flex flex-col rounded-[22px] bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(20,60,80,0.08)] ring-1 ring-[#1f2e36]/[0.05]">
      <div className="relative flex h-[88px] items-center justify-center overflow-hidden rounded-[16px] bg-[radial-gradient(120%_95%_at_50%_0%,#a9e2ea_0%,#62b2c5_55%,#3d8fa6_100%)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-[#d9c39a]/45 to-transparent" />
        <div className="relative">{preview}</div>
        {owned > 0 && (
          <span className="badge-in absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/90 px-1.5 text-[11px] font-semibold tabular-nums text-[#1f2e36] shadow-[0_2px_6px_rgba(8,34,48,0.15)]">
            {single ? <CheckIcon size={12} /> : `×${owned}`}
          </span>
        )}
      </div>
      <div className="px-1.5 pt-2.5">
        <div className="truncate text-[14px] font-semibold leading-tight text-[#1b2a31]">{name}</div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-[#3a525c]">
            <CoinIcon size={14} />
            {price}
          </span>
          <span className="truncate text-[11px] font-medium text-[#7c929a]">{meta}</span>
        </div>
      </div>
      <button
        type="button"
        disabled={!canBuy}
        onClick={onBuy}
        className={`mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 ease-out ${btn}`}
      >
        {full && <CheckIcon size={14} />}
        {label}
      </button>
    </div>
  );
};

export default ShopCard;