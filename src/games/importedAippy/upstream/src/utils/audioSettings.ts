/** SWIM audio preferences are independent of the saved aquarium profile. */
export interface AudioSettings { version: 1; musicVolume: number; sfxVolume: number }
export const AUDIO_SETTINGS_KEY = 'swim.audio.v1';
export const LEGACY_AUDIO_SETTINGS_KEY = 'aqualume.audio.v1';
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { version: 1, musicVolume: .8, sfxVolume: .6 };

type AudioStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function normalizeVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
export function normalizeAudioSettings(value: unknown): AudioSettings {
  const data = value && typeof value === 'object' ? value as Partial<AudioSettings> : {};
  return { version: 1, musicVolume: normalizeVolume(data.musicVolume, .8), sfxVolume: normalizeVolume(data.sfxVolume, .6) };
}
export function writeAudioSettings(settings: AudioSettings, storage?: Pick<AudioStorage, 'setItem'>): boolean {
  try { (storage ?? globalThis.localStorage).setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalizeAudioSettings(settings))); return true; }
  catch { return false; }
}
export function loadAudioSettings(storage?: AudioStorage): AudioSettings {
  try {
    const source = storage ?? globalThis.localStorage;
    const current = source.getItem(AUDIO_SETTINGS_KEY);
    const legacy = current === null ? source.getItem(LEGACY_AUDIO_SETTINGS_KEY) : null;
    const settings = normalizeAudioSettings(JSON.parse(current ?? legacy ?? 'null'));
    if (legacy !== null) writeAudioSettings(settings, source);
    return settings;
  } catch { return { ...DEFAULT_AUDIO_SETTINGS }; }
}
/** Linear effects gain preserves each synth's authored relative level. Zero uses mute. */
export function sfxVolumeDb(baseDb: number, volume: number): number {
  return volume > 0 ? baseDb + 20 * Math.log10(volume) : baseDb;
}
