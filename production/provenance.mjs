import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {root} from './server.mjs';

const hash=async file=>createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
const plan=JSON.parse(await fs.readFile(path.join(root,'shots.json'),'utf8'));
const clips=[];
for(const shot of plan.shots){
 const file=`generated/${shot.id}.mp4`,meta=JSON.parse(await fs.readFile(path.join(root,`generated/${shot.id}.json`),'utf8'));
 const nodes=Object.values(meta.prompt),save=nodes.find(n=>n.class_type==='SWESave'&&n.inputs.relative_path===file);
 if(!save)throw new Error(`Missing actual graph output for ${file}`);
 const decode=meta.prompt[save.inputs.images[0]];
 const sample=meta.prompt[decode.inputs.samples[0]];
 const conditioning=meta.prompt[sample.inputs.latent_image[0]];
 const input=nodes.find(n=>n.class_type==='SWEInput'&&n.inputs.relative_path===shot.input);
 if(!input)throw new Error(`Missing actual photo or guide input for ${file}`);
 const actual=await hash(file);
 if(actual!==meta.sha256)throw new Error(`Checksum mismatch ${file}`);
 const stream=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',path.join(root,file)],{encoding:'utf8'})).streams[0];
 clips.push({id:shot.id,file,sha256:actual,input:shot.input,inputSHA256AtPackaging:await hash(shot.input),
  kind:shot.kind,frames:Number(stream.nb_frames),fps:meta.fps,width:stream.width,height:stream.height,
  samplerNode:sample.class_type,seed:sample.inputs.noise_seed,cfg:sample.inputs.cfg,
  guideStrength:conditioning.inputs.strength,decode:decode.inputs,
  record:`generated/${shot.id}.json`});
}
const opening='opening/sample-9x16-v3.mp4';
const film='output/silicon-wafer-explainer-9x16.mp4';
const record={date:new Date().toISOString(),clips,opening:{file:opening,sha256:await hash(opening)},
 film:{file:film,sha256:await hash(film)},timelineSHA256:await hash('timeline.json'),
 scope:'Saved ComfyUI execution graphs and output hashes; input snapshot hashes measured at packaging. The full regeneration workflow may use a newer decode tile configuration. Seeds do not guarantee identical pixels across hardware.'};
await fs.writeFile(path.join(root,'review/provenance.json'),JSON.stringify(record,null,2));
console.log(`Verified generation provenance for ${clips.length} new ComfyUI clips`);
