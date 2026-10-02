import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioContext } from '@aippy/runtime/audio';
import * as Tone from 'tone';
import assetsData from '@/config/assets';
import { loadAudioSettings, normalizeVolume, sfxVolumeDb, writeAudioSettings } from '@/utils/audioSettings';

/** One audio owner for SWIM home, sheets and the currently raised fish. */
export function useAquariumAudio() {
  const { getAudioContext, unlock } = useAudioContext();
  const [settings, setSettings] = useState(loadAudioSettings);
  const settingsRef = useRef(settings);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const enabled = useRef(true), alive = useRef(true), requested = useRef(false);
  const generation = useRef(0), pending = useRef<Promise<void> | null>(null);
  const owner = useRef({ getAudioContext, unlock });
  owner.current = { getAudioContext, unlock };
  // Runtime useSound has no live gain API. Own the loop on its shared context
  // so moving the music slider changes gain without restarting the score.
  const music = useRef<AudioBufferSourceNode | null>(null), musicGain = useRef<GainNode | null>(null);
  const buffer = useRef<{ context: AudioContext; promise: Promise<AudioBuffer> } | null>(null);
  const effects = useRef<Tone.Volume | null>(null);
  const bite = useRef<Tone.Synth | null>(null), burst = useRef<Tone.MembraneSynth | null>(null), damage = useRef<Tone.Synth | null>(null);
  const applyEffectsVolume = useCallback(() => {
    const volume = settingsRef.current.sfxVolume;
    if (effects.current) effects.current.mute = !enabled.current || volume === 0;
    for (const [synth, base] of [[bite.current, -4], [burst.current, -6], [damage.current, -2]] as const) {
      if (!synth) continue;
      synth.volume.value = sfxVolumeDb(base, volume);
    }
  }, []);
  const stopMusic = useCallback(() => {
    const source = music.current; music.current = null;
    try { source?.stop(); } catch { /* already stopped */ }
    source?.disconnect(); musicGain.current?.disconnect(); musicGain.current = null;
  }, []);
  const initAudio = useCallback((): Promise<void> => {
    if (!enabled.current || !alive.current || document.hidden) return Promise.resolve();
    requested.current = true;
    if (pending.current) return pending.current;
    const epoch = generation.current;
    const isCurrent = () => alive.current && enabled.current && epoch === generation.current && !document.hidden;
    const task = (async () => {
      try {
        const ctx = owner.current.getAudioContext();
        if (!ctx) return;
        await owner.current.unlock();
        if (!isCurrent()) return;
        Tone.setContext(ctx); await Tone.start();
        if (!isCurrent()) return;
        if (!effects.current) effects.current = new Tone.Volume(0).toDestination();
        if (!bite.current) bite.current = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .005, decay: .08, sustain: 0, release: .04 } }).connect(effects.current);
        if (!burst.current) burst.current = new Tone.MembraneSynth({ pitchDecay: .05, octaves: 3, oscillator: { type: 'sine' }, envelope: { attack: .002, decay: .15, sustain: 0, release: .1 } }).connect(effects.current);
        if (!damage.current) damage.current = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: .01, decay: .2, sustain: 0, release: .1 } }).connect(effects.current);
        applyEffectsVolume();
        if (!music.current) {
          if (!buffer.current || buffer.current.context !== ctx) {
            const promise = fetch(assetsData.AUDIO_YDEK).then(response => {
              if (!response.ok) throw new Error('Music could not be loaded');
              return response.arrayBuffer();
            }).then(data => ctx.decodeAudioData(data));
            buffer.current = { context: ctx, promise };
            void promise.catch(() => { if (buffer.current?.promise === promise) buffer.current = null; });
          }
          const decoded = await buffer.current.promise;
          if (!isCurrent() || music.current) return;
          const source = ctx.createBufferSource(), gain = ctx.createGain();
          source.buffer = decoded; source.loop = true;
          gain.gain.value = .45 * settingsRef.current.musicVolume;
          source.connect(gain); gain.connect(ctx.destination);
          music.current = source; musicGain.current = gain; source.start();
        }
      } catch (error) { console.warn('[SWIM] Audio init notice:', error); }
    })();
    pending.current = task;
    void task.finally(() => { if (pending.current === task) pending.current = null; });
    return task;
  }, [applyEffectsVolume]);
  const setMusicVolume = useCallback((value: number) => {
    const musicVolume = normalizeVolume(value, settingsRef.current.musicVolume);
    const next = { ...settingsRef.current, musicVolume }; settingsRef.current = next; setSettings(next); writeAudioSettings(next);
    const gain = musicGain.current;
    if (gain) {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      if (musicVolume === 0) gain.gain.setValueAtTime(0, now);
      else gain.gain.setTargetAtTime(.45 * musicVolume, now, .025);
    }
  }, []);
  const setSfxVolume = useCallback((value: number) => {
    const sfxVolume = normalizeVolume(value, settingsRef.current.sfxVolume);
    const next = { ...settingsRef.current, sfxVolume }; settingsRef.current = next; setSettings(next); writeAudioSettings(next); applyEffectsVolume();
  }, [applyEffectsVolume]);
  const toggleSound = useCallback(() => {
    const next = !enabled.current; enabled.current = next; setSoundEnabled(next); applyEffectsVolume();
    if (!next) {
      generation.current++; stopMusic();
      bite.current?.triggerRelease(); burst.current?.triggerRelease(); damage.current?.triggerRelease();
    } else void (pending.current ?? Promise.resolve()).then(() => initAudio());
  }, [applyEffectsVolume, initAudio, stopMusic]);
  useEffect(() => {
    alive.current = true;
    const suspend = () => {
      generation.current++; stopMusic();
      bite.current?.triggerRelease(); burst.current?.triggerRelease(); damage.current?.triggerRelease();
    };
    const visibility = () => {
      if (document.hidden) suspend();
      else if (requested.current && enabled.current) void (pending.current ?? Promise.resolve()).then(() => initAudio());
    };
    const resume = () => { if (requested.current && enabled.current && !document.hidden) void (pending.current ?? Promise.resolve()).then(() => initAudio()); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', resume);
    window.addEventListener('pagehide', suspend);
    return () => {
      alive.current = false; suspend();
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', resume);
      bite.current?.dispose(); burst.current?.dispose(); damage.current?.dispose();
      bite.current = null; burst.current = null; damage.current = null;
      effects.current?.dispose(); effects.current = null;
    };
  }, [initAudio, stopMusic]);
  const playBiteSound = useCallback(() => { if (enabled.current && !document.hidden) { try { bite.current?.triggerAttackRelease('G5', '32n'); } catch { /* unavailable audio */ } } }, []);
  const playBurstSound = useCallback(() => { if (enabled.current && !document.hidden) { try { burst.current?.triggerAttackRelease('C2', '16n'); } catch { /* unavailable audio */ } } }, []);
  const playDamageSound = useCallback(() => { if (enabled.current && !document.hidden) { try { damage.current?.triggerAttackRelease('D3', '16n'); } catch { /* unavailable audio */ } } }, []);
  return { soundEnabled, musicVolume: settings.musicVolume, sfxVolume: settings.sfxVolume, setMusicVolume, setSfxVolume, initAudio, toggleSound, playBiteSound, playBurstSound, playDamageSound };
}
export type AquariumAudio = ReturnType<typeof useAquariumAudio>;
