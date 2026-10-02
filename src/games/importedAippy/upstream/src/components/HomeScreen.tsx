import { useEffect, useRef, useState } from 'react';
import { getStage, appraiseFish, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import FishPortrait from '@/components/FishPortrait';
import FishCarePanel from '@/components/FishCarePanel';
import WorldTimeBadge from '@/components/WorldTimeBadge';
import { sampleWorldClock } from '@/utils/worldClock';
import './HomeUI.css';

interface Props {
  width: number; height: number; profile: BoutiqueSave; saved: boolean;
  onRaise: () => void; onContinue: () => void; onSound: () => void;
  sound: boolean; onInteract: () => void; paused?: boolean;
  selectedFishId?: string | null; onClearSelection?: () => void;
  onCleanTank?: () => void; tankDirt?: number; pelletPrice?: number; cleanPrice?: number;
  onSellFish: (id: string) => void;
  onRaiseResident: (id: string) => void; onFeedResident: (id: string) => void; onBreed: () => void;
}

/** Keeps keyboard navigation inside an open sheet and restores its opener. */
export function useHomeSheet(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') ?? []);
    // Pointer-down opens the canvas care sheet before the browser's default
    // focus action completes. Focus afterwards so it cannot be reset to body.
    const focusFrame = window.requestAnimationFrame(() => (controls()[0] ?? panel)?.focus());
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const targets = controls();
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); panel?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { window.cancelAnimationFrame(focusFrame); document.removeEventListener('keydown', key); opener?.focus(); };
  }, [open]);
  return ref;
}

function condition(fish: Specimen) {
  return `${Math.round(fish.health)}% health · ${Math.round(fish.hunger)}% fed`;
}

