import { createServer } from 'node:http';
import { handle } from './server.mjs';

const PORT = Number(process.env.PORT || 5100);

createServer((req, res) => {
  handle(req, res).catch((err) => {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String((err && err.message) || err));
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Angel's Proxy on ${PORT}`);
});
