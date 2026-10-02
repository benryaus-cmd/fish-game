import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const file=new URL('../src/games/importedAippy/upstream/src/utils/aeratorHealing.ts',import.meta.url);
const code=stripTypeScriptTypes(await readFile(file,'utf8')).replace(/import[^;]+;/g,'');
const {inAeratorHealingPlume}=await import(`data:text/javascript;base64,${Buffer.from('const drawFilter=()=>{};'+code).toString('base64')}`);
test('upper-left aerator heals near its bubbles but not at the nursery or across the tank',()=>{
 assert.equal(inAeratorHealingPlume(170,200),true);
 for(const [x,y]of [[170,800],[400,200],[380,1520],[NaN,200],[170,Infinity]])assert.equal(inAeratorHealingPlume(x,y),false);
});
