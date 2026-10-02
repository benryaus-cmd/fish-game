import type { PointerEvent, ReactNode, RefObject } from 'react';
interface Hud { health: number; hunger: number; stamina: number; growth: number; inShelter: boolean; isDead: boolean; threat?: boolean }
interface Props {
  hud: Hud; coins: number; value: number; stage: string; display: boolean; controls: boolean;
  onShop: () => void; onAppraise: () => void; onSound: () => void; sound: boolean; saved: boolean;
  knobRef: RefObject<HTMLDivElement>;
  joyDown: (e: PointerEvent<HTMLDivElement>) => void; joyMove: (e: PointerEvent<HTMLDivElement>) => void; joyUp: (e: PointerEvent<HTMLDivElement>) => void;
  burstDown: (e: PointerEvent<HTMLButtonElement>) => void; burstUp: (e: PointerEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}
export default function GardenHUD(p: Props) {
  const { hud } = p;
  return <>
    <header className="garden-topbar"><div><p className="garden-eyebrow">AQUALUME</p><span>{p.display ? 'Personal display' : 'Guppy Garden'}</span></div>
      <div className="garden-top-actions"><button className="garden-wallet garden-glass" onClick={p.onShop} aria-label="Open boutique">◈ {p.coins.toLocaleString()}</button>
        <button className="garden-round garden-glass" aria-label={p.sound ? 'Mute audio' : 'Enable audio'} onClick={p.onSound}>{p.sound ? '♪' : '♩'}</button></div>
    </header>
    {!p.display && <div className="garden-stats"><div className="garden-condition garden-glass">
      <label>Health <span>{hud.health}</span><i><b style={{ width: hud.health + '%', background: '#eda896' }} /></i></label>
      <label>Food <span>{hud.hunger}</span><i><b style={{ width: hud.hunger + '%', background: '#d8c58d' }} /></i></label>
      <span className={hud.inShelter ? 'shelter-status concealed' : 'shelter-status'}>{hud.inShelter ? '◌ Concealed' : hud.threat ? '⚠ Predator nearby' : 'Open water'}</span>
    </div><div className="garden-growth garden-glass"><p className="garden-eyebrow">{p.stage} GUPPY</p><strong>{hud.growth}<small>%</small></strong><span>Nursery value ◈ {p.value}</span></div></div>}
    {!p.saved && <p className="garden-save-warning" role="status">Saving unavailable</p>}
    {p.controls && <>
      {!p.display && !hud.isDead && <div className="nursery-action">{hud.inShelter ? <button className="garden-button garden-glass" onClick={p.onAppraise}>{hud.growth >= 10 ? 'Appraise your fish' : 'Nursery · Feed to grow'} <span>↗</span></button> : <span className="garden-glass nursery-hint">Feed, grow, then return to the leafy nursery</span>}</div>}
      {p.display && <div className="nursery-action"><span className="garden-glass nursery-hint">A safe home · Swim freely</span></div>}
      <div className="garden-joystick" onPointerDown={p.joyDown} onPointerMove={p.joyMove} onPointerUp={p.joyUp} onPointerCancel={p.joyUp} aria-label="Swim joystick">
        <div className="joystick-inner" /><div className="joystick-knob" ref={p.knobRef}><span /></div>
      </div>
      <button className="garden-burst" aria-label="Burst speed" onPointerDown={p.burstDown} onPointerUp={p.burstUp} onPointerCancel={p.burstUp} style={{ background: 'conic-gradient(#e5d59d ' + hud.stamina * 3.6 + 'deg, rgba(225,235,223,0.12) 0)' }}><span><b>BURST</b><small>hold / space</small></span></button>
    </>}
    {p.children}
  </>;
}
