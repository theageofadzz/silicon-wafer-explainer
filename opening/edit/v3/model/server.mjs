import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

export const modelRoot = path.dirname(fileURLToPath(import.meta.url));
export const assetRoot = path.resolve(modelRoot, '../../..');
export const modelURL = '/edit/v3/model/index.html';
export function makeServer() {
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const file = path.resolve(assetRoot, `.${pathname === '/' ? modelURL : pathname}`);
    if (!file.startsWith(assetRoot + path.sep)) { res.writeHead(403).end(); return; }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
      const type = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.otf': 'font/otf', '.mp4': 'video/mp4'}[path.extname(file)] ?? 'application/octet-stream';
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
      if (range) {
        const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        if (start >= stat.size || end < start) { res.writeHead(416).end(); return; }
        res.writeHead(206, {'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes'});
        fs.createReadStream(file, {start, end}).pipe(res);
      } else {
        res.writeHead(200, {'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes'});
        fs.createReadStream(file).pipe(res);
      }
    });
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const review = path.join(modelRoot, 'review');
  fs.mkdirSync(review, {recursive: true});
  if (process.argv.includes('--background')) {
    const log = fs.openSync(path.join(review, 'server.log'), 'a');
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--serve', '0'], {
      detached: true, stdio: ['ignore', log, log],
    });
    child.unref(); fs.closeSync(log);
    console.log(`Started preview process ${child.pid}; URL is recorded in review/server.json`);
  } else {
    const server = makeServer();
    const port = Number(process.argv[process.argv.indexOf('--serve') + 1] ?? process.env.MODEL_PREVIEW_PORT ?? 0);
    server.listen(Number.isFinite(port) ? port : 0, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${server.address().port}${modelURL}`;
      fs.writeFileSync(path.join(review, 'server.json'), JSON.stringify({url, pid: process.pid}, null, 2) + '\n');
      console.log(url);
    });
  }
}
