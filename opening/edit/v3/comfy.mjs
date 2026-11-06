import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const edit=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(edit,'../..');
const endpoint=process.env.WAFER_COMFY_URL??'http://127.0.0.1:8195';
const plan=JSON.parse(await fs.readFile(path.join(edit,'shots.json'),'utf8'));
const info=await(await fetch(endpoint+'/object_info')).json();
const selection=process.argv[2]??'all';
const pilot=process.argv.includes('--pilot');
const cached=selection==='assemble-cached';
const selected=cached?[]:selection==='all'?plan.shots:plan.shots.filter(s=>selection.split(',').includes(s.id));
if(!cached&&!selected.length)throw new Error(`Unknown shot: ${selection}`);
if(pilot&&selected.some(shot=>shot.inputKind==='guide-video'))
  throw new Error('The guided wafer requires its complete 81-frame input; run blank without --pilot.');
const graph=cached?{}:{
  '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'ltxv-2b-0.9.8-distilled.safetensors'}},
  '2':{class_type:'CLIPLoader',inputs:{clip_name:'t5xxl_fp8_e4m3fn.safetensors',type:'ltxv',device:'cpu'}},
  '3':{class_type:'CLIPTextEncode',inputs:{clip:['2',0],text:plan.negative}},
  '4':{class_type:'ManualSigmas',inputs:{sigmas:plan.sigmaSchedule}},
  '5':{class_type:'KSamplerSelect',inputs:{sampler_name:plan.sampler}},
};
const branchOutputs={};
if(cached)for(const[i,shot]of plan.shots.entries()){
  graph[i+1]={class_type:'WV3ExistingClip',inputs:{relative_path:`edit/v3/generated/${shot.id}.mp4`}};
  branchOutputs[shot.id]=[String(i+1),0];
}
for(const [i,shot]of selected.entries()){
  const base=10+i*10,ref=offset=>[String(base+offset),0];
  graph[base]={class_type:shot.inputKind==='guide-video'?'WV3Guide':'WV3Photo',
    inputs:{relative_path:shot.input}};
  graph[base+1]={class_type:'CLIPTextEncode',inputs:{clip:['2',0],text:shot.prompt}};
  graph[base+2]={class_type:'LTXVConditioning',inputs:{positive:ref(1),negative:['3',0],frame_rate:24}};
  graph[base+3]={class_type:'LTXVPreprocess',inputs:{image:ref(0),img_compression:18}};
  graph[base+4]={class_type:'LTXVImgToVideo',inputs:{
    positive:ref(2),negative:[String(base+2),1],vae:['1',2],image:ref(3),
    width:pilot?320:plan.nativeWidth,height:pilot?576:plan.nativeHeight,
    length:pilot?33:shot.frames,batch_size:1,strength:shot.guideStrength??1}};
  graph[base+5]={class_type:'SamplerCustom',inputs:{
    model:['1',0],add_noise:true,noise_seed:shot.seed,cfg:plan.cfg,
    positive:ref(4),negative:[String(base+4),1],sampler:['5',0],sigmas:['4',0],
    latent_image:[String(base+4),2]}};
  graph[base+6]={class_type:'VAEDecodeTiled',inputs:{
    samples:ref(5),vae:['1',2],tile_size:256,overlap:64,temporal_size:16,temporal_overlap:8}};
  graph[base+7]={class_type:'WV3SaveShot',inputs:{
    images:ref(6),fps:24,shot_name:shot.id+(pilot?'-pilot':'')}};
  branchOutputs[shot.id]=ref(7);
}
if(cached||(selection==='all'&&!process.argv.includes('--shots-only'))){
  graph['90']={class_type:'WV3Assemble',inputs:{
    chip:branchOutputs.chip,blank:branchOutputs.blank,boule:branchOutputs.boule,
    quartz:branchOutputs.quartz,quartz_macro:branchOutputs['quartz-macro'],render_models:!cached}};
}

const nodes=[],links=[];let linkId=0;
for(const[id,node]of Object.entries(graph)){
  const meta=info[node.class_type];
  if(!meta)throw new Error(`Missing node ${node.class_type}`);
  const definitions={...meta.input.required,...meta.input.optional},inputs=[],widgets=[];
  for(const[name,value]of Object.entries(node.inputs)){
    if(Array.isArray(value)){
      const source=graph[value[0]],type=info[source.class_type].output[value[1]];
      const link=++linkId;
      links.push([link,Number(value[0]),value[1],Number(id),inputs.length,type]);
      inputs.push({name,type,link});
    }else{
      widgets.push(value);
      if(definitions[name]?.[1]?.control_after_generate)widgets.push('fixed');
    }
  }
  const numeric=Number(id),column=numeric<10?0:(numeric===90?9:(numeric%10)+1);
  const row=numeric<10?numeric-1:Math.floor(numeric/10)-1;
  nodes.push({id:numeric,type:node.class_type,title:node._meta?.title,pos:[column*370,row*510],
    size:[340,node.class_type==='CLIPTextEncode'?270:210],flags:{},order:nodes.length,mode:0,
    inputs,outputs:(meta.output??[]).map((type,slot)=>({
      name:meta.output_name?.[slot]??type,type,links:[]})),
    properties:{'Node name for S&R':node.class_type},widgets_values:widgets});
}
for(const[id,source,slot]of links)nodes.find(n=>n.id===source).outputs[slot].links.push(id);
const ui={last_node_id:Math.max(...nodes.map(n=>n.id)),last_link_id:linkId,nodes,links,
  groups:[],config:{},extra:{ds:{scale:.3,offset:[20,20]},
    note:'Native LTX diffusion uses real photos; the blank wafer uses a precise 3D motion guide. Code renders engineering geometry and assembles captions.'},version:.4};
await fs.mkdir(path.join(edit,'workflows'),{recursive:true});
const name=selection+(pilot?'-pilot':'');
await fs.writeFile(path.join(edit,`workflows/${name}-api.json`),JSON.stringify(graph,null,2));
await fs.writeFile(path.join(edit,`workflows/${name}.json`),JSON.stringify(ui,null,2));
if(process.argv.includes('--export-only')){
  console.log(`Exported ${nodes.length} nodes and ${links.length} links`);
  process.exit(0);
}
const response=await fetch(endpoint+'/prompt',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({prompt:graph,client_id:'wafer-v3',
    extra_data:{extra_pnginfo:{workflow:ui}}})});
const queued=await response.json();
if(!queued.prompt_id)throw new Error(JSON.stringify(queued));
await fs.writeFile(path.join(edit,`workflows/${name}-job.json`),JSON.stringify(queued,null,2));
console.log('ComfyUI queued',name,queued.prompt_id);
if(process.argv.includes('--queue-only'))process.exit(0);
let previous='';
for(;;){
  await new Promise(resolve=>setTimeout(resolve,2500));
  const history=await(await fetch(endpoint+'/history/'+queued.prompt_id)).json();
  const job=history[queued.prompt_id];
  if(job){
    await fs.writeFile(path.join(edit,`workflows/${name}-history.json`),JSON.stringify(job,null,2));
    if(job.status?.status_str==='error')throw new Error(JSON.stringify(job.status));
    if(job.status?.completed){console.log('Completed',name,job.status.status_str);break;}
  }
  const queue=await(await fetch(endpoint+'/queue')).json();
  const status=JSON.stringify({running:queue.queue_running?.length,pending:queue.queue_pending?.length});
  if(status!==previous){console.log(status);previous=status;}
}