export default function HomeScreen({ width, height, profile, saved, onRaise, onContinue, onSound, sound, onInteract, onSellFish, onRaiseResident, onFeedResident, onBreed, selectedFishId, onClearSelection, onCleanTank, tankDirt = 0, pelletPrice = 5, cleanPrice = 15 }: Props) {
  const [collection, setCollection] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const active = profile.activeRun?.specimen;
  const owned = active ? [...profile.kept.filter(fish => fish.id !== active.id), active] : profile.kept;
  const pages = Math.max(1, Math.ceil(owned.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const selected = owned.find(fish => fish.id === selectedId);
  const selectedActive = !!selected && selected.id === active?.id;
  const reserved = !!selected && !!profile.breeding?.parentIds.includes(selected.id);
  const sheetOpen = collection || !!selected;
  const closeSheet = () => { setCollection(false); setSelectedId(null); onClearSelection?.(); };
  const sheetRef = useHomeSheet(sheetOpen, closeSheet);
  useEffect(() => {
    if (selectedFishId) { setCollection(false); setSelectedId(selectedFishId); }
  }, [selectedFishId]);
  useEffect(() => { if (selectedId) sheetRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [selectedId]);
  const interact = (action: () => void) => { onInteract(); action(); };
  const select = (id: string) => interact(() => { setCollection(false); setSelectedId(id); });
  const swim = () => {
    closeSheet();
    if (active) { onContinue(); return; }
    const available = profile.kept.find(fish => !profile.breeding?.parentIds.includes(fish.id));
    if (available) onRaiseResident(available.id);
    else onRaise();
  };
  const canClean = saved && profile.coins >= cleanPrice && tankDirt > 0;
  return <section className={`home-screen${owned.length ? '' : ' home-screen-empty'}`} aria-label="View aquarium" style={{ width, height }}>
    <div className="home-shade" aria-hidden="true" />
    <header className="home-header" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <div><p className="home-eyebrow">YOUR AQUARIUM</p><h1>SWIM</h1></div>
      <div className="home-tools"><span className="home-wallet" aria-label={`${profile.coins} credits`}><span aria-hidden="true">◈</span> {profile.coins.toLocaleString()} <small>credits</small></span><button className="home-icon" onClick={() => interact(onSound)} aria-label="Settings">⚙</button></div>
    </header>
    <div className="home-context" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <p className="home-eyebrow">VIEW</p>
      <WorldTimeBadge clock={profile.worldClock} />
      <span>{owned.length} fish · Tap a fish for care</span>
    </div>
    {!owned.length && <div className="home-invitation" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <p>Choose your first little life, then swim and help it grow.</p>
      <button className="home-button" onClick={() => interact(onRaise)}>Choose your first fish <span aria-hidden="true">↗</span></button>
    </div>}
    {onCleanTank && <div className="home-tank-care" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <span>{tankDirt > 0 ? `Glass · ${Math.round(tankDirt)}% dirty` : 'Clear glass'}</span>
      <button className="home-button home-button-secondary" disabled={!canClean} onClick={() => interact(onCleanTank)} aria-label={`Clean tank for ${cleanPrice} credits`}>Clean <span>◈ {cleanPrice}</span></button>
    </div>}
    {!saved && <p className="home-save-notice" role="status">Saving is unavailable. Keep this session open. Purchases wait until saving works.</p>}
    <nav className="home-dock" aria-label="Aquarium actions" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <button onClick={() => interact(swim)}><span aria-hidden="true">↗</span><span>Swim</span></button>
      <button aria-label="Collection" onClick={() => interact(() => { setSelectedId(null); onClearSelection?.(); setCollection(true); })}><span aria-hidden="true">▤</span><span>Collection</span><small>{owned.length}</small></button>
      <button aria-label="Breed" onClick={() => interact(onBreed)}><span aria-hidden="true">♡</span><span>Breed</span>{profile.breeding && <small>1</small>}</button>
      <button onClick={() => interact(closeSheet)} aria-pressed={true}><span aria-hidden="true">≈</span><span>View</span></button>
    </nav>
    {sheetOpen && <div className="home-modal" onClick={event => { if (event.target === event.currentTarget) interact(closeSheet); }}>
      <div className={`home-sheet ${selected ? 'home-resident-sheet' : ''}`} ref={sheetRef} role="dialog" aria-modal="true" aria-label={selected ? 'Fish details' : 'Your collection'} tabIndex={-1}>
        <header className="home-sheet-header"><div><p className="home-eyebrow">{selected ? 'YOUR FISH' : 'YOUR COLLECTION'}</p><h2>{selected ? selected.name : 'Your little lives'}</h2></div><button className="home-icon" onClick={() => interact(closeSheet)} aria-label={selected ? 'Close fish details' : 'Close collection'}>×</button></header>
        <div className="home-sheet-scroll">
          {selected ? <><FishPortrait specimen={selected} /><FishCarePanel specimen={selected} phase={profile.worldClock ? sampleWorldClock(profile.worldClock,Date.now()).phase : 'day'} />
            <p className="home-note">View and Swim share this fish’s care, growth and story.</p>
            {(reserved || (active && !selectedActive)) && <p className="home-notice">{reserved ? 'This parent is reserved until you welcome its offspring.' : 'Return your current fish first, then choose another to Swim.'}</p>}
            {selected.hunger >= 85 && <p className="home-notice" role="status">Already well fed. Extra pellets can dirty the aquarium.</p>}
            <div className="care-actions"><button className="home-button home-button-secondary home-full" disabled={!saved || selected.health <= 0} onClick={() => interact(() => { onSellFish(selected.id); closeSheet(); })}>Sell this fish <span>◈ {appraiseFish(selected)}</span></button><button className="home-button home-full" disabled={reserved || (!!active && !selectedActive)} onClick={() => interact(() => { closeSheet(); if (selectedActive) onContinue(); else onRaiseResident(selected.id); })}>{selectedActive ? 'Continue Swim' : 'Swim as this fish'} <span aria-hidden="true">↗</span></button>
              <button className="home-button home-button-secondary home-full" disabled={!saved || profile.coins < pelletPrice} onClick={() => interact(() => onFeedResident(selected.id))} aria-label={`Feed ${selected.name} pellets for ${pelletPrice} credits`}>Feed pellets <span>◈ {pelletPrice}</span></button>
              {profile.coins < pelletPrice && <p className="home-note" role="status">You need {pelletPrice} credits for pellets.</p>}
              {onCleanTank && <button className="home-button home-button-secondary home-full" disabled={!canClean} onClick={() => interact(onCleanTank)} aria-label={`Clean tank for ${cleanPrice} credits`}>Clean <span>◈ {cleanPrice}</span></button>}
            </div></> : <>
            <p className="home-note">{owned.length} fish · Each keeps its own colour and story.</p>
            {owned.length ? <div className="home-collection-grid">{owned.slice(currentPage * 6, currentPage * 6 + 6).map(fish => <button className="home-resident-card" key={fish.id} onClick={() => select(fish.id)} aria-label={`View ${fish.name}, ${getStage(fish.growth)} ${fish.species}`}><FishPortrait specimen={fish} /><span className="home-card-copy"><strong>{fish.name}</strong><small>{getStage(fish.growth)} {fish.species}{fish.id === active?.id ? ' · Swim selected' : ''}</small><small>{condition(fish)}</small></span><span aria-hidden="true">↗</span></button>)}</div> : <div className="home-collection-empty"><span aria-hidden="true">◌</span><h3>A place for your favourites</h3><p>Choose a fish and help it grow. Its colour, care and story will stay with it.</p><button className="home-button" onClick={() => interact(() => { closeSheet(); onRaise(); })}>Choose your first fish</button></div>}
            {pages > 1 && <nav className="home-pagination" aria-label="Collection pages"><button className="home-button home-button-secondary" disabled={currentPage === 0} onClick={() => interact(() => setPage(currentPage - 1))}>Previous</button><span>{currentPage + 1} / {pages}</span><button className="home-button home-button-secondary" disabled={currentPage === pages - 1} onClick={() => interact(() => setPage(currentPage + 1))}>Next</button></nav>}
          </>}
        </div>
      </div>
    </div>}
  </section>;
}
