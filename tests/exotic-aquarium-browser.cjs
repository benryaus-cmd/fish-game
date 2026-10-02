const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
(async()=>{
 const {createBoutiqueSave,createSpecimen}=await import('../src/games/importedAippy/upstream/src/utils/boutique.ts');
  const {ensureSpecimenCare}=await import('../src/games/importedAippy/upstream/src/utils/specimenCare.ts');
 const now=Date.now();const adult=(stock,id)=>ensureSpecimenCare({...createSpecimen(stock,id),growth:80,raisedSeconds:650,traits:['ornate','vital']},now);
 const fixture={...createBoutiqueSave(),coins:600,kept:[adult('rainbow','rainbow-parent'),adult('pearlangel','angel-parent')],worldClock:{startedAtMs:now-60000,lastSeenMs:now}};
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('dist/index.html'));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:[...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a=>a!=='--single-process'),'--disable-audio-output']});
  const page=await browser.newPage({viewport:{width:390,height:680}});page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(fixture=>{const saved=sessionStorage.getItem('exotic.fixture');if(saved){localStorage.setItem('aqualume.boutique.v1',saved);sessionStorage.removeItem('exotic.fixture');}else if(!sessionStorage.getItem('exotic.seeded')){localStorage.setItem('aqualume.boutique.v1',JSON.stringify(fixture));sessionStorage.setItem('exotic.seeded','1');}window.exoticNow=Number(sessionStorage.getItem('exotic.now'))||Date.now();Date.now=()=>window.exoticNow;},fixture);
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('aqualume.boutique.v1')));
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  const capture=async name=>{if(process.env.SCREENSHOTS)await page.screenshot({path:'test-results/exotic-'+name+'.png',timeout:60000});};
  const load=async value=>{await page.evaluate(value=>sessionStorage.setItem('exotic.fixture',JSON.stringify(value)),value);await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('region',{name:'Home aquarium',exact:true}).waitFor();};
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await capture('home-day');
  await click('Raise');await page.getByRole('tab',{name:'Tropical',exact:true}).click();await capture('tropical-stock');
  await click('Buy Rainbow');let save=await read();assert.equal(save.coins,520);assert.equal(save.activeRun.specimen.species,'tropical');
  await page.getByRole('button',{name:'Eat food',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('status').filter({hasText:'Flake eaten'}).waitFor();
  await click('Fish condition and value');await click('Care and development');await page.getByRole('dialog',{name:'Fish care',exact:true}).waitFor();
  await page.getByText(/Living colour/i).waitFor();await page.keyboard.press('Escape');await click('Open boutique');
  save=await read();assert.equal(save.activeRun.specimen.care.meals.flake,1);
  await load(fixture);await click('Raise');await page.getByRole('tab',{name:'Angels',exact:true}).click();await capture('angel-stock');await click('Buy Koi Angel');
  save=await read();assert.equal(save.coins,400);assert.equal(save.activeRun.specimen.species,'angelfish');assert.equal(save.activeRun.specimen.inherited.bodyShape,'angel');
  for(const key of ['ArrowDown','ArrowRight','ArrowUp','ArrowLeft']){await page.keyboard.down(key);await page.waitForTimeout(250);await page.keyboard.up(key);}
  await capture('angel-growing');await click('Open boutique');assert.ok((await read()).activeRun.specimen.id);
  await load(fixture);await click('Breed');await page.getByRole('dialog',{name:'Breed fish',exact:true}).waitFor();
  await click('Select Rainbow as a parent');await click('Select Pearl Angel as a parent');
  await page.getByText('colorful or angel',{exact:true}).waitFor();await page.getByText('triangle or sail',{exact:true}).waitFor();await capture('hybrid-preview');
  await page.getByRole('button',{name:/^Start breeding/}).click();save=await read();const child=save.breeding.offspring;
  assert.deepEqual(child.inherited.parents,['rainbow-parent','angel-parent']);assert.ok(['colorful','angel'].includes(child.inherited.bodyShape));
  await page.reload({waitUntil:'domcontentloaded'});assert.deepEqual((await read()).breeding.offspring,child);
  await click('Breed');await page.evaluate(()=>{window.exoticNow+=121000;sessionStorage.setItem('exotic.now',String(window.exoticNow));});await page.getByRole('button',{name:/^Welcome your fry/}).click();
  save=await read();assert.equal(save.kept.length,3);assert.equal(save.kept.filter(f=>f.id===child.id).length,1);await click('Close breeding');
  await page.evaluate(()=>{window.exoticNow+=200000;sessionStorage.setItem('exotic.now',String(window.exoticNow));});await page.waitForFunction(()=>document.querySelector('[aria-label="World time"]')?.textContent.includes('Night'));await capture('home-night');
  // Authored 1800px world floor is approximately 1600px at the first crab's home.
  const floorAt1180=1600;
  await load({...fixture,kept:[],activeRun:{specimen:adult('koiangel','bottom-angel'),x:1180,y:floorAt1180-30,stamina:100}});
  await click('Continue raising');await page.waitForFunction(()=>document.querySelector('[aria-label="World time"]')?.textContent.includes('Night'));
  await page.waitForFunction(()=>Number(document.querySelector('.garden-condition em')?.textContent)<100);
  await capture('night-bottom');await click('Open boutique');
  assert.ok((await read()).activeRun.specimen.health<100,'floor crab deals damage after its telegraphed attack');
  assert.deepEqual(errors,[]);console.log('PASS tropical/angel stock purchases, explicit meal feedback, direct care access, angel controls, cross-family preview and exact-once persisted offspring');
 }finally{if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1500))]);server.closeAllConnections();await new Promise(r=>server.close(r));}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
