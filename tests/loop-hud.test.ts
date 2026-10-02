import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const base = resolve('src/games/importedAippy/upstream/src');
const out = await mkdtemp(join(tmpdir(), 'aqualume-hud-'));
for (const path of ['components/GardenHUD', 'components/WorldTimeBadge', ...((await readdir(join(base, 'utils'))).filter(name => name.endsWith('.ts')).map(name => 'utils/' + name.slice(0,-3)))]) {
  let code = ts.transpileModule(await readFile(join(base, path + (path.startsWith('components') ? '.tsx' : '.ts')), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  code = code.replace(/from ['"](@\/[^'"]+|react(?:\/jsx-runtime)?)['"]/g, (_, name) => `from ${JSON.stringify(name.startsWith('@/') ? join(out, name.slice(2).replaceAll('/', '-') + '.mjs') : require.resolve(name))}`);
  code = code.replace(/from ['"](\.[^'"]+)['"]/g, (_, name) => `from ${JSON.stringify(join(out, join(dirname(path), name).replace(/\.ts$/, '').replaceAll('/', '-') + '.mjs'))}`);
  await writeFile(join(out, path.replaceAll('/', '-') + '.mjs'), code);
}
const { default: HUD } = await import(join(out, 'components-GardenHUD.mjs'));
const props = { hud: { health: 95, hunger: 71, stamina: 100, growth: 36, inShelter: false, isDead: false }, coins: 42, value: 20, stage: 'juvenile', display: false, controls: true, saved: true, sound: false, knobRef: {current: null}, onShop() {}, onAppraise() {}, onSound() {}, joyDown() {}, joyMove() {}, joyUp() {}, burstDown() {}, burstUp() {} };
const render = (extra = {}) => renderToStaticMarkup(createElement(HUD, {...props, ...extra}));

test('Swim puts condition and a next-stage countdown before aquarium identity', () => {
  const html = render({ nextStageSeconds: 125 });
  assert.ok(html.indexOf('garden-stats') < html.indexOf('garden-topbar'));
  assert.match(html, /2:05/);
  assert.match(html, /to adult/);
  assert.match(html, /Swim/);
  assert.doesNotMatch(html, /Viewing tank|Growing tank/);
  assert.match(html, /aria-label="Return to View mode"/);
});
test('accumulated development opportunities are available as an edge action', () => {
  const html = render({ pendingDevelopment: [{ stage: 35, slots: 3, options: ['swift', 'vital'] }, {stage:75, slots:2, options:['ornate']}], onDevelopment() {} });
  assert.match(html, /Choose upgrades/);
  assert.match(html, /5 choices ready/);
  assert.doesNotMatch(html, /aria-modal="true"/);
});
test('instant free glass cleaning is absent from Swim and View HUDs', () => {
  assert.doesNotMatch(render({onClean() {}}), /aria-label="Clean glass"/);
  assert.doesNotMatch(render({mode:'view', onClean() {}}), /aria-label="Clean glass"/);
});

test('return to View requires nursery and low health gives a text reminder', () => {
  assert.match(render(), /disabled=""[^>]+aria-label="Return to View mode"/);
  assert.doesNotMatch(render({hud:{...props.hud,inShelter:true}}), /disabled=""[^>]+aria-label="Return to View mode"/);
  assert.match(render({hud:{...props.hud,health:24}}), /Low health · Rest in the castle bubbles/);
  assert.doesNotMatch(render({hud:{...props.hud,health:25}}), /Low health ·/);
});

test('burst control reports cooldown and exhausted recovery without losing pointer release', () => {
  const cooldown = render({hud:{...props.hud,stamina:45,burstCooldown:.8,isBursting:false}});
  const button = cooldown.match(/<button class="garden-burst(?: [^"]*)?"[^>]*>.*?<\/button>/)?.[0];
  assert.match(button, /aria-disabled="true"/);
  assert.match(button, /COOLDOWN/);
  assert.match(button, /0\.8s/);
  assert.doesNotMatch(button, / disabled=/);
  const exhausted = render({hud:{...props.hud,stamina:20,burstExhausted:true}});
  assert.match(exhausted,/RECHARGE/);assert.match(exhausted,/recover &gt;20%/);
  const active = render({hud:{...props.hud,stamina:10,isBursting:true}});
  assert.match(active,/aria-disabled="false"/);assert.match(active,/hold \/ space/);
});

test('burst ring is red strictly below twenty percent even during an active burst', () => {
  for(const isBursting of [false,true]) {
    const low=render({hud:{...props.hud,stamina:19,isBursting}}).match(/<button class="garden-burst(?: [^"]*)?"[^>]*>/)?.[0];
    const threshold=render({hud:{...props.hud,stamina:20,isBursting}}).match(/<button class="garden-burst(?: [^"]*)?"[^>]*>/)?.[0];
    assert.match(low,/conic-gradient\(#e76565 /);
    assert.doesNotMatch(threshold,/conic-gradient\(#e76565 /);
  }
});
test('Swim has no instant free-clean action even if a legacy caller supplies one',()=>{
 assert.doesNotMatch(render({onClean(){}}),/Clean glass|Free<\/small>/);
});

test('castle healing replaces the health label without adding a line',()=>{
 const html=render({healing:true});assert.match(html,/label class="garden-healing">Healing/);assert.doesNotMatch(html,/<small class="garden-healing"/);
});
test('adults have no next-stage countdown',()=>{
 const html=render({stage:'adult',nextStageSeconds:0});assert.match(html,/Fully grown/);assert.doesNotMatch(html,/0:00/);
});
