import { useState } from 'react';
import { getStage, type BoutiqueSave, type Specimen } from '@/utils/boutique';
import FishPortrait from '@/components/FishPortrait';

interface Props {
  profile: BoutiqueSave;
  onReturn: () => void;
  onDisplay: (specimen: Specimen) => void;
  saved: boolean;
}
export default function BoutiqueScreen({ profile, onReturn, onDisplay, saved }: Props) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(profile.kept.length / 6));
  const visible = profile.kept.slice(page * 6, page * 6 + 6);
  return <section className="boutique-screen" aria-label="AquaLume boutique">
    <header className="boutique-header">
      <div><p className="garden-eyebrow">AQUARIUM BOUTIQUE</p><h1>AquaLume</h1><p>Little lives. Beautifully raised.</p></div>
      <button className="garden-round" onClick={onReturn} aria-label="Return to garden">×</button>
    </header>
    <div className="boutique-summary garden-glass">
      <div><span className="garden-eyebrow">YOUR BOUTIQUE</span><strong className="coin-total">◈ {profile.coins.toLocaleString()}</strong><span>{profile.sales} specimens sold</span></div>
      <button className="garden-button" onClick={onReturn}>{profile.activeRun ? 'Continue raising' : 'Raise a guppy'} <span>↗</span></button>
    </div>
    {!saved && <p className="garden-notice" role="status">Saving is unavailable. Keep this session open; nursery transactions will wait until saving works.</p>}
    <div className="boutique-section-title"><div><p className="garden-eyebrow">THE PERSONAL DISPLAY</p><h2>Your little collection</h2></div><span>{profile.kept.length} kept</span></div>
    {visible.length ? <div className="specimen-grid">{visible.map(fish => <article className="specimen-card garden-glass" key={fish.id}>
      <FishPortrait specimen={fish} />
      <div className="specimen-card-copy"><p className="garden-eyebrow">{getStage(fish.growth)} GUPPY</p><h3>{fish.name}</h3>
        <p>{fish.traits.length ? fish.traits.map(trait => trait === 'swift' ? 'Swift fins' : 'Ornamental fins').join(' · ') : 'Coral & gold'}</p>
        <button className="garden-button garden-button-small" onClick={() => onDisplay(fish)}>Swim as this fish ↗</button>
      </div>
    </article>)}</div> : <div className="boutique-empty garden-glass"><span className="empty-ripple">◌</span><h3>A place for your favourites</h3><p>Raise a fish, return to the nursery and choose Keep. Your specimen will live here safely.</p></div>}
    {pages > 1 && <nav className="collection-pages" aria-label="Collection pages"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(Math.min(pages - 1, page + 1))}>Next</button></nav>}
    <footer className="boutique-footer"><span>Guppy Garden</span><span>Free starter stock · No time limit</span></footer>
  </section>;
}
