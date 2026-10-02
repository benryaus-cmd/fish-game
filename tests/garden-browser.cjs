// Build first. Requires Playwright and a Chromium executable (no production dependency).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const key = 'aqualume.boutique.v1';
const fish = (id, growth, traits = []) => ({ id, name: 'Coral', species: 'guppy', growth, health: 100, hunger: 100, traits, color: '#f47f69', accent: '#ffd36e', raisedSeconds: 0 });
const profile = (growth, traits = [], kept = []) => ({ version: 1, coins: 7, sales: 0, kept, completedRunIds: [], activeRun: { specimen: fish('live-guppy', growth, traits), x: 380, y: 1520, stamina: 100 } });
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('dist/index.html')); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser, page;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true,
      args: process.env.CHROMIUM_ARGS_MODULE ? [...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(arg => arg !== '--single-process'), '--disable-audio-output'] : ['--no-sandbox', '--disable-dev-shm-usage'] });
    console.log('Browser launched');
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(20000);
    await page.addInitScript(() => { const fixture = sessionStorage.getItem('test.fixture'); if (fixture) { localStorage.setItem('aqualume.boutique.v1', fixture); sessionStorage.removeItem('test.fixture'); } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    console.log('Page created');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log('App loaded');
    const load = async value => { await page.evaluate(({ key, value }) => sessionStorage.setItem('test.fixture', JSON.stringify(value)), { key, value }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Continue raising', exact: true }).click(); await page.getByRole('button', { name: 'Open boutique' }).waitFor(); };
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

    await load(profile(35));
    await page.getByLabel('Choose an adaptation').waitFor();
    await page.getByRole('button', { name: /Swift fins/ }).click();
    assert.deepEqual((await read()).activeRun.specimen.traits, ['swift']);
    await load(profile(75, ['swift']));
    await page.getByRole('button', { name: /Swift fins/ }).click();
    assert.deepEqual((await read()).activeRun.specimen.traits, ['swift', 'swift']);
    console.log('PASS both growth choices');

    await load(profile(30));
    await page.waitForTimeout(200); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp');
    await page.getByRole('button', { name: 'Open boutique' }).click();
    const before = await read(); assert.ok(before.activeRun.y < 1519);
    await page.setViewportSize({ width: 412, height: 915 }); await page.waitForTimeout(500);
    assert.deepEqual((await read()).activeRun, before.activeRun, 'resize at home preserves the paused checkpoint');
    await page.getByRole('button', { name: 'Continue raising', exact: true }).click();
    await page.getByRole('button', { name: 'Open boutique' }).click();
    const after = await read();
    assert.equal(after.activeRun.specimen.id, before.activeRun.specimen.id);
    assert.equal(after.activeRun.specimen.growth, before.activeRun.specimen.growth);
    assert.deepEqual(errors, []);
    console.log('PASS vertical movement, resize and home pause; no runtime errors');
  } finally { await Promise.race([browser?.close(), new Promise(r => setTimeout(r, 1500))]); server.closeAllConnections(); server.close(); }
})().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
