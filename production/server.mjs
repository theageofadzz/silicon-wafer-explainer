import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const makeServer=()=>http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/watch.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404).end();return;}
  const type={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript',
   '.json':'application/json','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf'}[path.extname(file)]??'application/octet-stream';
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
  if(range){
   const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;
   if(start> end||start>=stat.size){res.writeHead(416).end();return;}
   res.writeHead(206,{'Content-Type':type,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes'});
   fs.createReadStream(file,{start,end}).pipe(res);
  }else{res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':'no-store','Accept-Ranges':'bytes'});fs.createReadStream(file).pipe(res);}
 });
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--background')){
  const log=fs.openSync(path.join(root,'review/player.log'),'a');
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--serve'],{detached:true,stdio:['ignore',log,log]});
  child.unref();fs.closeSync(log);console.log('Player process',child.pid);
 }else{
  const server=makeServer();server.listen(Number(process.env.SILICON_PORT??60090),'127.0.0.1',()=>{
   const url=`http://127.0.0.1:${server.address().port}/watch.html`;
   fs.writeFileSync(path.join(root,'review/server.json'),JSON.stringify({url,pid:process.pid},null,2));console.log(url);
  });
 }
}
