import { useEffect, useState } from 'react';
import { sampleWorldClock, type WorldClock } from '@/utils/worldClock';

export default function WorldTimeBadge({ clock }: { clock?: WorldClock }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  if (!clock) return null;
  const world = sampleWorldClock(clock, now);
  return <span className="world-time" aria-label="World time" title="One shared world: five minutes of day, five minutes of night.">
    <span aria-hidden="true">{world.phase === 'day' ? '☀' : '☾'}</span>
    <span>{world.phase === 'day' ? 'Day' : 'Night'} <small>{world.label}</small></span>
  </span>;
}
