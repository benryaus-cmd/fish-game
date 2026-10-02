// Build first. Use external Playwright/Chromium via the same env options as garden-browser.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const specimen = { id: 'presentation-fish', name: 'Coral', species: 'guppy', growth: 30, health: 100, hunger: 100, traits: [], color: '#f47f69', accent: '#ffd36e', raisedSeconds: 0 };
const seed = { version: 1, coins: 7, sales: 0, kept: [], completedRunIds: [], activeRun: { specimen, x: 1100, y: 900, stamina: 100 } };
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('dist/index.html')); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true,
      args: process.env.CHROMIUM_ARGS_MODULE ? [...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a => a !== '--single-process'), '--disable-audio-output'] : ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 680 } });
    const errors = [], checks = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(seed => {
      const fixture = sessionStorage.getItem('presentation.fixture');
      localStorage.setItem('aqualume.boutique.v1', fixture || JSON.stringify(seed));
      window.presentationZoom = 1;
      window.presentationFrames = 0;
      const scale = CanvasRenderingContext2D.prototype.scale;
      CanvasRenderingContext2D.prototype.scale = function(x, y) {
        if (this.canvas.className === 'block w-full h-full' && x === y && x >= 0.74 && x <= 1) { window.presentationZoom = x; window.presentationFrames++; }
        return scale.call(this, x, y);
      };
    }, seed);
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue raising', exact: true }).click();
    await page.getByRole('button', { name: 'Open boutique' }).waitFor();
    const check = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { checks.push(name + ': ' + e.message); console.log('FAIL', name); } };
    await check('swimming centre is free of persistent instruction', async () => assert.equal(await page.getByText('Feed, grow, then return to the leafy nursery', { exact: true }).count(), 0));
    await check('condition HUD fits within top 110 pixels', async () => {
      const bounds = await page.locator('.garden-condition').boundingBox(); assert.ok(bounds && bounds.y + bounds.height <= 110);
    });
    await page.getByRole('button', { name: 'Fish condition and value' }).evaluate(el => el.click());
    await page.getByRole('region', { name: 'Fish details' }).waitFor();
    assert.ok(await page.getByText(/Nursery value/).count());
    await page.getByRole('button', { name: 'Close fish details' }).evaluate(el => el.click());
    if (process.env.SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/presentation-garden.png', timeout: 60000 });
      await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900);
      await page.screenshot({ path: 'test-results/presentation-diving.png', timeout: 60000 });
      await page.keyboard.up('ArrowDown');
    }
    await page.getByRole('button', { name: 'Open boutique' }).evaluate(el => el.click());
    await page.getByRole('button', { name: 'Collection', exact: true }).click();
    await check('collection and empty headings have light explicit text', async () => {
      for (const selector of ['.home-sheet h2', '.home-collection-empty h3']) {
        const colour = await page.locator(selector).evaluate(el => getComputedStyle(el).color);
        const components = colour.match(/[\d.]+/g).slice(0, 3).map(Number); assert.ok(components.every(c => c > 170), colour);
      }
    });
    await page.getByRole('button', { name: 'Close collection', exact: true }).click();
    await page.getByRole('button', { name: /Continue raising/ }).evaluate(el => el.click());
    if (process.env.SCREENSHOTS) {
      await page.getByRole('button', { name: 'Open boutique' }).evaluate(el => el.click());
      await page.screenshot({ path: 'test-results/presentation-boutique.png', timeout: 60000 });
      await page.getByRole('button', { name: /Continue raising/ }).evaluate(el => el.click());
    }
    // Short embedded viewport, including the space left when a mobile keyboard is open.
    await page.evaluate(seed => { seed.activeRun.x = 380; seed.activeRun.y = 1520; sessionStorage.setItem('presentation.fixture', JSON.stringify(seed)); }, seed);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue raising', exact: true }).click();
    await page.getByRole('button', { name: /Appraise your fish/ }).waitFor();
    await page.setViewportSize({ width: 320, height: 680 });
    await check('nursery action does not overlap controls on narrow phone', async () => {
      const action = await page.getByRole('button', { name: /Appraise your fish/ }).boundingBox();
      const joystick = await page.getByLabel('Swim joystick').boundingBox();
      const burst = await page.getByRole('button', { name: 'Burst speed' }).boundingBox();
      assert.ok(action.x >= joystick.x + joystick.width + 3, JSON.stringify({ action, joystick }));
      assert.ok(action.x + action.width + 3 <= burst.x, JSON.stringify({ action, burst }));
      assert.ok(action.height >= 44);
    });
    await page.setViewportSize({ width: 390, height: 680 });
    await page.getByRole('button', { name: /Appraise your fish/ }).evaluate(el => el.click());
    await page.setViewportSize({ width: 390, height: 420 });
    await page.locator('#specimen-name').fill('Keyboard test');
    await check('appraisal fits and all actions can be reached in short viewport', async () => {
      const bounds = await page.getByRole('dialog', { name: 'Nursery appraisal' }).boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 420, JSON.stringify(bounds));
      for (const name of [/Sell this specimen/, /Keep in my display/, /Keep exploring/]) {
        const button = page.getByRole('button', { name }); await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= 420, JSON.stringify(box));
      }
    });
    if (process.env.SCREENSHOTS) await page.screenshot({ path: 'test-results/presentation-appraisal-short.png', timeout: 60000 });
    await page.setViewportSize({ width: 390, height: 680 });
    await page.evaluate(seed => {
      seed.activeRun.specimen.growth = 100; seed.activeRun.specimen.traits = ['ornate', 'swift'];
      seed.activeRun.x = 1100; seed.activeRun.y = 900;
      sessionStorage.setItem('presentation.fixture', JSON.stringify(seed));
    }, seed);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue raising', exact: true }).click();
    await page.waitForFunction(() => window.presentationZoom < 0.82);
    await check('adult body framing reaches real renderer zoom', async () => assert.ok(await page.evaluate(() => window.presentationZoom) >= 0.749));
    if (process.env.SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/presentation-adult-wide.png', timeout: 60000 });
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(700);
      await page.screenshot({ path: 'test-results/presentation-adult-climb.png', timeout: 60000 });
      await page.keyboard.up('ArrowUp');
      await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(350);
      await page.keyboard.down('Space'); await page.waitForTimeout(200);
      await page.screenshot({ path: 'test-results/presentation-burst-turn.png', timeout: 60000 });
      await page.keyboard.up('Space'); await page.keyboard.up('ArrowLeft');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => window.presentationZoom === 1);
    console.log('PASS live reduced-motion preference disables zoom');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(seed => {
      seed.activeRun.specimen.growth = 0; seed.activeRun.specimen.traits = [];
      seed.activeRun.x = 1200; seed.activeRun.y = 700;
      sessionStorage.setItem('presentation.fixture', JSON.stringify(seed));
    }, seed);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue raising', exact: true }).click();
    await page.getByRole('button', { name: 'Open boutique' }).waitFor();
    await page.waitForFunction(() => window.presentationFrames > 8);
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(2000); await page.keyboard.up('ArrowDown');
    await check('ordinary vertical swim does not falsely trigger fast zoom', async () => {
      const zoom = await page.evaluate(() => window.presentationZoom); assert.ok(zoom > 0.985, 'zoom ' + zoom);
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(checks, []);
  } finally { await Promise.race([browser?.close(), new Promise(r => setTimeout(r, 1500))]); server.closeAllConnections(); server.close(); }
})().then(() => process.exit(0), e => { console.error(e.message); process.exit(1); });
