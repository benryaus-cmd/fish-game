import { PelletIcon } from '@/components/UiIcons';

interface FeedButtonProps {
  active: boolean;
  onToggle: () => void;
}

const FeedButton = ({ active, onToggle }: FeedButtonProps) => (
  <>
    <div
      aria-hidden={!active}
      className={`glass pointer-events-none absolute left-1/2 z-20 flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-medium text-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        active ? '-translate-x-1/2 translate-y-0 opacity-100' : '-translate-x-1/2 translate-y-2 opacity-0'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
    >
      <span className="feed-dot h-1.5 w-1.5 rounded-full bg-[#bff3ef]" />
      Tap the water to drop food
    </div>
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Stop feeding' : 'Feed the fish'}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      className={`glass ui-press absolute right-4 z-20 flex h-[52px] items-center gap-2.5 rounded-full pl-5 pr-1.5 ${active ? 'glass-active feed-glow' : ''}`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)' }}
    >
      <span className="text-[14px] font-semibold tracking-[0.01em] text-white [text-shadow:0_1px_2px_rgba(8,34,48,0.3)]">
        {active ? 'Feeding' : 'Feed'}
      </span>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(8,34,48,0.2)] transition-colors duration-300 ${
          active ? 'bg-[#c9f4ef] text-[#1f5f5c]' : 'bg-white text-[#8a5a2b]'
        }`}
      >
        <PelletIcon />
      </span>
    </button>
  </>
);

export default FeedButton;