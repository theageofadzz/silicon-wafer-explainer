import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const endpoint=process.env.SILICON_COMFY_URL??'http://127.0.0.1:8196';
const plan=JSON.parse(await fs.readFile(path.join(root,'shots.json'),'utf8'));
const timeline=JSON.parse(await fs.readFile(path.join(root,'timeline.json'),'utf8'));
const selection=process.argv[2]??'all', cached=selection==='assemble-cached';
const info=await(await fetch(endpoint+'/object_info')).json();
const openingPlan=JSON.parse(await fs.readFile(path.join(root,'opening/edit/v3/shots.json'),'utf8'));
const openingShots=openingPlan.shots.map(s=>({...s,id:'opening-'+s.id,
 input:'opening/'+s.input,fps:24,guideStrength:s.guideStrength??1,
 output:`opening/edit/v3/generated/${s.id}.mp4`}));
const selected=cached?[]:selection==='all'?[...openingShots,...plan.shots]:plan.shots.filter(s=>selection.split(',').includes(s.id));
if(!cached&&!selected.length)throw new Error('Unknown scene selection');
const graph=cached?{}:{
 '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'ltxv-2b-0.9.8-distilled.safetensors'}},
 '2':{class_type:'CLIPLoader',inputs:{clip_name:'t5xxl_fp8_e4m3fn.safetensors',type:'ltxv',device:'cpu'}},
 '3':{class_type:'CLIPTextEncode',inputs:{clip:['2',0],text:plan.negative}},
 '4':{class_type:'ManualSigmas',inputs:{sigmas:plan.sigmaSchedule}},
 '5':{class_type:'KSamplerSelect',inputs:{sampler_name:plan.sampler}}
};
const complete=cached||(selection==='all'&&!process.argv.includes('--shots-only'));
if(complete)graph['6']={class_type:'SWEPrepare',inputs:{regenerate_narration:false,regenerate_guides:false,prepare_guides:!cached}};
const outputs={};
for(const[i,shot]of selected.entries()){
 const b=10+i*10,ref=j=>[String(b+j),0];
 graph[b]={class_type:'SWEInput',inputs:{relative_path:shot.input,...(complete?{project:['6',0]}:{})}};
 graph[b+1]={class_type:'CLIPTextEncode',inputs:{clip:['2',0],text:shot.prompt}};
 graph[b+2]={class_type:'LTXVConditioning',inputs:{positive:ref(1),negative:['3',0],frame_rate:shot.fps}};
 graph[b+3]={class_type:'LTXVPreprocess',inputs:{image:ref(0),img_compression:18}};
 graph[b+4]={class_type:'LTXVImgToVideo',inputs:{positive:ref(2),negative:[String(b+2),1],
   vae:['1',2],image:ref(3),width:plan.nativeWidth,height:plan.nativeHeight,
   length:shot.frames,batch_size:1,strength:shot.guideStrength}};
 graph[b+5]={class_type:'SamplerCustom',inputs:{model:['1',0],add_noise:true,
   noise_seed:shot.seed,cfg:plan.cfg,positive:ref(4),negative:[String(b+4),1],
   sampler:['5',0],sigmas:['4',0],latent_image:[String(b+4),2]}};
 graph[b+6]={class_type:'VAEDecodeTiled',inputs:{samples:ref(5),vae:['1',2],
   tile_size:plan.decodeTileSize??256,overlap:64,temporal_size:plan.decodeTemporalSize??32,temporal_overlap:plan.decodeTemporalOverlap??8}};
 graph[b+7]={class_type:'SWESave',inputs:{images:ref(6),fps:shot.fps,relative_path:shot.output??`generated/${shot.id}.mp4`}};
 outputs[shot.id]=ref(7);
}
if(cached){
 for(const[i,scene]of timeline.scenes.entries()){
  graph[i+10]={class_type:'SWEExisting',inputs:{relative_path:`generated/${scene.id}.mp4`}};
  outputs[scene.id]=[String(i+10),0];
 }
 for(const[i,name]of ['silicon-seed','silicon-shoulder'].entries()){
  graph[i+40]={class_type:'SWEExisting',inputs:{relative_path:`generated/${name}.mp4`}};
  outputs[name]=[String(i+40),0];
 }
 for(const[i,shot]of openingShots.entries()){
  graph[i+50]={class_type:'SWEExisting',inputs:{relative_path:shot.output}};
  outputs[shot.id]=[String(i+50),0];
 }
}
if(complete){
 graph['500']={class_type:'SWEOpening',inputs:{project:['6',0],rebuild:!cached,
  ...Object.fromEntries(openingShots.map(s=>[s.id.slice(8).replaceAll('-','_'),outputs[s.id]]))}};
 graph['501']={class_type:'SWEAssemble',inputs:{opening:['500',0],
   ...Object.fromEntries(timeline.scenes.map(s=>[s.id,outputs[s.id]])),
   silicon_seed:outputs['silicon-seed'],silicon_shoulder:outputs['silicon-shoulder']}};
}
let linkID=0;const nodes=[],links=[];
for(const[id,node]of Object.entries(graph)){
 const meta=info[node.class_type];if(!meta)throw new Error(`Missing node ${node.class_type}`);
 const inputs=[],widgets=[],definitions={...meta.input.required,...meta.input.optional};
 for(const[name,value]of Object.entries(node.inputs)){
  if(Array.isArray(value)){
   const type=info[graph[value[0]].class_type].output[value[1]],link=++linkID;
   links.push([link,Number(value[0]),value[1],Number(id),inputs.length,type]);
   inputs.push({name,type,link});
  }else{widgets.push(value);if(definitions[name]?.[1]?.control_after_generate)widgets.push('fixed');}
 }
 const n=Number(id),col=n<10?0:n>=500?9:n%10+1,row=n<10?n-1:n>=500?n-498:Math.floor(n/10)-1;
 nodes.push({id:n,type:node.class_type,pos:[col*370,row*460],size:[340,Math.max(node.class_type==='CLIPTextEncode'?260:210,90+inputs.length*22)],
  flags:{},order:nodes.length,mode:0,inputs,outputs:(meta.output??[]).map((type,slot)=>({
   name:meta.output_name?.[slot]??type,type,links:[]})),properties:{'Node name for S&R':node.class_type},widgets_values:widgets});
}
for(const[id,source,slot]of links)nodes.find(n=>n.id===source).outputs[slot].links.push(id);
const groups=selected.map((shot,i)=>({id:i+1,title:shot.id,bounding:[345,i*460-25,3060,430],
 color:shot.kind==='real-photograph'?'#476858':'#455764',font_size:22,flags:{}}));
