export function resolveTextPlan(plan, film) {
  const sceneFor=id=>{
    const scene=film.scenes.find(s=>s.id===id);
    if(!scene)throw new Error(`Unknown text scene: ${id}`);
    return scene;
  };
  const word=(sceneId,anchor)=>{
    const text=typeof anchor==='string'?anchor:anchor.word;
    const matches=sceneFor(sceneId).words.filter(w=>w.text===text);
    if(typeof anchor==='object'&&matches[anchor.occurrence-1])return matches[anchor.occurrence-1];
    if(matches.length!==1)throw new Error(`Text anchor must be unique: ${sceneId}/${text}`);
    return matches[0];
  };
  const captions=plan.captions.map(c=>{
    const scene=sceneFor(c.scene);
    if(c.text.length>plan.policy.captionMaxCharacters)throw new Error(`Caption too long: ${c.id}`);
    const first=word(c.scene,c.from),last=word(c.scene,c.to);
    if(first.start>last.end)throw new Error(`Reversed caption: ${c.id}`);
    const spoken=scene.words.filter(w=>w.start>=first.start&&w.end<=last.end).map(w=>w.text).join('');
    if(c.text.replace(/[，。！？、]/g,'')!==spoken)throw new Error(`Caption differs from speech: ${c.id}`);
    return {...c,start:first.start,end:Math.min(last.end+c.hold,scene.end)};
  });
  for(let i=0;i<captions.length-1;i++)captions[i].end=Math.min(captions[i].end,captions[i+1].start);
  const beats=plan.beats.map(b=>({...b,time:word(b.scene,b.anchor).start}));
  return {revision:plan.revision,captions,beats,word};
}
