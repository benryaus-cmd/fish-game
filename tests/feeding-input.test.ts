import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const listeners = new Map();
globalThis.window = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {} } as any;
globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} } as any;
globalThis.HTMLElement = class {} as any;
const source = stripTypeScriptTypes(await readFile(new URL('../src/games/importedAippy/upstream/src/utils/playerInput.ts', import.meta.url), 'utf8'), { mode: 'transform' });
const { InputManager } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('released touch tap is consumed exactly once and reset clears queued meals', () => {
  const input = new InputManager();
  assert.equal(typeof input.onEatStart, 'function');
  input.onEatStart(5); input.onEatEnd(5);
  assert.equal(input.getInput().eat, true);
  assert.equal(input.getInput().eat, false);
  input.onEatStart(6); input.resetInput();
  assert.equal(input.getInput().eat, false);
});
test('E keyboard tap buffers bite without requiring movement', () => {
  const input = new InputManager();
  listeners.get('keydown')({code:'KeyE',target:null,preventDefault(){}});
  listeners.get('keyup')({code:'KeyE'});
  assert.equal(input.getInput().eat, true);
  assert.equal(input.getInput().active, false);
});
test('keyboard and switch clicks queue one meal and pointer clicks cannot double a tap', () => {
  const input = new InputManager();
  assert.equal(typeof input.onEatClick, 'function');
  input.onEatClick(0);
  assert.equal(input.getInput().eat, true);
  assert.equal(input.getInput().eat, false);
  input.onEatStart(8); input.onEatEnd(8);
  assert.equal(input.getInput().eat, true);
  input.onEatClick(1);
  assert.equal(input.getInput().eat, false);
});
