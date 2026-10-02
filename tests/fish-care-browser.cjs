const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync('dist/index.html'));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:[...require(process.env.CHROMIUM_ARGS_MODULE).default.args.filter(a=>a!=='--single-process'),'--disable-audio-output']});
  const page=await browser.newPage({viewport:{width:390,height:680}});page.setDefaultTimeout(30000);
  await page.addInitScript(()=>{
   localStorage.setItem('aqualume.boutique.v1',JSON.stringify({version:1,coins:0,sales:0,kept:[],completedRunIds:[],activeRun:{specimen:{id:'care-picking',name:'Little',species:'guppy',growth:0,health:100,hunger:100,traits:[],color:'#f47f69',accent:'#ffd36e',raisedSeconds:0},x:1100,y:900,stamina:100}}));
   const scale=CanvasRenderingContext2D.prototype.scale,translate=CanvasRenderingContext2D.prototype.translate;
   CanvasRenderingContext2D.prototype.translate=function(x,y){if(this.canvas.className==='block w-full h-full'){if(this.careViewPending){this.careViewPending=false;this.careView={x:-x,y:-y};}this.careTranslation={x,y};}return translate.call(this,x,y);};
   CanvasRenderingContext2D.prototype.scale=function(x,y){if(this.canvas.className==='block w-full h-full'&&x===y){if(x>=.74&&x<=1.18){this.careZoom=x;this.careViewPending=true;}else if(x>20&&this.careView&&this.careTranslation){window.careFishPoint={x:(this.careTranslation.x-this.careView.x)*this.careZoom,y:(this.careTranslation.y-this.careView.y)*this.careZoom,zoom:this.careZoom};}}return scale.call(this,x,y);};
  });
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Continue raising',exact:true}).click();
  await page.waitForFunction(()=>window.careFishPoint?.zoom>1.1);
  const point=await page.evaluate(()=>window.careFishPoint);await page.mouse.click(point.x,point.y);
  const dialog=page.getByRole('dialog',{name:'Fish care',exact:true});await dialog.waitFor();
  assert.equal(await page.getByRole('button',{name:'Eat food',exact:true}).count(),0,'movement controls are hidden in fish care');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Close fish care"]')===document.activeElement);
  await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'focus wraps inside care sheet');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Eat food',exact:true}).waitFor();
  console.log('PASS fry close camera, camera-correct fish picking, hidden controls and care focus/Escape');
 }finally{if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1500))]);server.closeAllConnections();await new Promise(r=>server.close(r));}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