if(complete)groups.push({id:100,title:'Recorded speech / final word-timed assembly',bounding:[3290,850,780,1200],color:'#635e49',font_size:22,flags:{}});
const ui={last_node_id:Math.max(...nodes.map(n=>n.id)),last_link_id:linkID,nodes,links,groups,
 config:{},extra:{ds:{scale:.16,offset:[30,30]},note:'Real photos + exact 3D guides -> native LTX diffusion -> word-timed captions. Code MIT; assets retain separate licenses.'},version:.4};
const name=cached?'assemble-cached':selection;
await fs.mkdir(path.join(root,'workflows'),{recursive:true});
await fs.writeFile(path.join(root,`workflows/${name}-api.json`),JSON.stringify(graph,null,2));
await fs.writeFile(path.join(root,`workflows/${name}.json`),JSON.stringify(ui,null,2));
if(process.argv.includes('--export-only')){
 console.log(`Exported ${nodes.length} nodes / ${links.length} links`);process.exit(0);
}
const response=await fetch(endpoint+'/prompt',{method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({prompt:graph,client_id:'silicon-explainer',
 extra_data:{extra_pnginfo:{workflow:ui}}})});
const queued=await response.json();if(!queued.prompt_id)throw new Error(JSON.stringify(queued));
await fs.writeFile(path.join(root,`workflows/${name}-job.json`),JSON.stringify(queued,null,2));
console.log('Queued',queued.prompt_id,name);
if(process.argv.includes('--queue-only'))process.exit(0);
for(;;){
 await new Promise(r=>setTimeout(r,5000));
 const history=await(await fetch(endpoint+'/history/'+queued.prompt_id)).json(),job=history[queued.prompt_id];
 if(job){
  await fs.writeFile(path.join(root,`workflows/${name}-history.json`),JSON.stringify(job,null,2));
  if(job.status?.status_str==='error')throw new Error(JSON.stringify(job.status));
  if(job.status?.completed){console.log('Completed',name);break;}
 }
}
