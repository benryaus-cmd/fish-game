const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const KEY = 'aqualume.boutique.v1';
const fish = (id, overrides = {}) => ({ id, name: id === 'coral' ? 'Coral' : id, species: 'guppy', growth: 80, health: 100, hunger: 100, traits: [], color: '#f47f69', accent: '#ffd36e', raisedSeconds: 650, origin: 'legacy', inherited: { colorFamily: 'warm', finForm: 'fan', parents: [] }, ...overrides });
const profile = overrides => ({ version: 1, coins: 100, sales: 0, kept: [], activeRun: null, completedRunIds: [], placements: {}, ...overrides });
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync('dist/index.html')); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync('.superpowers', { recursive: true });
  let browser;
  const errors = [];
  try {
    const args = process.env.CHROMIUM_ARGS_MODULE ? require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(arg => arg !== '--single-process') : [];
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true, args: [...args, '--disable-audio-output'] });
    const fixture = async (name, save, prepareCare = false) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
      await page.addInitScript(({ key, name, save, prepareCare }) => {
        const marker = `loop.${name}.seeded`;
        if (!sessionStorage.getItem(marker)) {
          const now = Date.now();
          save.worldClock = { startedAtMs: now - 60000, lastSeenMs: now };
          save.tankCare = { dirt: 22, pellets: 0, lastUpdatedMs: now };
          if (prepareCare) {
            const specimen = save.activeRun.specimen;
            specimen.care = { bornAtMs: now - 300000, lastCareAtMs: now, healthySeconds: 279.2, nutrition: 100, colourQuality: .5, meals: { flake: 0, algae: 0, prey: 0 }, feedingPreference: 'day', development: { resolvedStages: [], pending: [] } };
          }
          localStorage.setItem(key, JSON.stringify(save));
          sessionStorage.setItem(marker, 'yes'); sessionStorage.setItem('loop.now', String(now));
        }
        window.loopNow = Number(sessionStorage.getItem('loop.now')); Date.now = () => window.loopNow;
      }, { key: KEY, name, save, prepareCare });
      await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Collection', exact: true }).waitFor();
      return page;
    };
    const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
    const advance = (page, ms) => page.evaluate(ms => { window.loopNow += ms; sessionStorage.setItem('loop.now', String(window.loopNow)); }, ms);
    const capture = (page, name) => page.screenshot({ path: `.superpowers/${name}.png`, timeout: 60000 });
    const saveMatches = (page, predicate, argument) => page.waitForFunction(({ key, predicate, argument }) => {
      const save = JSON.parse(localStorage.getItem(key)); return new Function('save', 'argument', `return (${predicate})(save, argument)`)(save, argument);
    }, { key: KEY, predicate: predicate.toString(), argument });

    // One persistent individual and one world position across View -> Swim -> View.
    const page = await fixture('identity', profile({ kept: [fish('coral'), fish('Azure', { color: '#368bc4' })] }));
    await capture(page, 'loop-view');
    if(process.argv.includes('--layout-only')){await page.setViewportSize({width:320,height:420});await page.waitForFunction(()=>document.querySelector('.home-header')?.getBoundingClientRect().right<=320);const clean=await page.getByRole('button',{name:'Clean tank for 15 credits',exact:true}).boundingBox(),tagline=await page.locator('.home-context>p').nth(1).boundingBox();assert.ok(clean&&tagline&&clean.y+clean.height<=tagline.y,'clean action does not overlap the View tagline');await capture(page,'loop-view-320');assert.deepEqual(errors,[]);console.log('PASS final View layout at 390x844 and 320x420');return;}
    await click(page, 'Swim');
    await page.getByRole('button', { name: 'Eat food', exact: true }).waitFor();
    let save = await read(page); const initial = save.activeRun;
    assert.equal(initial.specimen.id, 'coral'); assert.equal(initial.source, 'resident');
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowRight');
    await saveMatches(page, save => save.activeRun && save.activeRun.x > 405 && save.activeRun.y < 1500);
    await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight');
    await page.evaluate(()=>{window.loopOriginalWrite=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('quota fixture');};});
    await click(page,'View aquarium');assert.ok(await page.getByRole('button',{name:'Eat food',exact:true}).isVisible(),'failed checkpoint keeps live Swim');
    await page.evaluate(()=>{Storage.prototype.setItem=window.loopOriginalWrite;});
    await click(page, 'View aquarium'); save = await read(page);
    const checkpoint = { x: save.activeRun.x, y: save.activeRun.y, id: save.activeRun.specimen.id };
    assert.ok(checkpoint.x > initial.x && checkpoint.y < initial.y, 'held native movement updates the checkpoint');
    await click(page, 'Collection');
    assert.equal(await page.getByRole('button', { name: /^View Coral,/ }).count(), 1, 'active individual appears exactly once in Collection');
    await page.getByRole('button', { name: /^View Coral,/ }).click();
    await page.getByText('Already well fed.', { exact: false }).waitFor();
    const beforeFeed = await read(page);
    await page.getByRole('button', { name: 'Feed Coral pellets for 5 credits', exact: true }).click();
    save = await read(page); assert.equal(save.coins, beforeFeed.coins - 5);
    assert.ok(save.activeRun.specimen.health < beforeFeed.activeRun.specimen.health, 'paid overfeeding harms health');
    assert.equal(save.tankCare.pellets, beforeFeed.tankCare.pellets + 1);
    assert.ok(save.tankCare.dirt > beforeFeed.tankCare.dirt);
    await page.getByRole('button', { name: 'Clean tank for 15 credits', exact: true }).click();
    save = await read(page); assert.equal(save.coins, beforeFeed.coins - 20); assert.equal(save.tankCare.dirt, 0);
    await click(page, 'Continue Swim');
    await page.getByRole('button', { name: 'Eat food', exact: true }).waitFor();
    await capture(page, 'loop-swim'); await click(page, 'View aquarium');
    save = await read(page); assert.equal(save.activeRun.specimen.id, checkpoint.id);
    assert.ok(Math.abs(save.activeRun.x - checkpoint.x) < 15 && Math.abs(save.activeRun.y - checkpoint.y) < 15, 'resuming does not reset fish to the nursery');
    await page.reload({ waitUntil: 'domcontentloaded' }); save = await read(page);
    assert.equal(save.activeRun.specimen.id, 'coral'); assert.equal(save.coins, beforeFeed.coins - 20, 'reload preserves paid actions instead of reseeding');
    await page.setViewportSize({ width: 320, height: 420 });
    await page.waitForFunction(()=>document.querySelector('.home-header')?.getBoundingClientRect().right<=320);
    const header = await page.locator('.home-header').boundingBox(), dock = await page.locator('.home-dock').boundingBox();
    assert.ok(header && header.x >= 0 && header.x + header.width <= 320 && header.height < 105);
    assert.ok(dock && dock.x >= 0 && dock.x + dock.width <= 320 && dock.y + dock.height <= 420);
    await capture(page, 'loop-view-320');
    await click(page, 'Swim'); save = await read(page); const freeCoins = save.coins;
    await click(page, 'Clean glass'); save = await read(page); assert.equal(save.coins, freeCoins); assert.equal(save.tankCare.dirt, 0);
    await page.context().close();

    // A pending present milestone stays unobtrusive and growth continues until tapped.
    const milestone = await fixture('milestone', profile({ activeRun: { source: 'stock', specimen: fish('Milestone', { growth: 34.9, health: 95, hunger: 80, raisedSeconds: 279.2 }), x: 380, y: 1520, stamina: 100 } }), true);
    await click(milestone, 'Swim'); await advance(milestone, 5000);
    await milestone.getByRole('button', { name: 'Choose upgrades', exact: true }).waitFor();
    assert.equal(await milestone.getByRole('dialog', { name: 'Choose an adaptation' }).count(), 0, 'milestones never auto-open a modal');
    await saveMatches(milestone, save => save.activeRun.specimen.care.development.pending.length === 1);
    const firstGrowth = (await read(milestone)).activeRun.specimen.growth;
    await advance(milestone, 20000);
    await saveMatches(milestone, (save, growth) => save.activeRun.specimen.growth > growth, firstGrowth);
    save = await read(milestone); assert.equal(save.activeRun.specimen.care.development.pending[0].slots, 2);
    await click(milestone,'View aquarium');assert.equal((await read(milestone)).activeRun.specimen.care.development.pending.length,1,'visible View preserves choices');await click(milestone,'Swim');
    await click(milestone, 'Choose upgrades');
    await milestone.getByRole('button', { name: /^Swim speed/ }).click();
    await milestone.getByRole('button', { name: /^Vibrancy/ }).click(); await click(milestone, 'Confirm upgrades');
    await saveMatches(milestone, save => save.activeRun.specimen.traits.length === 2);
    save = await read(milestone); assert.deepEqual([...save.activeRun.specimen.traits].sort(), ['swift', 'vibrancy']);
    assert.equal(save.activeRun.specimen.care.development.pending.length, 0);
    await milestone.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await advance(milestone,400000);await milestone.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await saveMatches(milestone,save=>save.activeRun.specimen.care.development.resolvedStages.includes(75));save=await read(milestone);assert.equal(save.activeRun.specimen.care.development.pending.length,0,'hidden growth chooses automatically without reload');assert.ok(save.activeRun.specimen.traits.length>2);
    await milestone.context().close();

    // The tutorial food at a newborn's mouth requires native button activation.
    const eater = await fixture('native-eat', profile({}));
    await click(eater, 'Swim'); await click(eater, 'Raise ordinary guppy');
    await eater.getByRole('button', { name: 'Eat food', exact: true }).waitFor();
    await saveMatches(eater, save => !!save.activeRun?.specimen.care);
    const freeBefore=await read(eater);assert.ok(freeBefore.tankCare.dirt>0);await click(eater,'Clean glass');const freeAfter=await read(eater);assert.equal(freeAfter.coins,freeBefore.coins);assert.equal(freeAfter.tankCare.dirt,0);
    save = await read(eater); assert.equal(save.activeRun.specimen.care.meals.flake, 0, 'food contact does not auto-eat');
    await eater.getByRole('button', { name: 'Eat food', exact: true }).focus(); await eater.keyboard.press('Enter');
    await click(eater, 'View aquarium'); save = await read(eater);
    assert.equal(save.activeRun.specimen.care.meals.flake, 1, 'native Enter activation eats exactly one mouth-contact flake');
    await eater.context().close();

    // Zero-health resident floats for four seconds before information and one atomic loss.
    const death = await fixture('death', profile({ kept: [fish('Survivor')], activeRun: { source: 'resident', visitId: 'death-visit', specimen: fish('Farewell', { health: 0, hunger: 0 }), x: 380, y: 1520, stamina: 100 } }));
    await click(death, 'Swim');
    assert.equal(await death.getByRole('dialog', { name: 'Fish died' }).count(), 0);
    await saveMatches(death, save => !!save.activeRun?.specimen.deathAtMs);
    await advance(death, 3999);
    assert.equal(await death.getByRole('dialog', { name: 'Fish died' }).count(), 0, 'no death information before four seconds');
    assert.equal((await read(death)).activeRun.specimen.id, 'Farewell');await death.waitForFunction(()=>{window.loopDeathFrameStarted??=performance.now();return performance.now()-window.loopDeathFrameStarted>=2000;},{},{timeout:10000}); await capture(death, 'loop-death');
    await advance(death, 1); await death.getByRole('dialog', { name: 'Fish died' }).waitFor();
    save = await read(death); assert.equal(save.activeRun, null); assert.equal(save.kept.length, 1); assert.equal(save.kept[0].id, 'Survivor');
    assert.equal(save.completedRunIds.filter(id => id === 'death:Farewell').length, 1); assert.ok(save.completedRunIds.includes('death-visit'));
    const afterDeath = JSON.stringify(save.completedRunIds); await click(death, 'Return home'); await death.reload({ waitUntil: 'domcontentloaded' });
    save = await read(death); assert.equal(save.activeRun, null); assert.equal(JSON.stringify(save.completedRunIds), afterDeath, 'reload cannot duplicate resident death');
    await death.context().close();
    assert.deepEqual(errors, []);
    console.log('PASS View/Swim checkpoint identity, active collection, paid pellets and cleaning, free Swim cleaning, deliberate native EAT, present upgrades, four-second resident death, reload persistence and 320x420 layout');
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 1500))]);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
