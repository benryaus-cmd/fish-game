import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { economy } from '@/utils/economy';
import { CoinIcon } from '@/components/UiIcons';

interface CoinCounterProps {
  iconRef: RefObject<HTMLSpanElement | null>;
}

const CoinCounter = ({ iconRef }: CoinCounterProps) => {
  const coins = useSyncExternalStore(economy.subscribe, economy.getDisplayed);
  const arrivals = useSyncExternalStore(economy.subscribe, economy.getArrivals);
  const valueRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef<number | null>(null);

  // Gentle count-up / count-down written straight to the DOM (no re-renders per frame)
  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    const from = shownRef.current ?? coins;
    const to = coins;
    if (from === to) {
      shownRef.current = to;
      el.textContent = String(to);
      return;
    }
    const start = performance.now();
    const dur = Math.min(650, 220 + Math.abs(to - from) * 30);
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      shownRef.current = v;
      el.textContent = String(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [coins]);

  return (
    <div
      className="glass pointer-events-none flex h-11 items-center rounded-full pl-1.5 pr-4"
      aria-label={`${coins} coins`}
    >
      <div key={arrivals} className={`flex items-center gap-2.5 ${arrivals > 0 ? 'coin-pulse' : ''}`}>
        <span ref={iconRef} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
          <CoinIcon size={22} />
        </span>
        <span ref={valueRef} className="min-w-[2ch] text-[16px] font-semibold tabular-nums tracking-[0.01em] text-white [text-shadow:0_1px_2px_rgba(8,34,48,0.35)]" />
      </div>
    </div>
  );
};

export default CoinCounter;