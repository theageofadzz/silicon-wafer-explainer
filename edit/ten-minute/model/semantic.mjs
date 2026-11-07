import {ease,clamp} from './core.mjs';

const normalize=text=>String(text).replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const windows=new WeakMap();
export function phraseWindow(beat,phrase){
  let cache=windows.get(beat);
  if(!cache){cache=new Map();windows.set(beat,cache);}
  if(cache.has(phrase))return cache.get(phrase);
  const needle=normalize(phrase),joined=beat.words.map(w=>normalize(w.text)).join('');
  const at=joined.indexOf(needle);
  if(at<0||!needle)throw new Error(`Uncalibrated semantic phrase ${beat.id}: ${phrase}`);
  let cursor=0;
  const matches=beat.words.filter(word=>{
    const begin=cursor;cursor+=normalize(word.text).length;
    return begin<at+needle.length&&cursor>at;
  });
  const value={phrase,start:matches[0].start,end:matches.at(-1).end};
  cache.set(phrase,value);return value;
}
export function compilePlan(beat,plan){
  if(!Array.isArray(plan)||!plan.length)throw new Error(`No specific semantic plan: ${beat.id}`);
  const seen=new Set();
  return plan.map(entry=>{
    for(const field of ['phrase','object','action','fact']){
      if(typeof entry[field]!=='string'||!entry[field].trim())throw new Error(`Missing ${field}: ${beat.id}`);
    }
    if(seen.has(entry.phrase))throw new Error(`Duplicate semantic phrase: ${beat.id}/${entry.phrase}`);
    seen.add(entry.phrase);
    const word=phraseWindow(beat,entry.phrase),seconds=entry.seconds??.8,lead=entry.lead??0;
    const start=word.start-lead,end=start+seconds;
    if(!(seconds>0&&Number.isFinite(seconds+lead)&&start>=beat.start-.001&&end<=beat.end+.001)){
      throw new Error(`Semantic action outside beat: ${beat.id}/${entry.phrase} ${start}..${end}`);
    }
    return {...entry,seconds,lead,start,end,wordStart:word.start,wordEnd:word.end};
  });
}
export function makeContext(beat,time,plan){
  const events=compilePlan(beat,plan),used=new Set();
  const start=Math.min(...events.map(e=>e.start)),end=Math.max(...events.map(e=>e.end));
  const raw=clamp((time-start)/(end-start));
  return {beat,time,raw,p:ease(raw),a:(a,b)=>ease((raw-a)/(b-a)),events,used,
    window:phrase=>phraseWindow(beat,phrase),
    q:(phrase,seconds,lead)=>{
      const event=events.find(e=>e.phrase===phrase);
      if(!event)throw new Error(`Action has no semantic plan: ${beat.id}/${phrase}`);
      if(seconds!==undefined&&Math.abs(seconds-event.seconds)>1e-7)throw new Error(`Action duration disagrees with plan: ${beat.id}/${phrase}`);
      if(lead!==undefined&&Math.abs(lead-event.lead)>1e-7)throw new Error(`Action lead disagrees with plan: ${beat.id}/${phrase}`);
      used.add(phrase);return ease((time-event.start)/(event.end-event.start));
    },
  };
}
