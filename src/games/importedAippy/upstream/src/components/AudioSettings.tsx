import { useId } from 'react';
import { useHomeSheet } from '@/components/HomeScreen';
import type { AquariumAudio } from '../hooks/useAquariumAudio';
import './HomeUI.css';

interface Props { audio: AquariumAudio; onClose: () => void }
export default function AudioSettings({ audio, onClose }: Props) {
  const ref = useHomeSheet(true, onClose);
  const id = useId();
  return <div className="home-modal" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="home-sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} style={{ width: 'min(440px, calc(100vw - 32px))' }}>
      <header className="home-sheet-header"><div><p className="home-eyebrow">SWIM</p><h2 id={`${id}-title`}>Audio settings</h2></div><button className="home-icon" onClick={onClose} aria-label="Close audio settings">×</button></header>
      <div className="home-sheet-scroll" style={{ display: 'grid', gap: 24, padding: '24px' }}>
        {([{ name: 'Music', volume: audio.musicVolume, setVolume: audio.setMusicVolume, key: 'music' }, { name: 'Sound effects', volume: audio.sfxVolume, setVolume: audio.setSfxVolume, key: 'effects' }] as const).map(({ name, volume, setVolume, key }) => <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><label htmlFor={`${id}-${key}`}>{name}</label><output htmlFor={`${id}-${key}`}>{Math.round(volume * 100)}%</output></div>
          <input id={`${id}-${key}`} type="range" min={0} max={1} step={.01} value={volume} tabIndex={0} aria-valuetext={`${Math.round(volume * 100)} percent`} onChange={event => { setVolume(Number(event.target.value)); void audio.initAudio(); }} style={{ width: '100%', minHeight: 32, accentColor: '#83e0d5' }} />
        </div>)}
        <p className="home-note" style={{ margin: 0 }}>Set either volume to 0% to mute it. Your levels are saved automatically.</p>
      </div>
    </div>
  </div>;
}
