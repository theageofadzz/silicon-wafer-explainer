import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=path.dirname(fileURLToPath(import.meta.url));
const defaultPage=fs.existsSync(path.join(root,'watch-v3.html'))?'watch-v3.html':'watch.html';
export function makeServer(){
  return http.createServer((req,res)=>{
    let relative;
    try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
    const file=path.resolve(root,`.${relative==='/'?'/'+defaultPage:relative}`);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.stat(file,(err,st)=>{
      if(err||!st.isFile()){res.writeHead(404).end();return;}
      const ext=path.extname(file);
      const type={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.wav':'audio/wav','.otf':'font/otf'}[ext]??'application/octet-stream';
      const range=req.headers.range;
      if(range){
        const match=/bytes=(\d+)-(\d*)/.exec(range);
        if(!match){res.writeHead(416).end();return;}
        const start=+match[1],end=match[2]?Math.min(+match[2],st.size-1):st.size-1;
        res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});
        fs.createReadStream(file,{start,end}).pipe(res);
      }else{
        res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Accept-Ranges':'bytes','Cache-Control':'no-store'});
        fs.createReadStream(file).pipe(res);
      }
    });
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const server=makeServer();
  server.listen(Number(process.env.WAFER_PORT??3429),'127.0.0.1',()=>console.log(`Preview http://127.0.0.1:${server.address().port}/${defaultPage}`));
}
