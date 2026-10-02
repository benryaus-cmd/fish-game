import { useMemo } from 'react';
import { createSpecimen, type BoutiqueSave } from '@/utils/boutique';
import { STOCK_CATALOG, type StockId } from '@/utils/stockCatalog';
import FishPortrait from '@/components/FishPortrait';
import { useHomeSheet } from '@/components/HomeScreen';
import './HomeUI.css';

interface Props {
  profile: BoutiqueSave; saved: boolean;
  onChoose: (id: StockId) => void; onClose: () => void;
}

export default function StockSheet({ profile, saved, onChoose, onClose }: Props) {
  const ref = useHomeSheet(true, onClose);
  const previews = useMemo(() => STOCK_CATALOG.map(stock => ({ stock, specimen: createSpecimen(stock.id, `stock-preview-${stock.id}`) })), []);
  const active = !!profile.activeRun;
  return <div className="home-modal home-stock-modal" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="home-sheet home-stock-sheet" ref={ref} role="dialog" aria-modal="true" aria-label="Choose stock" tabIndex={-1}>
      <header className="home-sheet-header"><div><p className="home-eyebrow">THE GUPPY NURSERY</p><h2>Choose a little beginning</h2></div><button className="home-icon" onClick={onClose} aria-label="Close stock selection">×</button></header>
      <div className="home-sheet-scroll">
        <div className="home-stock-intro"><p>Inherited colour. Individual character.<br />Raise your choice in Guppy Garden.</p><span className="home-wallet"><span aria-hidden="true">◈</span> {profile.coins.toLocaleString()} <small>credits</small></span></div>
        {active && <p className="home-notice" role="status">An outing is already paused. Close this sheet and choose Continue raising to return to your guppy.</p>}
        {!saved && <p className="home-notice" role="status">Saving failed. Purchases complete only when saving succeeds. You can retry.</p>}
        <div className="home-stock-grid">{previews.map(({ stock, specimen }) => {
          const affordable = profile.coins >= stock.price;
          const disabled = active || !affordable;
          return <article className="home-stock-card" key={stock.id}>
            <div className="home-stock-portrait"><FishPortrait specimen={specimen} /><span className="home-stock-price">{stock.price === 0 ? 'Free' : `◈ ${stock.price}`}</span></div>
            <div className="home-stock-copy"><p className="home-eyebrow">FRY · {stock.finForm.toUpperCase()} FINS</p><h3>{stock.name}</h3><p>{stock.description}</p>
              <dl className="home-stock-facts"><div><dt>Potential</dt><dd>{stock.potential}</dd></div><div><dt>Starting condition</dt><dd>0% growth · 100% health · fully fed</dd></div><div><dt>Diet</dt><dd>Small fish found in the garden</dd></div><div><dt>Destination</dt><dd>Guppy Garden</dd></div></dl>
              <p className="home-stock-clarifier">Swift and Ornamental are acquired while raising.</p>
              <button className="home-button home-full" disabled={disabled} onClick={() => { if (disabled) return; onChoose(stock.id); }} aria-label={stock.id === 'ordinary' ? 'Raise ordinary guppy' : `Buy ${stock.name} guppy`}>{stock.price === 0 ? 'Raise ordinary guppy' : `Buy ${stock.name} guppy`} <span aria-hidden="true">↗</span></button>
              {!affordable && <p className="home-stock-shortfall">{stock.price - profile.coins} more credits needed</p>}
            </div>
          </article>;
        })}</div>
        <p className="home-note home-stock-footer">Keeping a raised guppy gives it a safe home here. Stock is purchased only when you start an outing.</p>
      </div>
    </div>
  </div>;
}
