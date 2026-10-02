import { useEffect, useRef, useState } from 'react';
import { getStage, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import HomeTank from '@/components/HomeTank';
import FishPortrait from '@/components/FishPortrait';
import FishCarePanel from '@/components/FishCarePanel';
import WorldTimeBadge from '@/components/WorldTimeBadge';
import { sampleWorldClock } from '@/utils/worldClock';
import './HomeUI.css';

interface Props {
  width: number; height: number; profile: BoutiqueSave; saved: boolean;
  onRaise: () => void; onContinue: () => void; onSound: () => void;
  sound: boolean; onInteract: () => void; paused?: boolean;
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

export default function HomeScreen({ width, height, profile, saved, onRaise, onContinue, onSound, sound, onInteract, onRaiseResident, onFeedResident, onBreed, paused = false }: Props) {
  const [collection, setCollection] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controlledId, setControlledId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(profile.kept.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const selected = profile.kept.find(fish => fish.id === selectedId);
  const reserved = !!selected && !!profile.breeding?.parentIds.includes(selected.id);
  const controlled = profile.kept.find(fish => fish.id === controlledId);
  const sheetOpen = collection || !!selected;
  const closeSheet = () => { setCollection(false); setSelectedId(null); };
  const sheetRef = useHomeSheet(sheetOpen, closeSheet);
  useEffect(() => { if (selectedId) sheetRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [selectedId]);
  const interact = (action: () => void) => { onInteract(); action(); };
  const select = (id: string) => interact(() => { setCollection(false); setSelectedId(id); });
  return <section className="home-screen" aria-label="Home aquarium" style={{ width, height }}>
    <div inert={sheetOpen} aria-hidden={sheetOpen || undefined}><HomeTank width={width} height={height} specimens={profile.kept} controlledId={controlledId} onSelect={select} paused={sheetOpen || paused} worldClock={profile.worldClock} /></div>
    <div className="home-shade" aria-hidden="true" />
    <header className="home-header" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <div><p className="home-eyebrow">YOUR LIVING AQUARIUM</p><h1>AquaLume</h1></div>
      <div className="home-tools"><span className="home-wallet" aria-label={`${profile.coins} credits`}><span aria-hidden="true">◈</span> {profile.coins.toLocaleString()} <small>credits</small></span><button className="home-icon" onClick={() => interact(onSound)} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound}>{sound ? '♪' : '♩'}</button></div>
    </header>
    <div className="home-context">
      <p className="home-eyebrow">VIEWING TANK</p>
      <p>{controlled ? `Swimming with ${controlled.name}` : profile.kept.length ? 'Your collection, quietly growing.' : 'A home for your first little life.'}</p>
      <WorldTimeBadge clock={profile.worldClock} />
      {!!profile.kept.length && <span>{profile.kept.length} {profile.kept.length === 1 ? 'resident' : 'residents'}{profile.kept.length > 24 ? ' · up to 24 in view' : ''} · safe at home</span>}
    </div>
    {(!profile.kept.length || profile.activeRun) && !controlled && <div className="home-invitation" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <p>{profile.activeRun ? 'Your garden outing is paused.' : 'Begin with a guppy. Raise it in the garden, then bring it home to stay.'}</p>
      <button className="home-button" onClick={() => interact(profile.activeRun ? onContinue : onRaise)}>{profile.activeRun ? 'Continue raising' : 'Raise your first guppy'} <span aria-hidden="true">↗</span></button>
    </div>}
    {!saved && <p className="home-save-notice" role="status">Saving is unavailable. Keep this session open. Purchases wait until saving works.</p>}
    {controlled && <div className="home-swim-status" inert={sheetOpen} aria-hidden={sheetOpen || undefined}><span>Move with arrow keys / WASD or the touch control.</span><button className="home-button home-button-secondary" onClick={() => interact(() => setControlledId(null))}>Back to watching</button></div>}
    <nav className="home-dock" aria-label="Home actions" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <button onClick={() => interact(onRaise)}><span aria-hidden="true">↗</span><span>Raise</span></button>
      <button aria-label="Collection" onClick={() => interact(() => { setSelectedId(null); setCollection(true); })}><span aria-hidden="true">▤</span><span>Collection</span><small>{profile.kept.length}</small></button>
      <button aria-label="Breed" onClick={() => interact(onBreed)}><span aria-hidden="true">♡</span><span>Breed</span>{profile.breeding && <small>1</small>}</button>
      <button onClick={() => interact(() => { closeSheet(); setControlledId(null); })} aria-pressed={!controlled}><span aria-hidden="true">≈</span><span>Watch</span></button>
    </nav>
    {sheetOpen && <div className="home-modal" onClick={event => { if (event.target === event.currentTarget) interact(closeSheet); }}>
      <div className={`home-sheet ${selected ? 'home-resident-sheet' : ''}`} ref={sheetRef} role="dialog" aria-modal="true" aria-label={selected ? 'Resident details' : 'Your collection'} tabIndex={-1}>
        <header className="home-sheet-header"><div><p className="home-eyebrow">{selected ? 'SAFE AT HOME' : 'THE PERSONAL COLLECTION'}</p><h2>{selected ? selected.name : 'Your little lives'}</h2></div><button className="home-icon" onClick={() => interact(closeSheet)} aria-label={selected ? 'Close resident details' : 'Close collection'}>×</button></header>
        <div className="home-sheet-scroll">
          {selected ? <><FishPortrait specimen={selected} /><FishCarePanel specimen={selected} phase={profile.worldClock ? sampleWorldClock(profile.worldClock,Date.now()).phase : 'day'} />
            <p className="home-note">Care follows this individual between tanks. Your kept fish stay safe during absence.</p>
            {(profile.activeRun || reserved) && <p className="home-notice">{reserved ? 'This parent is reserved in the nursery until you welcome its offspring.' : 'Return your current growing fish to the viewing tank before switching individuals.'}</p>}
            <div className="care-actions"><button className="home-button home-full" disabled={!!profile.activeRun || reserved} onClick={() => interact(() => { onRaiseResident(selected.id); closeSheet(); })}>Raise in growing tank <span aria-hidden="true">↗</span></button>
              <button className="home-button home-button-secondary home-full" onClick={() => interact(() => onFeedResident(selected.id))}>Feed in viewing tank <span aria-hidden="true">✦</span></button>
              <button className="home-button home-button-secondary home-full" onClick={() => interact(() => { setControlledId(selected.id); closeSheet(); })}>Swim as this fish <span aria-hidden="true">≈</span></button></div></> : <>
            <p className="home-note">{profile.kept.length} {profile.kept.length === 1 ? 'resident' : 'residents'} · Each fish keeps its own colour and story.</p>
            {profile.kept.length ? <div className="home-collection-grid">{profile.kept.slice(currentPage * 6, currentPage * 6 + 6).map(fish => <button className="home-resident-card" key={fish.id} onClick={() => select(fish.id)} aria-label={`View ${fish.name}, ${getStage(fish.growth)} ${fish.species}`}><FishPortrait specimen={fish} /><span className="home-card-copy"><strong>{fish.name}</strong><small>{getStage(fish.growth)} {fish.species}</small><small>{condition(fish)}</small></span><span aria-hidden="true">↗</span></button>)}</div> : <div className="home-collection-empty"><span aria-hidden="true">◌</span><h3>A place for your favourites</h3><p>Raise a fish, return to the nursery and choose Keep. Your fish will live here safely.</p><button className="home-button" onClick={() => interact(() => { closeSheet(); onRaise(); })}>Raise your first guppy</button></div>}
            {pages > 1 && <nav className="home-pagination" aria-label="Collection pages"><button className="home-button home-button-secondary" disabled={currentPage === 0} onClick={() => interact(() => setPage(currentPage - 1))}>Previous</button><span>{currentPage + 1} / {pages}</span><button className="home-button home-button-secondary" disabled={currentPage === pages - 1} onClick={() => interact(() => setPage(currentPage + 1))}>Next</button></nav>}
          </>}
        </div>
      </div>
    </div>}
  </section>;
}
