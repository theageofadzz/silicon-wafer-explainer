import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {root} from './server.mjs';

const browser=await chromium.launch({
 ...(process.env.SILICON_CHROME_PATH?{executablePath:process.env.SILICON_CHROME_PATH}:{channel:'chrome'}),
 headless:true
});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:1800,height:1080}});
 await page.goto(process.env.SILICON_COMFY_URL??'http://127.0.0.1:8196',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof window.app?.loadGraphData==='function');
 await page.keyboard.press('Escape');
 const close=page.getByRole('dialog').getByRole('button',{name:'Close',exact:true});
 if(await close.count())await close.first().click();
 for(const name of ['all','assemble-cached']){
  const ui=JSON.parse(await fs.readFile(path.join(root,`workflows/${name}.json`),'utf8'));
  const api=JSON.parse(await fs.readFile(path.join(root,`workflows/${name}-api.json`),'utf8'));
  const result=await page.evaluate(async workflow=>{
   await window.app.loadGraphData(workflow,true,true,'silicon-wafer.json',
    {skipAssetScans:true,silentAssetErrors:true});
   return(await window.app.graphToPrompt()).output;
  },ui);
  const differences=[];
  for(const[id,node]of Object.entries(api)){
   assert.equal(result[id]?.class_type,node.class_type);
   for(const[key,value]of Object.entries(node.inputs)){
    const got=result[id]?.inputs[key];
    if(JSON.stringify(got)!==JSON.stringify(value))differences.push({id,key,expected:value,got});
   }
  }
  const overlaps=[];
  for(const first of ui.nodes)for(const second of ui.nodes){
   if(first.id>=second.id)continue;
   const a=first.pos,b=second.pos,as=first.size,bs=second.size;
   if(a[0]<b[0]+bs[0]&&b[0]<a[0]+as[0]&&a[1]<b[1]+bs[1]&&b[1]<a[1]+as[1])overlaps.push([first.id,second.id]);
  }
  results.push({name,nodes:ui.nodes.length,links:ui.links.length,differences,overlaps});
  await fs.writeFile(path.join(root,'review/workflow-import.json'),JSON.stringify(results,null,2));
  assert.deepEqual(differences,[],`UI import changes ${name}`);
  assert.deepEqual(overlaps,[],`Overlapping controls ${name}`);
  await page.evaluate(()=>{
   window.app.canvas.ds.scale=.25;window.app.canvas.ds.offset=[35,40];
   window.app.canvas.draw(true,true);
  });
  await page.screenshot({path:path.join(root,`review/workflow-${name}.jpg`),type:'jpeg',quality:88});
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();}
