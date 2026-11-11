// Test proxy for the E2E flows. It forwards to the real API with a throwaway account and,
// through /__mode/<mode>, delays, fails or alters responses on purpose.
import { createServer } from 'node:http';
const UPSTREAM = 'https://dummy-api-topaz.vercel.app';
const CANDIDATE = process.argv[2];
const BUGS = process.argv[3] ?? 'off';
let portfolioReads = 0;
let mode = 'normal', posts = 0, bodies = [], ordersDown = false;
const forward = async (method, url, body) => {
  const r = await fetch(UPSTREAM + url, { method, headers: { 'X-Enable-Bugs': BUGS, 'X-Candidate-Id': CANDIDATE, 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : body });
  return { status: r.status, text: await r.text() };
};
const send = (res, status, text, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type }); res.end(text); };
createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    const url = req.url ?? '';
    if (url.startsWith('/__mode/')) { mode = url.split('/')[2]; ordersDown = mode === 'orders-down'; return send(res, 200, mode); }
    if (url === '/__posts') return send(res, 200, String(posts));
    if (url === '/__portfolio-reads') return send(res, 200, String(portfolioReads));
    if (req.method === 'GET' && url === '/portfolio') portfolioReads += 1;
    if (url === '/__bodies') return send(res, 200, JSON.stringify(bodies));
    if (url === '/__reset') { posts = 0; bodies = []; mode = 'normal'; ordersDown = false; const r = await forward('POST', '/reset', '{}'); return send(res, r.status, r.text); }
    if (url === '/__orders') { const r = await forward('GET', '/orders'); return send(res, r.status, r.text); }
    if (url === '/__portfolio') { const r = await forward('GET', '/portfolio'); return send(res, r.status, r.text); }
    if (req.method === 'GET' && url === '/orders' && ordersDown) return send(res, 503, '{"error":"forced"}');
    if (req.method === 'GET' && (url === '/instruments' || url.startsWith('/search')) && mode === 'null-price') {
      const r = await forward('GET', url);
      const list = JSON.parse(r.text).map((i) => (i.ticker === 'DYCA' ? { ...i, last_price: null } : i));
      return send(res, 200, JSON.stringify(list));
    }
    if (req.method === 'POST' && url === '/orders') {
      posts += 1;
      bodies.push(body);
      if (mode === 'post-503') return send(res, 503, '{"error":"forced"}');
      if (mode === 'post-400') return send(res, 400, '{"error":"Insufficient cash"}');
      const r = await forward('POST', url, body);
      if (mode === 'post-garbage') return send(res, 201, '<html>ok</html>', 'text/html');
      if (mode === 'delay-post' || mode === 'delay-post-then-down') {
        if (mode === 'delay-post-then-down') ordersDown = true;
        setTimeout(() => send(res, r.status, r.text), 12_000);
        return;
      }
      return send(res, r.status, r.text);
    }
    const r = await forward(req.method, url, body);
    send(res, r.status, r.text);
  });
}).listen(8099, '127.0.0.1');
