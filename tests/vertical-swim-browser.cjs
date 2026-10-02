// Built journey and motion captures for the restored gentle climb/dive attitude.
const assert = require('node:assert/strict'), fs = require('node:fs'), http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const key = 'aqualume.boutique.v1';
const specimen = {id:'vertical-player',name:'Coral',species:'guppy',growth:100,health:100,hunger:100,traits:['ornate','swift'],color:'#f47f69',accent:'#ffd36e',raisedSeconds:20};
const profile = {version:1,coins:100,sales:0,kept:[{...specimen,id:'home-vertical',growth:60,traits:['ornate']}],completedRunIds:[],activeRun:{specimen,x:1200,y:900,stamina:100}};
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('dist/index.html'));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:[...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a=>a!=='--single-process'),'--disable-audio-output']});
    const page=await browser.newPage({viewport:{width:390,height:680}});
    page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(profile=>{
      localStorage.setItem('aqualume.boutique.v1',JSON.stringify(profile));window.gardenDraws=0;
      const scale=CanvasRenderingContext2D.prototype.scale;
      CanvasRenderingContext2D.prototype.scale=function(x,y){if(this.canvas.className==='block w-full h-full' && x===y && x>=.74 && x<=1)window.gardenDraws++;return scale.call(this,x,y);};
    },profile);
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    const click=name=>page.getByRole('button',{name,exact:true}).click();
    const capture=async name=>{if(process.env.SCREENSHOTS)await page.screenshot({path:'test-results/vertical-'+name+'.png',timeout:60000});};
    await click('Continue raising');await page.waitForFunction(()=>window.gardenDraws>8);
    await page.keyboard.down('ArrowUp');await page.waitForTimeout(500);await capture('garden-up');await page.keyboard.up('ArrowUp');
    await click('Open boutique');
    const up=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    assert.ok(up.activeRun.y < 860,'upward travel remains fully available');
    await click('Continue raising');await page.keyboard.down('ArrowDown');await page.waitForTimeout(750);await capture('garden-down');await page.keyboard.up('ArrowDown');
    await click('Open boutique');
    const down=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    assert.ok(down.activeRun.y > up.activeRun.y+60,'downward travel remains fully available');
    assert.equal(down.activeRun.specimen.id,'vertical-player');
    await click('Collection');await page.getByRole('button',{name:/View Coral/}).click();await click('Swim as this fish');
    const before=JSON.stringify(down.kept);
    await page.keyboard.down('ArrowUp');await page.waitForTimeout(650);await capture('home-up');await page.keyboard.up('ArrowUp');
    await page.keyboard.down('ArrowDown');await page.waitForTimeout(800);await capture('home-down');await page.keyboard.up('ArrowDown');
    await click('Back to watching');
    assert.equal(JSON.stringify((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).kept),before,'home swimming does not change the resident');
    assert.deepEqual(errors,[]);console.log('PASS garden ascent/descent, safe home swimming and actual rendered captures; no runtime errors');
    await page.close();
  }finally{if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1500))]);server.closeAllConnections();await new Promise(r=>server.close(r));}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
