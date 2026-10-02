const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const KEY = 'aqualume.boutique.v1';
// The renderer's authored sand equation provides fixture positions, not simulated physics.
const surfaceY = x => 1580 + 48 * (.6 * Math.sin(x * Math.PI * 2 / 1100 + .4) + .28 * Math.sin(x * Math.PI * 2 / 520 + 1.2) + .12 * Math.sin(x * Math.PI * 2 / 260 + 2.1));
const koi = (id, health) => ({ id, name: 'Koi Angel', species: 'angelfish', growth: 80, health, hunger: 70, traits: [], color: '#efd9b2', accent: '#ed8c4f', raisedSeconds: 650, origin: 'koiangel', inherited: { colorFamily: 'warm', finForm: 'fan', parents: [], bodyShape: 'angel', finStyle: 'sail', colorPattern: 'koi' } });
const profile = (id, x, y, health) => ({ version: 1, coins: 70, sales: 0, kept: [], completedRunIds: [], placements: {}, activeRun: { source: 'stock', specimen: koi(id, health), x, y, stamina: 100 } });
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('dist/index.html')); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync('.superpowers', { recursive: true });
  let browser;
  const errors = [];
  try {
    const args = process.env.CHROMIUM_ARGS_MODULE ? require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(arg => arg !== '--single-process') : [];
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true, args: [...args, '--disable-audio-output'] });
    const fixture = async (name, save) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
      await page.addInitScript(({ key, name, save }) => {
        const marker = `castle.${name}.seeded`;
        if (!sessionStorage.getItem(marker)) {
          const now = Date.now();
          save.worldClock = { startedAtMs: now - 60000, lastSeenMs: now };
          save.tankCare = { dirt: 22, pellets: 0, lastUpdatedMs: now };
          save.activeRun.specimen.care = { bornAtMs: now - 650000, lastCareAtMs: now, healthySeconds: 650, nutrition: 100, colourQuality: .8, meals: { flake: 0, algae: 0, prey: 0 }, feedingPreference: 'day', development: { resolvedStages: [35,75], pending: [] } };
          localStorage.setItem(key, JSON.stringify(save));
          sessionStorage.setItem(marker, 'yes'); sessionStorage.setItem('castle.now', String(now));
        }
        window.castleNow = Number(sessionStorage.getItem('castle.now'));
        Date.now = () => window.castleNow;
      }, { key: KEY, name, save });
      await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Collection', exact: true }).waitFor();
      return page;
    };
    const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
    const swim = async page => { await click(page, 'Swim'); await page.getByRole('button', { name: 'Eat food', exact: true }).waitFor(); };
    const capture = (page, name) => page.screenshot({ path: `.superpowers/loop-${name}.png`, timeout: 60000 });
    const waitHealth = (page, operator, value, timeout = 15000) => page.waitForFunction(({ operator, value }) => {
      const health = Number(document.querySelector('.garden-condition label em')?.textContent);
      return Number.isFinite(health) && (operator === 'above' ? health > value : health < value);
    }, { operator, value }, { timeout });

    // Frozen care time makes this health gain evidence of the live castle plume.
    const castle = await fixture('healing', profile('castle-koi', 3300, surfaceY(3300) - 150, 30));
    await swim(castle);
    await waitHealth(castle, 'above', 30);
    await castle.getByText('Healing', { exact: true }).waitFor();
    assert.equal(await castle.getByText('◌ Concealed', { exact: true }).count(), 0, 'the castle is separate from nursery concealment');
    await castle.waitForFunction(key => JSON.parse(localStorage.getItem(key)).activeRun.specimen.health > 35, KEY, { timeout: 10000 });
    await capture(castle, 'castle');
    const healed = await read(castle);
    assert.equal(healed.activeRun.specimen.id, 'castle-koi'); assert.equal(healed.coins, 70);
    assert.ok(healed.activeRun.specimen.health > 35, 'bubble healing reaches the saved checkpoint');
    assert.equal(healed.activeRun.specimen.care.lastCareAtMs, await castle.evaluate(() => window.castleNow), 'care time stays frozen while bubble health advances');
    await castle.context().close();

    // A fish above the former floor-only hit range is reached by the crab hop.
    const crab = await fixture('hop', profile('crab-koi', 1180, surfaceY(1180) - 130, 100));
    await swim(crab);
    await capture(crab, 'crab-warn');
    await waitHealth(crab, 'below', 100, 10000);
    await capture(crab, 'crab-hop');
    await click(crab, 'View aquarium');
    await crab.getByRole('button', { name: 'Swim', exact: true }).waitFor();
    await crab.setViewportSize({width:320,height:420});await crab.waitForFunction(()=>document.querySelector('.home-header')?.getBoundingClientRect().right<=320);await capture(crab,'view-320');
    const viewStart = await read(crab);
    assert.ok(viewStart.activeRun.specimen.health < 100, 'the hop reaches the elevated player before returning to View');
    const baseline = viewStart.activeRun.specimen.health;
    // Observe a real neutral-view interval with RAF polling, checking every sample.
    await crab.waitForFunction(({ key, health }) => {
      const current = JSON.parse(localStorage.getItem(key)).activeRun.specimen.health;
      if (current !== health) throw new Error(`neutral View changed frozen-care health: ${health} -> ${current}`);
      window.castleViewStarted ??= performance.now();
      return performance.now() - window.castleViewStarted >= 3500;
    }, { key: KEY, health: baseline }, { polling: 'raf', timeout: 10000 });
    assert.equal((await read(crab)).activeRun.specimen.health, baseline, 'ambient View never deals further combat damage');
    await crab.context().close();

    // Both end walls remain visible with attached algae and a nearby edible glow.
    for (const [name, x, direction] of [['wall-left', 45, -1], ['wall-right', 3555, 1]]) {
      const wall = await fixture(name, profile(name, x, 800, 100));
      await swim(wall); await capture(wall, name);
      const joystick = await wall.getByLabel('Swim joystick', { exact: true }).boundingBox();
      assert.ok(joystick, 'the touch joystick is reachable');
      await wall.mouse.move(joystick.x + joystick.width / 2, joystick.y + joystick.height / 2);
      await wall.mouse.down();
      await wall.mouse.move(joystick.x + joystick.width / 2 + direction * 43, joystick.y + joystick.height / 2);
      await wall.waitForFunction(({ key, direction }) => {
        const run = JSON.parse(localStorage.getItem(key)).activeRun;
        if (!run || run.x < 0 || run.x > 3600) throw new Error('outward joystick escaped the wall');
        window.castleWallStarted ??= performance.now();
        const onOwnWall = direction < 0 ? run.x < 100 : run.x > 3500;
        return onOwnWall && performance.now() - window.castleWallStarted >= 3500;
      }, { key: KEY, direction }, { polling: 'raf', timeout: 10000 });
      await wall.mouse.up(); await click(wall, 'View aquarium');
      const bounded = (await read(wall)).activeRun;
      assert.ok(bounded.x >= 0 && bounded.x <= 3600, 'held outward joystick cannot leave the world');
      assert.ok(direction < 0 ? bounded.x < 100 : bounded.x > 3500, 'outward joystick stays against its own wall');
      await wall.context().close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS live castle plume healing and checkpoint, elevated crab hop, neutral View health, both wall screenshots and outward joystick bounds at 390x844');
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 1500))]);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
