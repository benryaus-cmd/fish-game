import { useEffect, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
interface Hud { health: number; hunger: number; stamina: number; growth: number; inShelter: boolean; isDead: boolean; threat?: boolean }
interface Props {
  hud: Hud; coins: number; value: number; stage: string; display: boolean; controls: boolean;
  onShop: () => void; onAppraise: () => void; onSound: () => void; sound: boolean; saved: boolean;
  refuge?: { distance: number; angle: number };
  knobRef: RefObject<HTMLDivElement>;
  joyDown: (e: PointerEvent<HTMLDivElement>) => void; joyMove: (e: PointerEvent<HTMLDivElement>) => void; joyUp: (e: PointerEvent<HTMLDivElement>) => void;
  burstDown: (e: PointerEvent<HTMLButtonElement>) => void; burstUp: (e: PointerEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}
export default function GardenHUD(p: Props) {
  const { hud } = p;
  const [details, setDetails] = useState(false);
  const [intro, setIntro] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setIntro(false), 8000); return () => window.clearTimeout(timer); }, []);
  const toggleDetails = () => setDetails(value => !value);
  return <>
    <header className="garden-topbar"><div><p className="garden-eyebrow">AQUALUME</p><span>{p.display ? 'Personal display' : 'Guppy Garden'}</span></div>
      <div className="garden-top-actions"><button className="garden-wallet garden-glass" onClick={p.onShop} aria-label="Open boutique">◈ {p.coins.toLocaleString()}</button>
        <button className="garden-round garden-glass" aria-label={p.sound ? 'Mute audio' : 'Enable audio'} onClick={p.onSound}>{p.sound ? '♪' : '♩'}</button></div>
    </header>
    {!p.display && <>
      <div className="garden-stats">
        <button className="garden-condition garden-glass" aria-label="Fish condition and value" aria-expanded={details} onClick={toggleDetails}>
          <span><label>Health <em>{hud.health}</em></label><i><b style={{ width: hud.health + '%', background: '#eda896' }} /></i></span>
          <span><label>Food <em>{hud.hunger}</em></label><i><b style={{ width: hud.hunger + '%', background: '#d8c58d' }} /></i></span>
        </button>
        <button className="garden-growth garden-glass" aria-label="Growth and appraisal details" aria-expanded={details} onClick={toggleDetails}>
          <span>{p.stage}</span><strong>{hud.growth}<small>%</small></strong><span>⌄</span>
        </button>
      </div>
      {(hud.inShelter || hud.threat) && <div className={'garden-status' + (hud.threat && !hud.inShelter ? ' danger' : '')}>
        {hud.inShelter ? '◌ Concealed' : '⚠ Predator nearby'}
      </div>}
      {details && <section className="garden-detail-panel garden-glass" aria-label="Fish details">
        <div><p className="garden-eyebrow">{p.stage} GUPPY</p><button className="garden-detail-close" aria-label="Close fish details" onClick={toggleDetails}>×</button></div>
        <p>Health <b>{hud.health}%</b> · Food <b>{hud.hunger}%</b></p><p>Growth <b>{hud.growth}%</b> · Nursery value <b>◈ {p.value}</b></p>
        <p className="garden-detail-note">Feed on smaller fish. Return to the leafy nursery to sell or keep.</p>
      </section>}
    </>}
    {!p.saved && <p className="garden-save-warning" role="status">Saving unavailable</p>}
    {p.controls && <>
      {!p.display && !hud.isDead && <div className="nursery-action">
        {hud.inShelter ? <button className="garden-button garden-glass nursery-button" aria-label={hud.growth >= 10 ? 'Appraise your fish' : 'Nursery · Feed to grow'} onClick={p.onAppraise}>{hud.growth >= 10 ? 'Appraise' : 'Feed to grow'} <span>↗</span></button> :
          <span className="nursery-direction" aria-label={'Nursery ' + (p.refuge?.distance ?? 0) + ' units away'}><i style={{ transform: 'rotate(' + (p.refuge?.angle ?? 0) + 'rad)' }}>➜</i><span>Nursery<small>{p.refuge?.distance ?? 0} away</small></span></span>}
      </div>}
      {!p.display && intro && hud.growth < 10 && <p className="garden-first-hint">Eat small fish · Return here to sell or keep</p>}
      {p.display && <div className="nursery-action"><span className="nursery-direction">♡ Safe home</span></div>}
      <div className="garden-joystick" onPointerDown={p.joyDown} onPointerMove={p.joyMove} onPointerUp={p.joyUp} onPointerCancel={p.joyUp} aria-label="Swim joystick">
        <div className="joystick-inner" /><div className="joystick-knob" ref={p.knobRef}><span /></div>
      </div>
      <button className="garden-burst" aria-label="Burst speed" onPointerDown={p.burstDown} onPointerUp={p.burstUp} onPointerCancel={p.burstUp} style={{ background: 'conic-gradient(#e5d59d ' + hud.stamina * 3.6 + 'deg, rgba(225,235,223,0.12) 0)' }}><span><b>BURST</b><small>hold / space</small></span></button>
    </>}
    {p.children}
  </>;
}
