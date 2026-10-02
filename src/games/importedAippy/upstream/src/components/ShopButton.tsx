import { BagIcon } from '@/components/UiIcons';

interface ShopButtonProps {
  open: boolean;
  pulse: number;
  onToggle: () => void;
}

const ShopButton = ({ open, pulse, onToggle }: ShopButtonProps) => (
  <button
    type="button"
    aria-expanded={open}
    aria-label={open ? 'Close shop' : 'Open shop'}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={onToggle}
    className={`glass ui-press absolute left-4 z-20 flex h-[52px] items-center gap-2.5 rounded-full pl-1.5 pr-5 ${open ? 'glass-active' : ''}`}
    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)' }}
  >
    <span key={pulse} className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1f2e36] shadow-[0_2px_8px_rgba(8,34,48,0.2)] ${pulse > 0 ? 'shop-pulse' : ''}`}>
      <BagIcon />
    </span>
    <span className="text-[14px] font-semibold tracking-[0.01em] text-white [text-shadow:0_1px_2px_rgba(8,34,48,0.3)]">Shop</span>
  </button>
);

export default ShopButton;