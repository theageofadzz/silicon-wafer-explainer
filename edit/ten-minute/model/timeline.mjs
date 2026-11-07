export const visualKeys=['wafer','wafer-measure','purity','lattice','silica','furnace','distill','siemens','grains','melt','doping','seed','neck','shoulder','growth','support','magnetic','oxygen','segregation','defects','trim','wire','kerf','edge','lap','etch','polish','flatness','focus','wash','epitaxy','scan','cassette','industry','recap'];
export function flattenBeats(timeline){
  return timeline.scenes.flatMap(scene=>scene.beats.map(beat=>({...beat,sceneId:scene.id,chapter:scene.chapter})))
    .map((beat,index)=>({...beat,index}));
}
export function validateTimeline(timeline){
  if(timeline.fps!==24||timeline.width!==1080||timeline.height!==1920)throw new Error('Timeline contract requires 1080x1920 at 24fps');
  if(!Array.isArray(timeline.scenes)||!timeline.scenes.length)throw new Error('Timeline has no scenes');
  if(!Number.isFinite(timeline.duration)||timeline.duration<=0)throw new Error('Missing timeline duration');
  const seen=new Set();
  for(const scene of timeline.scenes){
    if(!Array.isArray(scene.beats)||!scene.beats.length)throw new Error(`Scene ${scene.id} has no beats`);
    for(const b of scene.beats){
      if(typeof b.id!=='string'||/[\\/]/.test(b.id)||b.id==='..'||seen.has(b.id))throw new Error(`Invalid/duplicate beat ID ${b.id}`);
      seen.add(b.id);
      if(!visualKeys.includes(b.visual))throw new Error(`Unknown visual ${b.id}: ${b.visual}`);
      for(const field of ['start','end','actionStart','actionEnd'])if(!Number.isFinite(b[field]))throw new Error(`Uncalibrated ${b.id}.${field}`);
      if(!(0<=b.start&&b.start<b.end&&b.start<=b.actionStart&&b.actionStart<b.actionEnd&&b.actionEnd<=b.end&&b.end<=timeline.duration+.001)){
        throw new Error(`Invalid absolute-second action window ${b.id}`);
      }
      if(b.start<scene.start-.001||b.end>scene.end+.001)throw new Error(`Beat outside scene: ${b.id}`);
      if(!b.actionAnchor||!Array.isArray(b.words)||!b.words.length)throw new Error(`Missing real word timing/anchor: ${b.id}`);
      let previous=b.start;
      for(const word of b.words){
        if(typeof word.text!=='string'||!Number.isFinite(word.start)||!Number.isFinite(word.end)||
          word.start<b.start-.001||word.start<previous-.001||word.start>word.end||word.end>b.end+.001){
          throw new Error(`Invalid absolute word timing ${b.id}: ${word.text}`);
        }
        previous=word.start;
      }
      if(b.labels!==undefined&&(!Array.isArray(b.labels)||b.labels.some(v=>typeof v!=='string')))throw new Error(`Invalid labels ${b.id}`);
    }
  }
  return timeline;
}
export function syntheticTimeline(){
  return {fps:24,width:1080,height:1920,duration:visualKeys.length*8,
    source:'SYNTHETIC ENGINE FIXTURE - NOT NARRATION VALIDATION',
    scenes:visualKeys.map((visual,i)=>({
      id:`fixture-scene-${i}`,chapter:'fixture',title:visual,start:i*8,end:i*8+8,
      beats:[{id:`fixture-${visual}`,text:'Synthetic mechanism validation',visual,actionAnchor:'action',
        labels:['Object A','Object B'],start:i*8,end:i*8+8,actionStart:i*8+1,actionEnd:i*8+6,
        words:[{text:'action',start:i*8+1,end:i*8+1.5}]}],
    }))};
}
