import { useEffect, useState } from 'react';
import type { BoutiqueSave } from '@/utils/boutique';
import { breedingEligibility } from '@/utils/breeding';
import FishPortrait from '@/components/FishPortrait';
import { formatCareTime } from '@/components/FishCarePanel';
import { useHomeSheet } from '@/components/HomeScreen';
import { specimenBodyShape, specimenFinStyle, specimenPattern } from '@/utils/stockCatalog';

interface Props {
  profile: BoutiqueSave; saved: boolean; onClose: () => void;
  onStart: (a: string, b: string) => void; onClaim: () => void;
}
export default function BreedingSheet({ profile, saved, onClose, onStart, onClaim }: Props) {
  const [parents, setParents] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now);
  const ref = useHomeSheet(true, onClose);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const cycle = profile.breeding;
  const pages = Math.max(1, Math.ceil(profile.kept.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const pair = parents.map(id => profile.kept.find(fish => fish.id === id)).filter(Boolean);
  const readiness = parents.length === 2 ? breedingEligibility(profile, parents[0], parents[1], now) : { eligible: false, reason: 'Select two different adult guppies.' };
  const remaining = cycle ? Math.max(0, (cycle.readyAtMs - Math.max(now, profile.worldClock?.lastSeenMs ?? now)) / 1000) : 0;
  const choose = (id: string) => setParents(current => current.includes(id) ? current.filter(other => other !== id) : [...current.slice(-1), id]);
  return <div className="home-modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="home-sheet home-breeding-sheet" ref={ref} role="dialog" aria-modal="true" aria-label="Breed fish" tabIndex={-1}>
      <header className="home-sheet-header"><div><p className="home-eyebrow">THE NEXT LITTLE GENERATION</p><h2>{cycle ? 'A nursery beginning' : 'Pair your favourites'}</h2></div><button className="home-icon" onClick={onClose} aria-label="Close breeding">×</button></header>
      <div className="home-sheet-scroll">
        {!saved && <p className="home-notice" role="status">Saving failed. Parents and credits remain yours. Retry when saving is available.</p>}
        {cycle ? <>
          <FishPortrait specimen={cycle.offspring} />
          <p className="home-note">{cycle.parentIds.map(id => profile.kept.find(fish => fish.id === id)?.name ?? 'Parent').join(' + ')} · one nursery space reserved</p>
          <div className="breeding-countdown"><span className="home-eyebrow">{remaining ? 'NURSERY CYCLE' : 'READY TO WELCOME'}</span><strong>{remaining ? formatCareTime(remaining) : 'A new little life'}</strong></div>
          <p className="home-note">A free fry with inherited body, colour, pattern and fins. Your parents remain safe at home and are reserved until you welcome their offspring.</p>
          <button className="home-button home-full" disabled={remaining > 0} onClick={onClaim}>Welcome your fry <span aria-hidden="true">♡</span></button>
        </> : <>
          <p className="home-note">Choose two adults with at least 70% health and 60% food. A two-minute cycle gives one free fry. Starter, tropical and angel families can cross using fictional game inheritance. Parents stay safe at home.</p>
          {!!pair.length && <p className="home-note">Selected: {pair.map(fish => fish!.name).join(' + ')}</p>}
          {profile.kept.length ? <div className="breed-parent-grid">{profile.kept.slice(currentPage*6,currentPage*6+6).map(fish => <button key={fish.id} className={'breed-parent' + (parents.includes(fish.id) ? ' selected' : '')} aria-pressed={parents.includes(fish.id)} aria-label={`Select ${fish.name} as a parent`} onClick={() => choose(fish.id)}>
            <FishPortrait specimen={fish} /><span><strong>{fish.name}</strong><small>{Math.round(fish.growth)}% grown · {Math.round(fish.health)}% health · {Math.round(fish.hunger)}% fed</small></span>
          </button>)}</div> : <p className="home-notice">Keep two raised guppies in View to begin.</p>}
          {pages > 1 && <nav className="home-pagination" aria-label="Breeding parents pages"><button className="home-button home-button-secondary" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><span>{currentPage+1} / {pages}</span><button className="home-button home-button-secondary" disabled={currentPage===pages-1} onClick={()=>setPage(currentPage+1)}>Next</button></nav>}
          <div className="breeding-preview"><p className="home-eyebrow">INHERITANCE PREVIEW</p>{pair.length === 2 ? <><dl className="inheritance-axes">{([
            ['Body',pair.map(fish=>specimenBodyShape(fish!))],['Fins',pair.map(fish=>specimenFinStyle(fish!))],['Tail',pair.map(fish=>fish!.inherited?.finForm??'original')],['Pattern',pair.map(fish=>specimenPattern(fish!))],['Colour',pair.map(fish=>fish!.inherited?.colorFamily??'original')],
          ] as [string,string[]][]).map(([label,values])=><div key={label}><dt>{label}</dt><dd>{[...new Set(values)].join(' or ')}</dd></div>)}</dl><p>Each axis inherits separately. Acquired upgrades and current condition are not copied.</p></> : <p>Select a pair to see their inherited possibilities.</p>}</div>
          <p className="home-note" role="status">{readiness.reason}</p>
          <button className="home-button home-full" disabled={!readiness.eligible} onClick={() => onStart(parents[0], parents[1])}>Start breeding <span>Free · 2 min</span></button>
        </>}
      </div>
    </div>
  </div>;
}
