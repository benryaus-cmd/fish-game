import { useEffect, useRef, useState } from 'react';
import { getStage, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import HomeTank from '@/components/HomeTank';
import FishPortrait from '@/components/FishPortrait';
import './HomeUI.css';

interface Props {
  width: number; height: number; profile: BoutiqueSave; saved: boolean;
  onRaise: () => void; onContinue: () => void; onSound: () => void;
  sound: boolean; onInteract: () => void; paused?: boolean;
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
    (controls()[0] ?? panel)?.focus();
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
    return () => { document.removeEventListener('keydown', key); opener?.focus(); };
  }, [open]);
  return ref;
}

function condition(fish: Specimen) {
  return `${Math.round(fish.health)}% health · ${Math.round(fish.hunger)}% fed`;
}

export default function HomeScreen({ width, height, profile, saved, onRaise, onContinue, onSound, sound, onInteract, paused = false }: Props) {
  const [collection, setCollection] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controlledId, setControlledId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(profile.kept.length / 6));
  const currentPage = Math.min(page, pages - 1);
  const selected = profile.kept.find(fish => fish.id === selectedId);
  const controlled = profile.kept.find(fish => fish.id === controlledId);
  const sheetOpen = collection || !!selected;
  const closeSheet = () => { setCollection(false); setSelectedId(null); };
  const sheetRef = useHomeSheet(sheetOpen, closeSheet);
  useEffect(() => { if (selectedId) sheetRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [selectedId]);
  const interact = (action: () => void) => { onInteract(); action(); };
  const select = (id: string) => interact(() => { setCollection(false); setSelectedId(id); });
  return <section className="home-screen" aria-label="Home aquarium" style={{ width, height }}>
    <div inert={sheetOpen} aria-hidden={sheetOpen || undefined}><HomeTank width={width} height={height} specimens={profile.kept} controlledId={controlledId} onSelect={select} paused={sheetOpen || paused} /></div>
    <div className="home-shade" aria-hidden="true" />
    <header className="home-header" inert={sheetOpen} aria-hidden={sheetOpen || undefined}>
      <div><p className="home-eyebrow">YOUR LIVING AQUARIUM</p><h1>AquaLume</h1></div>
      <div className="home-tools"><span className="home-wallet" aria-label={`${profile.coins} credits`}><span aria-hidden="true">◈</span> {profile.coins.toLocaleString()} <small>credits</small></span><button className="home-icon" onClick={() => interact(onSound)} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound}>{sound ? '♪' : '♩'}</button></div>
    </header>
    <div className="home-context">
      <p className="home-eyebrow">GUPPY GARDEN · HOME</p>
      <p>{controlled ? `Swimming with ${controlled.name}` : profile.kept.length ? 'A little world, beautifully kept.' : 'A home for your first little life.'}</p>
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
      <button onClick={() => interact(() => { closeSheet(); setControlledId(null); })} aria-pressed={!controlled}><span aria-hidden="true">≈</span><span>Watch</span></button>
    </nav>
    {sheetOpen && <div className="home-modal" onClick={event => { if (event.target === event.currentTarget) interact(closeSheet); }}>
      <div className={`home-sheet ${selected ? 'home-resident-sheet' : ''}`} ref={sheetRef} role="dialog" aria-modal="true" aria-label={selected ? 'Resident details' : 'Your collection'} tabIndex={-1}>
        <header className="home-sheet-header"><div><p className="home-eyebrow">{selected ? 'SAFE AT HOME' : 'THE PERSONAL COLLECTION'}</p><h2>{selected ? selected.name : 'Your little lives'}</h2></div><button className="home-icon" onClick={() => interact(closeSheet)} aria-label={selected ? 'Close resident details' : 'Close collection'}>×</button></header>
        <div className="home-sheet-scroll">
          {selected ? <><FishPortrait specimen={selected} /><p className="home-resident-stage">{getStage(selected.growth)} guppy · {selected.inherited?.finForm ?? 'original'} fins</p><dl className="home-stats"><div><dt>Growth</dt><dd>{Math.round(selected.growth)}%</dd></div><div><dt>Health</dt><dd>{Math.round(selected.health)}%</dd></div><div><dt>Fed</dt><dd>{Math.round(selected.hunger)}%</dd></div></dl><p className="home-resident-traits">{selected.traits.length ? selected.traits.map(trait => trait === 'swift' ? 'Swift fins' : 'Ornamental fins').join(' · ') : 'No acquired adaptations yet'}</p><p className="home-note">A safe home swim. Their condition stays exactly as you left it.</p><button className="home-button home-full" onClick={() => interact(() => { setControlledId(selected.id); closeSheet(); })}>Swim as this fish <span aria-hidden="true">↗</span></button></> : <>
            <p className="home-note">{profile.kept.length} {profile.kept.length === 1 ? 'resident' : 'residents'} · Each fish keeps its own colour and story.</p>
            {profile.kept.length ? <div className="home-collection-grid">{profile.kept.slice(currentPage * 6, currentPage * 6 + 6).map(fish => <button className="home-resident-card" key={fish.id} onClick={() => select(fish.id)} aria-label={`View ${fish.name}, ${getStage(fish.growth)} guppy`}><FishPortrait specimen={fish} /><span className="home-card-copy"><strong>{fish.name}</strong><small>{getStage(fish.growth)} guppy</small><small>{condition(fish)}</small></span><span aria-hidden="true">↗</span></button>)}</div> : <div className="home-collection-empty"><span aria-hidden="true">◌</span><h3>A place for your favourites</h3><p>Raise a guppy, return to the nursery and choose Keep. Your fish will live here safely.</p><button className="home-button" onClick={() => interact(() => { closeSheet(); onRaise(); })}>Raise your first guppy</button></div>}
            {pages > 1 && <nav className="home-pagination" aria-label="Collection pages"><button className="home-button home-button-secondary" disabled={currentPage === 0} onClick={() => interact(() => setPage(currentPage - 1))}>Previous</button><span>{currentPage + 1} / {pages}</span><button className="home-button home-button-secondary" disabled={currentPage === pages - 1} onClick={() => interact(() => setPage(currentPage + 1))}>Next</button></nav>}
          </>}
        </div>
      </div>
    </div>}
  </section>;
}
