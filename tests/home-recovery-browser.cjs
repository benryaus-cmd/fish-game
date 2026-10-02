const assert = require('node:assert/strict'), fs = require('node:fs'), http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const key = 'aqualume.boutique.v1';
const profile = health => ({version:1,coins:100,sales:0,kept:[],completedRunIds:[],activeRun:{specimen:{id:'recovery-run',name:'Recovery',species:'guppy',growth:30,health,hunger:100,traits:[],color:'#f47f69',accent:'#ffd36e',raisedSeconds:12},x:380,y:1520,stamina:100}});
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('dist/index.html'));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:[...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a=>a!=='--single-process'),'--disable-audio-output']});
    const page=await browser.newPage({viewport:{width:390,height:680}});page.setDefaultTimeout(10000);
    await page.addInitScript(()=>{const v=sessionStorage.getItem('recovery.fixture');if(v){localStorage.setItem('aqualume.boutique.v1',v);sessionStorage.removeItem('recovery.fixture');}});
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    const load=async health=>{await page.evaluate(v=>sessionStorage.setItem('recovery.fixture',JSON.stringify(v)),profile(health));await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue raising',exact:true}).waitFor();};
    const failures=[];
    const check=async(name,fn)=>{try{await fn();console.log('PASS',name);}catch(e){failures.push(name+': '+e.message);console.log('FAIL',name);}};
    await load(100);
    const collection=page.getByRole('button',{name:'Collection',exact:true});await collection.focus();await page.keyboard.press('Space');await page.waitForTimeout(100);
    await check('Space activates home buttons while an outing is retained',async()=>assert.equal(await page.getByRole('dialog',{name:'Your collection'}).count(),1));
    await load(0);
    await page.evaluate(()=>{window.realStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('quota fixture');};});
    await page.getByRole('button',{name:'Continue raising',exact:true}).click();
    await page.getByRole('dialog',{name:'Excursion ended'}).waitFor();await page.waitForTimeout(300);
    assert.ok(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).activeRun,key));
    await page.evaluate(()=>{Storage.prototype.setItem=window.realStorageWrite;});
    await page.getByRole('button',{name:'Choose next stock',exact:true}).click();
    await page.getByRole('dialog',{name:'Choose stock'}).waitFor();
    await check('recovered storage can retire a defeated run and choose new stock',async()=>{
      assert.ok(await page.getByRole('button',{name:'Raise ordinary guppy',exact:true}).isEnabled());
      const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
      assert.equal(saved.activeRun,null);assert.equal(saved.coins,100);assert.equal(saved.sales,0);
      assert.deepEqual(saved.completedRunIds,['recovery-run']);
    });
    assert.deepEqual(failures,[]);
  }finally{if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1500))]);server.closeAllConnections();await new Promise(r=>server.close(r));}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
