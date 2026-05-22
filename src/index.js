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
const app = express();
app.use(express.json({ type: ['application/json', 'text/plain'] }));

const mainProxy = createRedbusProxy(process.env.PUBLIC_HOST || `localhost:${PORT}`);

app.use('/pay', express.static(join(__dirname, '..', 'public', 'pay')));
app.use('/complete', express.static(join(__dirname, '..', 'public', 'complete')));
app.use('/', ...mainProxy);

const server = http.createServer(app);
server.timeout = 120000;
server.keepAliveTimeout = 65000;

server.listen(PORT, '0.0.0.0', () => console.log(`[Redbus Mirror] Port ${PORT}`));
