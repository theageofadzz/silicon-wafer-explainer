import {V,ease,clamp,mix} from './core.mjs';
import {phraseWindow} from './semantic.mjs';

export function cameraPlanFor(beat,rig){
  const shots=rig.storyShots||[{phrase:rig.semanticPlan[0].phrase,...rig.view,kind:'overview'}];
  let previous=-Infinity;
  return shots.map((shot,index)=>{
    const word=phraseWindow(beat,shot.phrase);
    const at=index===0?beat.start:word.start;
    if(at<=previous)throw new Error(`Camera shots must follow speech: ${beat.id}/${shot.phrase}`);
    previous=at;
    const eye=shot.eye||rig.view.eye,look=shot.look||rig.view.look||[0,0,0];
    const span=shot.span||rig.view.span;
    const action=rig.semanticPlan.find(event=>event.phrase===shot.phrase);
    if(!action)throw new Error(`Camera cue must name an explanatory action: ${beat.id}/${shot.phrase}`);
    if(!Array.isArray(eye)||eye.length!==3||!Array.isArray(look)||look.length!==3
      ||!eye.every(Number.isFinite)||!look.every(Number.isFinite)||!(span>0)){
      throw new Error(`Invalid camera view: ${beat.id}/${shot.phrase}`);
    }
    return {phrase:shot.phrase,at,wordStart:word.start,kind:shot.kind||'overview',
      eye:[...eye],look:[...look],span,projection:shot.projection||'orthographic',
      fit:shot.fit??false,track:shot.object?.name||shot.object?.type||null,
      action:action.action,fact:action.fact};
  });
}

export function directedView(beat,rig,ctx){
  const plan=cameraPlanFor(beat,rig);
  let index=0;
  for(let i=1;i<plan.length;i++)if(ctx.time>=plan[i].at)index=i;
  const selected=plan[index],source=(rig.storyShots||[])[index]||rig.view;
  const actionEnd=Math.max(...ctx.events.map(event=>event.end));
  const end=Math.min(plan[index+1]?.at??actionEnd,actionEnd);
  const progress=ease(clamp((Math.min(ctx.time,actionEnd)-selected.at)/Math.max(.001,end-selected.at)));
  const look=source.object?.isObject3D?source.object.getWorldPosition(V()):V(...selected.look);
  const direction=V(...selected.eye).normalize();
  // A small physical camera arc reveals depth; the mechanism remains driven by spoken actions.
  const arc=selected.projection==='perspective'?(progress-.5)*.045:0;
  const x=direction.x,z=direction.z;
  direction.x=x*Math.cos(arc)-z*Math.sin(arc);
  direction.z=x*Math.sin(arc)+z*Math.cos(arc);
  const span=selected.span*mix(1.015,1,progress);
  return {plan,index,kind:selected.kind,phrase:selected.phrase,look,direction,span,
    fit:selected.fit,projection:selected.projection,progress};
}
