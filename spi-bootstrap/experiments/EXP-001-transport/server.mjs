import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8787);
const host = '0.0.0.0';

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/client.html' : req.url;
  const target = path.join(__dirname, url.replace(/^\//, ''));

  if (!target.startsWith(__dirname) || !fs.existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(target);
  const contentType = ext === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
  res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
  fs.createReadStream(target).pipe(res);
});

const wss = new WebSocketServer({ server });
let connectionCounter = 0;

wss.on('connection', (socket, request) => {
  const connectionId = ++connectionCounter;
  let messageCount = 0;
  let lastSeq = null;
  const connectedAt = Date.now();
  const remote = request.socket.remoteAddress;

  console.log(JSON.stringify({
    kind: 'connection-open',
    connectionId,
    remote,
    serverTime: connectedAt,
  }));

  socket.on('message', (buffer) => {
    const receiveTime = Date.now();
    messageCount += 1;

    try {
      const message = JSON.parse(buffer.toString());
      const seqGap = typeof message.seq === 'number' && typeof lastSeq === 'number'
        ? message.seq - lastSeq - 1
        : 0;
      if (typeof message.seq === 'number') lastSeq = message.seq;

      const record = {
        kind: 'message',
        connectionId,
        receiveTime,
        ageMs: typeof message.clientTime === 'number' ? receiveTime - message.clientTime : null,
        seqGap,
        ...message,
      };

      console.log(JSON.stringify(record));
      socket.send(JSON.stringify({
        type: 'ack',
        seq: message.seq ?? null,
        receiveTime,
        serverTime: Date.now(),
      }));
    } catch (error) {
      console.error(JSON.stringify({
        kind: 'parse-error',
        connectionId,
        receiveTime,
        error: String(error),
      }));
    }
  });

  socket.on('close', () => {
    console.log(JSON.stringify({
      kind: 'connection-close',
      connectionId,
      serverTime: Date.now(),
      durationMs: Date.now() - connectedAt,
      messageCount,
    }));
  });
});

server.listen(port, host, () => {
  console.log(`SPI EXP-001 listening on http://${host}:${port}`);
  console.log(`Open http://<MAC-LAN-IP>:${port} from Vision Pro or another device.`);
});
