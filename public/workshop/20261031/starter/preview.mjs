// 零依赖本地预览。使用桌面应用自带或电脑现有的 Node 运行，无需 npm install。
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(root,'.'+path);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden')}let info=await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file)}if(!info.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'});if(req.method==='HEAD')return res.end();const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res)}catch{res.writeHead(404);res.end('Not found')}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'8766端口正在使用。检查现有预览窗口，或结束旧服务后重试。':e.message);process.exitCode=1});
server.listen(8766,'127.0.0.1',()=>console.log('舞台草稿已就绪：http://localhost:8766/（保留此进程，Ctrl+C结束）'));
