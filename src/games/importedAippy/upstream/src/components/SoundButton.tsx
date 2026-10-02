import { SpeakerIcon } from '@/components/UiIcons';

interface SoundButtonProps {
  on: boolean;
  onToggle: () => void;
}

const SoundButton = ({ on, onToggle }: SoundButtonProps) => (
  <button
    type="button"
    aria-label={on ? 'Mute sound' : 'Play sound'}
    aria-pressed={on}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={`glass ui-press pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full ${on ? 'text-white' : 'text-white/55'}`}
  >
    <SpeakerIcon muted={!on} />
  </button>
);

export default SoundButton;