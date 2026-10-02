import { useCallback, useEffect, useRef, useState } from 'react';
import { useSound, useAudioContext } from '@aippy/runtime/audio';
import * as Tone from 'tone';
import assetsData from '@/config/assets';

/** One audio owner for home, sheets and the currently raised fish. */
export function useAquariumAudio() {
  const { play, stop } = useSound({ bgm: assetsData.AUDIO_YDEK });
  const { getAudioContext, unlock } = useAudioContext();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const enabled = useRef(true), alive = useRef(true), started = useRef(false), requested = useRef(false);
  const generation = useRef(0), pending = useRef<Promise<void> | null>(null);
  const owner = useRef({ play, stop, getAudioContext, unlock });
  owner.current = { play, stop, getAudioContext, unlock };
  const bite = useRef<Tone.Synth | null>(null), burst = useRef<Tone.MembraneSynth | null>(null), damage = useRef<Tone.Synth | null>(null);
  const initAudio = useCallback((): Promise<void> => {
    if (!enabled.current || !alive.current || document.hidden) return Promise.resolve();
    requested.current = true;
    if (pending.current) return pending.current;
    const epoch = generation.current;
    const task = (async () => {
      try {
        const ctx = owner.current.getAudioContext();
        if (!ctx) return;
        await owner.current.unlock();
        if (!alive.current || !enabled.current || epoch !== generation.current || document.hidden) return;
        Tone.setContext(ctx); await Tone.start();
        if (!alive.current || !enabled.current || epoch !== generation.current || document.hidden) return;
        if (!bite.current) {
          bite.current = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .005, decay: .08, sustain: 0, release: .04 } }).toDestination(); bite.current.volume.value = -4;
        }
        if (!burst.current) {
          burst.current = new Tone.MembraneSynth({ pitchDecay: .05, octaves: 3, oscillator: { type: 'sine' }, envelope: { attack: .002, decay: .15, sustain: 0, release: .1 } }).toDestination(); burst.current.volume.value = -6;
        }
        if (!damage.current) {
          damage.current = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: .01, decay: .2, sustain: 0, release: .1 } }).toDestination(); damage.current.volume.value = -2;
        }
        if (!started.current) {
          await owner.current.play('bgm', { loop: true, volume: .45 });
          if (!alive.current || !enabled.current || epoch !== generation.current || document.hidden) owner.current.stop('bgm');
          else started.current = true;
        }
      } catch (error) { console.warn('[Aippy] Audio init notice:', error); }
    })();
    pending.current = task;
    void task.finally(() => { if (pending.current === task) pending.current = null; });
    return task;
  }, []);
  const toggleSound = useCallback(() => {
    const next = !enabled.current; enabled.current = next; setSoundEnabled(next);
    if (!next) {
      generation.current++; owner.current.stop('bgm'); started.current = false;
      bite.current?.triggerRelease(); burst.current?.triggerRelease(); damage.current?.triggerRelease();
    } else void (pending.current ?? Promise.resolve()).then(() => initAudio());
  }, [initAudio]);
  useEffect(() => {
    alive.current = true;
    const visibility = () => {
      if (document.hidden) {
        generation.current++; owner.current.stop('bgm'); started.current = false;
        bite.current?.triggerRelease(); burst.current?.triggerRelease(); damage.current?.triggerRelease();
      } else if (requested.current && enabled.current) void (pending.current ?? Promise.resolve()).then(() => initAudio());
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false; generation.current++;
      document.removeEventListener('visibilitychange', visibility);
      owner.current.stop('bgm'); started.current = false;
      bite.current?.dispose(); burst.current?.dispose(); damage.current?.dispose();
      bite.current = null; burst.current = null; damage.current = null;
    };
  }, [initAudio]);
  const playBiteSound = useCallback(() => { if (enabled.current && !document.hidden) { try { bite.current?.triggerAttackRelease('G5', '32n'); } catch { /* unavailable audio */ } } }, []);
  const playBurstSound = useCallback(() => { if (enabled.current && !document.hidden) { try { burst.current?.triggerAttackRelease('C2', '16n'); } catch { /* unavailable audio */ } } }, []);
  const playDamageSound = useCallback(() => { if (enabled.current && !document.hidden) { try { damage.current?.triggerAttackRelease('D3', '16n'); } catch { /* unavailable audio */ } } }, []);
  return { soundEnabled, initAudio, toggleSound, playBiteSound, playBurstSound, playDamageSound };
}
export type AquariumAudio = ReturnType<typeof useAquariumAudio>;
