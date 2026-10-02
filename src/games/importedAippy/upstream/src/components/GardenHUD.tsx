import { useEffect, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { Adaptation } from '@/utils/boutique';
import WorldTimeBadge from '@/components/WorldTimeBadge';
import type { WorldClock } from '@/utils/worldClock';
interface Hud { health: number; hunger: number; stamina: number; growth: number; inShelter: boolean; isDead: boolean; threat?: boolean; burstCooldown?: number; burstExhausted?: boolean; isBursting?: boolean }
interface Props {
  hud: Hud; coins: number; value: number; stage: string; display: boolean; controls: boolean;
  onShop: () => void; onAppraise: () => void; onSound: () => void; sound: boolean; saved: boolean;
  refuge?: { distance: number; angle: number };
  knobRef: RefObject<HTMLDivElement>;
  joyDown: (e: PointerEvent<HTMLDivElement>) => void; joyMove: (e: PointerEvent<HTMLDivElement>) => void; joyUp: (e: PointerEvent<HTMLDivElement>) => void;
  burstDown: (e: PointerEvent<HTMLButtonElement>) => void; burstUp: (e: PointerEvent<HTMLButtonElement>) => void;
  eatDown?: (e: PointerEvent<HTMLButtonElement>) => void; eatUp?: (e: PointerEvent<HTMLButtonElement>) => void;
  worldClock?: WorldClock;
  resident?: boolean;
  eatClick?: (detail: number) => void;
  species?: string; mealNotice?: string; onCare?: () => void;
  mode?: 'view' | 'swim'; ageSeconds?: number; healing?: boolean;
  pendingDevelopment?: { stage: number; slots: number; options: Adaptation[] }[];
  onDevelopment?: () => void; onClean?: () => void;
  children?: ReactNode;
}
export default function GardenHUD(p: Props) {
  const { hud } = p;
  const burstLocked = !!hud.burstExhausted || hud.stamina <= 20 || (hud.burstCooldown ?? 0) > 0 || hud.isDead;
  const burstLabel = hud.isBursting ? 'BURST' : (hud.burstCooldown ?? 0) > 0 ? 'COOLDOWN' : burstLocked ? 'RECHARGE' : 'BURST';
  const burstHint = hud.isBursting ? 'hold / space' : (hud.burstCooldown ?? 0) > 0 ? (hud.burstCooldown ?? 0).toFixed(1) + 's' : burstLocked ? 'recover >20%' : 'hold / space';
  const mode = p.mode ?? 'swim';
  const ageMinutes = Math.max(0, p.ageSeconds ?? 0) / 60;
  const pendingChoices = (p.pendingDevelopment ?? []).reduce((total, opportunity) => total + opportunity.slots, 0);
  const [details, setDetails] = useState(false);
  const [intro, setIntro] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setIntro(false), 8000); return () => window.clearTimeout(timer); }, []);
  const toggleDetails = () => setDetails(value => !value);
  return <>
    {!p.display && <>
      <div className="garden-stats">
        <button className="garden-condition garden-glass" aria-label="Fish condition and value" aria-expanded={details} onClick={toggleDetails}>
          <span><label>Health <em>{hud.health}</em></label>{p.healing && <small className="garden-healing">Healing</small>}<i><b style={{ width: hud.health + '%', background: '#eda896' }} /></i></span>
          <span><label>Food <em>{hud.hunger}</em></label><i><b style={{ width: hud.hunger + '%', background: '#d8c58d' }} /></i></span>
        </button>
        <button className="garden-growth garden-glass" aria-label="Age, growth and appraisal details" aria-expanded={details} onClick={toggleDetails}>
          <span className="garden-age-label">Age <small>{p.stage}</small></span><span className="garden-age-value"><strong>{hud.growth}<small>%</small></strong><small>{ageMinutes.toFixed(1)} min</small></span><span aria-hidden="true">⌄</span>
        </button>
      </div>
      {(hud.inShelter || hud.threat) && <div className={'garden-status' + (hud.threat && !hud.inShelter ? ' danger' : '')}>
        {hud.inShelter ? '◌ Concealed' : '⚠ Predator nearby'}
      </div>}
      {details && <section className="garden-detail-panel garden-glass" aria-label="Fish details">
        <div><p className="garden-eyebrow">{p.stage} {(p.species ?? 'fish').toUpperCase()}</p><button className="garden-detail-close" aria-label="Close fish details" onClick={toggleDetails}>×</button></div>
        <p>Health <b>{hud.health}%</b> · Food <b>{hud.hunger}%</b></p><p>Growth <b>{hud.growth}%</b> · Nursery value <b>◈ {p.value}</b></p>
        <p className="garden-detail-note">Hold Eat near flakes or algae. Edible shrimp unlock as you grow. Tap your fish for its care and paths.</p>
        <button className="garden-button garden-button-secondary garden-button-small" onClick={() => { setDetails(false); p.onCare?.(); }}>Care and development</button>
      </section>}
    </>}
    <header className="garden-topbar"><div><p className="garden-eyebrow">SWIM</p><span>{mode === 'view' ? 'View' : 'Swim'}</span><WorldTimeBadge clock={p.worldClock} /></div>
      <div className="garden-top-actions"><button className="garden-wallet garden-glass" onClick={p.onShop} disabled={!hud.inShelter || hud.isDead} title={hud.inShelter ? "Return to View mode" : "Return to the nursery to enter View mode"} aria-label="Return to View mode">◈ {p.coins.toLocaleString()}</button>
        <button className="garden-round garden-glass" aria-label={p.sound ? 'Mute audio' : 'Enable audio'} onClick={p.onSound}>{p.sound ? '♪' : '♩'}</button></div>
    </header>
    {mode === 'swim' && <div className="garden-edge-actions">
      {pendingChoices > 0 && p.onDevelopment && <button className="garden-upgrades garden-glass" onClick={p.onDevelopment} aria-label="Choose upgrades"><strong>Choose upgrades</strong><small>{pendingChoices} {pendingChoices === 1 ? 'choice' : 'choices'} ready</small></button>}
      {p.onClean && <button className="garden-clean garden-glass" onClick={p.onClean} aria-label="Clean glass">Clean glass <small>Free</small></button>}
    </div>}
    {!p.saved && <p className="garden-save-warning" role="status">Saving unavailable</p>}
    {p.controls && <>
      {!!p.mealNotice && <p className="garden-meal-notice" role="status">{p.mealNotice}</p>}
      {!p.display && !hud.isDead && <div className="nursery-action">
        {hud.inShelter ? <button className="garden-button garden-glass nursery-button" aria-label={p.resident ? 'Return to View mode' : hud.growth >= 10 ? 'Appraise your fish' : 'Nursery · Feed to grow'} onClick={p.resident ? p.onShop : p.onAppraise}>{p.resident ? 'Return to View mode' : hud.growth >= 10 ? 'Appraise' : 'Feed to grow'} <span>↗</span></button> :
          <span className="nursery-direction" aria-label={'Nursery ' + (p.refuge?.distance ?? 0) + ' units away'}><i style={{ transform: 'rotate(' + (p.refuge?.angle ?? 0) + 'rad)' }}>➜</i><span>Nursery<small>{p.refuge?.distance ?? 0} away</small></span></span>}
      </div>}
      {!p.display && intro && hud.growth < 10 && <p className="garden-first-hint">Hold Eat near food · Tap your fish for care</p>}
      {p.display && <div className="nursery-action"><span className="nursery-direction">♡ Safe home</span></div>}
      <div className="garden-joystick" onPointerDown={p.joyDown} onPointerMove={p.joyMove} onPointerUp={p.joyUp} onPointerCancel={p.joyUp} aria-label="Swim joystick">
        <div className="joystick-inner" /><div className="joystick-knob" ref={p.knobRef}><span /></div>
      </div>
      <button className={'garden-burst' + (burstLabel !== 'BURST' ? ' garden-burst-waiting' : '') + (hud.stamina < 20 ? ' garden-burst-low' : '')} aria-label={'Burst speed · ' + burstLabel.toLowerCase() + (burstLocked ? ' · ' + burstHint : '')} aria-disabled={burstLocked && !hud.isBursting} onPointerDown={p.burstDown} onPointerUp={p.burstUp} onPointerCancel={p.burstUp} style={{ background: 'conic-gradient(' + (hud.stamina < 20 ? '#e76565 ' : burstLocked && !hud.isBursting ? '#97b5b6 ' : '#e5d59d ') + hud.stamina * 3.6 + 'deg, rgba(225,235,223,0.12) 0)' }}><span><b>{burstLabel}</b><small>{burstHint}</small></span></button>
      {!p.display && <button className="garden-eat" aria-label="Eat food" onClick={e => p.eatClick?.(e.detail)} onPointerDown={p.eatDown} onPointerUp={p.eatUp} onPointerCancel={p.eatUp}><span><b>EAT</b><small>tap / hold / E</small></span></button>}
    </>}
    {hud.health < 25 && !hud.isDead && <><div className="garden-low-health-vignette" aria-hidden="true" /><p className="garden-low-health" role="status">Low health · Rest in the castle bubbles</p></>}
    {p.children}
  </>;
}
