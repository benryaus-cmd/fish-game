import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_SETTINGS_KEY, LEGACY_AUDIO_SETTINGS_KEY, loadAudioSettings, musicPlaybackGain, normalizeAudioSettings, normalizeVolume, sfxVolumeDb, writeAudioSettings } from '../src/games/importedAippy/upstream/src/utils/audioSettings.ts';
function storage() {
  const entries = new Map<string, string>();
  return { entries, getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
}
test('audio defaults and invalid fields retain separate 80/60 levels', () => {
  assert.deepEqual(normalizeAudioSettings(null), { version: 1, musicVolume: .8, sfxVolume: .6 });
  assert.deepEqual(normalizeAudioSettings({ musicVolume: '0', sfxVolume: NaN }), { version: 1, musicVolume: .8, sfxVolume: .6 });
  assert.equal(normalizeVolume(Infinity, .8), .8);
  assert.deepEqual(normalizeAudioSettings({ musicVolume: -1, sfxVolume: 4 }), { version: 1, musicVolume: 0, sfxVolume: 1 });
});
test('zero volume survives persistence and malformed saves recover', () => {
  const memory = storage();
  assert.equal(writeAudioSettings({ version: 1, musicVolume: 0, sfxVolume: 0 }, memory), true);
  assert.deepEqual(loadAudioSettings(memory), { version: 1, musicVolume: 0, sfxVolume: 0 });
  memory.entries.set(AUDIO_SETTINGS_KEY, '{broken');
  assert.deepEqual(loadAudioSettings(memory), { version: 1, musicVolume: .8, sfxVolume: .6 });
  assert.equal(writeAudioSettings({ version: 1, musicVolume: .4, sfxVolume: .2 }, { setItem() { throw Error('full'); } }), false);
});
test('legacy audio migration preserves the old key and unrelated profile', () => {
  const memory = storage();
  memory.entries.set(LEGACY_AUDIO_SETTINGS_KEY, JSON.stringify({ musicVolume: .3, sfxVolume: 0 }));
  memory.entries.set('aqualume.boutique.v1', 'profile');
  assert.deepEqual(loadAudioSettings(memory), { version: 1, musicVolume: .3, sfxVolume: 0 });
  assert.ok(memory.entries.has(AUDIO_SETTINGS_KEY));
  assert.ok(memory.entries.has(LEGACY_AUDIO_SETTINGS_KEY));
  assert.equal(memory.entries.get('aqualume.boutique.v1'), 'profile');
});
test('effect volume multiplies authored gain and keeps zero finite for mute', () => {
  assert.ok(Math.abs(sfxVolumeDb(-4, 1) - (-7.098039199714864)) < 1e-10);
  assert.ok(Math.abs(sfxVolumeDb(-6, .5) - (-15.118639112994487)) < 1e-10);
  assert.equal(sfxVolumeDb(-2, 0), -2);
});

test('music initial and live gains use seventy percent of previous amplitude', () => {
  assert.ok(Math.abs(musicPlaybackGain(.8)-.252)<1e-12);
  assert.ok(Math.abs(musicPlaybackGain(1)-.315)<1e-12);
  assert.equal(musicPlaybackGain(0),0);
  assert.equal(musicPlaybackGain(NaN),musicPlaybackGain(.8));
});
