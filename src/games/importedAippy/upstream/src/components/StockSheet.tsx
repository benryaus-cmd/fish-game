import { useMemo, useState } from 'react';
import { createSpecimen, ownedFishCount, NURSERY_CAPACITY, type BoutiqueSave } from '@/utils/boutique';
import { STOCK_CATALOG, type StockId, type BodyShape } from '@/utils/stockCatalog';
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
  const full = ownedFishCount(profile) >= NURSERY_CAPACITY;
  const active = !!profile.activeRun;
  const [family, setFamily] = useState<BodyShape>('starter');
  return <div className="home-modal home-stock-modal" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="home-sheet home-stock-sheet" ref={ref} role="dialog" aria-modal="true" aria-label="Choose stock" tabIndex={-1}>
      <header className="home-sheet-header"><div><p className="home-eyebrow">THE ORNAMENTAL NURSERY</p><h2>Choose a little beginning</h2></div><button className="home-icon" onClick={onClose} aria-label="Close stock selection">×</button></header>
      <div className="home-sheet-scroll">
        <div className="home-stock-intro"><p>Three body families. Your own little lives.<br />Care reveals their colour as they grow.</p><span className="home-wallet"><span aria-hidden="true">◈</span> {profile.coins.toLocaleString()} <small>credits</small></span></div>
        <div className="stock-family-tabs" role="tablist" aria-label="Fish families">{([['starter','Starter'],['colorful','Tropical'],['angel','Angels']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={family===id} onClick={()=>setFamily(id)}>{label}</button>)}</div>
        {full && <p className="home-notice" role="status">All 10 fish spaces are occupied or reserved. Sell a fish to make room.</p>}
        {active && <p className="home-notice" role="status">An outing is already paused. Close this sheet and choose Continue Swim to return to your fish.</p>}
        {!saved && <p className="home-notice" role="status">Saving failed. Purchases complete only when saving succeeds. You can retry.</p>}
        <div className="home-stock-grid">{previews.filter(({stock})=>stock.bodyShape===family).map(({ stock, specimen }) => {
          const affordable = profile.coins >= stock.price;
          const disabled = active || full || !saved || !affordable;
          return <article className="home-stock-card" key={stock.id}>
            <div className="home-stock-portrait"><FishPortrait specimen={specimen} /><span className="home-stock-price">{stock.price === 0 ? 'Free' : `◈ ${stock.price}`}</span></div>
            <div className="home-stock-copy"><p className="home-eyebrow">{stock.species.toUpperCase()} FRY · {stock.finStyle.toUpperCase()} FINS</p><h3>{stock.name}</h3><p>{stock.description}</p>
              <dl className="home-stock-facts"><div><dt>Potential</dt><dd>{stock.potential}</dd></div><div><dt>Starting condition</dt><dd>0% growth · 100% health · fully fed</dd></div><div><dt>Diet</dt><dd>Flakes, pellets and algae; edible shrimp after juvenile growth</dd></div><div><dt>Destination</dt><dd>Swim · 10 healthy minutes; good meals can reduce this to 7.5</dd></div></dl>
              <p className="home-stock-clarifier">Swift, Vibrancy, Ornate and Vital develop while raising.</p>
              <button className="home-button home-full" disabled={disabled} onClick={() => { if (disabled) return; onChoose(stock.id); }} aria-label={stock.id === 'ordinary' ? 'Raise ordinary guppy' : `Buy ${stock.name}${stock.species==='guppy'?' guppy':''}`}>{stock.price === 0 ? 'Raise ordinary guppy' : `Buy ${stock.name}${stock.species==='guppy'?' guppy':''}`} <span aria-hidden="true">↗</span></button>
              {!affordable && <p className="home-stock-shortfall">{stock.price - profile.coins} more credits needed</p>}
            </div>
          </article>;
        })}</div>
        <p className="home-note home-stock-footer">Keep a raised fish to give it a safe home. Cross-family breeding combines body, fins and patterns using fictional game inheritance. Stock is purchased only when you start an outing.</p>
      </div>
    </div>
  </div>;
}
