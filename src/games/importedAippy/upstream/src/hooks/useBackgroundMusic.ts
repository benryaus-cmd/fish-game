import { useEffect, useRef, useState } from 'react';
import { economy } from '@/utils/economy';

const MUSIC_URL = 'https://cdn.aippy.ai/asset/1289d42e066f44f2bd0a81bcd41fee45.m4a';
const MUSIC_VOLUME = 0.5;

// Single shared player for the whole app — never more than one instance
let track: HTMLAudioElement | null = null;
function getTrack(): HTMLAudioElement {
  if (!track) {
    track = new Audio(MUSIC_URL);
    track.loop = true;
    track.preload = 'auto';
    track.volume = MUSIC_VOLUME;
  }
  return track;
}

/** Looping background music (OceanHome) with a saved on/off preference. */
export function useBackgroundMusic() {
  const [on, setOn] = useState(() => !economy.getSettings().soundMuted);
  const onRef = useRef(on);
  const gestureStartRef = useRef(0);

  useEffect(() => {
    const t = getTrack();
    const tryPlay = (fromGesture: boolean) => {
      if (!onRef.current || !t.paused) return;
      if (fromGesture) gestureStartRef.current = performance.now();
      t.play().catch((e) => console.warn('[Aippy] Music waiting for user interaction', e));
    };
    tryPlay(false);
    const onGesture = () => tryPlay(true);
    const onVisibility = () => {
      if (document.hidden) t.pause();
      else tryPlay(false);
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      document.removeEventListener('visibilitychange', onVisibility);
      t.pause();
    };
  }, []);

  const toggle = () => {
    const t = getTrack();
    // The very first tap on the button just unlocked playback — keep it playing
    if (onRef.current && performance.now() - gestureStartRef.current < 700) return;
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    economy.setSettings({ soundMuted: !next });
    if (next) t.play().catch((e) => console.warn('[Aippy] Music failed to resume', e));
    else t.pause();
  };

  return { on, toggle };
}