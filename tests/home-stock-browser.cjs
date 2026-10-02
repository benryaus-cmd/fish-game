// Built-app journeys. External Playwright/Chromium, no production dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const key = 'aqualume.boutique.v1';
const fish = (id, growth = 30, traits = []) => ({ id, name: 'Goldleaf', species: 'guppy', growth, health: 100, hunger: 100, traits, color: '#f47f69', accent: '#ffd36e', raisedSeconds: 12 });
const fixture = (coins = 0, activeRun = null, kept = []) => ({ version: 1, coins, sales: 0, kept, completedRunIds: [], activeRun });
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('dist/index.html')); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true,
      args: process.env.CHROMIUM_ARGS_MODULE ? [...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a => a !== '--single-process'), '--disable-audio-output'] : ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 680 } });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const fixture = sessionStorage.getItem('home.fixture');
      if (fixture) { localStorage.setItem('aqualume.boutique.v1', fixture); sessionStorage.removeItem('home.fixture'); }
      window.outingFrames = 0;
      const scale = CanvasRenderingContext2D.prototype.scale;
      CanvasRenderingContext2D.prototype.scale = function(x, y) {
        if (this.canvas.className === 'block w-full h-full' && x === y && x >= .74 && x <= 1) window.outingFrames++;
        return scale.call(this, x, y);
      };
    });
    const click = name => page.getByRole('button', { name, exact: true }).click();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const load = async value => {
      await page.evaluate(value => sessionStorage.setItem('home.fixture', JSON.stringify(value)), value);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('region', { name: 'Home aquarium', exact: true }).waitFor();
    };
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'Home aquarium', exact: true }).waitFor();
    assert.equal(await page.locator('.garden-joystick:visible').count(), 0, 'launch does not start an outing');
    await click('Raise your first guppy');
    await page.getByRole('dialog', { name: 'Choose stock' }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Buy Sunburst guppy', exact: true }).isDisabled());
    if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/home-stock-empty.png' });
    await click('Raise ordinary guppy');
    await page.getByRole('button', { name: 'Open boutique', exact: true }).waitFor();
    const ordinary = await read();
    assert.equal(ordinary.coins, 0); assert.equal(ordinary.activeRun.specimen.origin, 'ordinary');
    assert.equal(ordinary.activeRun.specimen.growth, 0); assert.deepEqual(ordinary.activeRun.specimen.traits, []);
    await click('Open boutique');
    await click('Raise');
    assert.ok(await page.getByRole('button', { name: 'Raise ordinary guppy', exact: true }).isDisabled(), 'unfinished outing cannot be overwritten');
    await click('Close stock selection');
    console.log('PASS empty home, ordinary stock and active-run protection');

    await load(fixture(100)); await click('Raise your first guppy');
    await click('Buy Sunburst guppy');
    await page.getByRole('button', { name: 'Open boutique', exact: true }).waitFor();
    const bought = await read(); assert.equal(bought.coins, 60); assert.equal(bought.activeRun.specimen.origin, 'sunburst');
    await click('Open boutique');
    const checkpoint = await read(); await page.waitForTimeout(600);
    assert.deepEqual((await read()).activeRun, checkpoint.activeRun, 'home pauses the outing');
    await page.reload({ waitUntil: 'domcontentloaded' }); await click('Continue raising');
    assert.equal((await read()).activeRun.specimen.id, bought.activeRun.specimen.id);
    assert.equal((await read()).coins, 60);
    console.log('PASS paid stock is charged once and resumes after reload');

    await load(fixture(100)); await click('Raise your first guppy');
    await page.evaluate(() => { window.realStorageWrite = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('quota fixture'); }; });
    await click('Buy Blue Veil guppy');
    await page.getByRole('dialog', { name: 'Choose stock' }).waitFor();
    assert.equal((await read()).coins, 100); assert.equal((await read()).activeRun, null);
    await page.evaluate(() => { Storage.prototype.setItem = window.realStorageWrite; });
    await click('Buy Blue Veil guppy');
    await page.getByRole('button', { name: 'Open boutique', exact: true }).waitFor();
    assert.equal((await read()).coins, 25);
    console.log('PASS failed purchase leaves wallet and stock unchanged');

    const active = { specimen: fish('raised-fish'), x: 380, y: 1520, stamina: 100 };
    await load(fixture(7, active)); await click('Continue raising');
    await page.getByRole('button', { name: /Appraise your fish/ }).click();
    await page.locator('#specimen-name').fill('Goldleaf');
    await page.getByRole('button', { name: /Keep in my display/ }).click();
    await page.getByRole('dialog', { name: 'Specimen result' }).waitFor();
    await click('Return home');
    const kept = await read(); assert.equal(kept.activeRun, null); assert.equal(kept.kept[0].id, 'raised-fish'); assert.equal(kept.placements['raised-fish'], 'home');
    await click('Collection');
    await page.getByRole('button', { name: /Goldleaf/ }).first().click();
    await click('Swim as this fish');
    await page.getByRole('button', { name: 'Back to watching', exact: true }).waitFor();
    const residentBefore = JSON.stringify((await read()).kept);
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(600); await page.keyboard.up('ArrowDown');
    if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/home-resident-swim.png' });
    await click('Back to watching'); assert.equal(JSON.stringify((await read()).kept), residentBefore);
    console.log('PASS keep returns the actual resident to a safe controllable home');

    await load(fixture(7, active)); await click('Continue raising');
    await page.getByRole('button', { name: /Appraise your fish/ }).click();
    await page.getByRole('button', { name: /Sell this specimen/ }).click();
    await click('Choose next stock');
    await page.getByRole('dialog', { name: 'Choose stock' }).waitFor();
    const sold = await read(); assert.ok(sold.coins > 7); assert.equal(sold.activeRun, null); assert.equal(sold.sales, 1);
    console.log('PASS sale opens stock choice without silently spawning another fish');

    await load(fixture(7, { ...active, x: 1200, y: 700 }, [fish('resident', 80, ['ornate', 'swift'])]));
    await click('Continue raising'); await page.waitForFunction(() => window.outingFrames > 8);
    await page.evaluate(() => { window.realStorageWrite = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('quota fixture'); }; });
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowUp');
    await click('Open boutique');
    await page.setViewportSize({ width: 320, height: 680 });
    await click('Collection'); await page.getByRole('button', { name: /Goldleaf/ }).first().click(); await click('Swim as this fish');
    await click('Back to watching'); await click('Continue raising');
    await page.evaluate(() => { Storage.prototype.setItem = window.realStorageWrite; });
    await click('Open boutique');
    assert.ok((await read()).activeRun.y < 699, 'unsaved motion survived home and resident swim');
    assert.equal((await read()).kept[0].id, 'resident');
    console.log('PASS unsaved outing survives home and resident-control roundtrip');

    await load(fixture(100, null, [fish('one', 80, ['ornate', 'swift']), fish('two', 30)]));
    if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/home-populated.png' });
    await click('Raise'); await page.setViewportSize({ width: 390, height: 420 });
    const dialog = page.getByRole('dialog', { name: 'Choose stock' });
    const box = await dialog.boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= 420);
    for (const name of ['Raise ordinary guppy', 'Buy Sunburst guppy', 'Buy Blue Veil guppy']) {
      const button = page.getByRole('button', { name, exact: true }); await button.scrollIntoViewIfNeeded();
      const b = await button.boundingBox(); assert.ok(b.y >= 0 && b.y + b.height <= 420 && b.height >= 44);
    }
    if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/home-stock-short.png' });
    assert.deepEqual(errors, []); console.log('PASS short stock sheet action reachability; no runtime errors');
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise(r => setTimeout(r, 1500))]);
    server.closeAllConnections?.(); await new Promise(r => server.close(r));
  }
})().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
