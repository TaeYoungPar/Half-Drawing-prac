import assert from 'node:assert/strict';
import http from 'node:http';

// Exercise real Next response headers, including statically rendered pages.
// Host headers simulate aliases locally; no requests go to production or Google.
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const origin = 'https://halfdrawing.com';
const publicPaths = ['/', '/guide', '/examples', '/examples/cat', '/examples/robot', '/examples/flower', '/about', '/privacy'];
const hosts = [
  ['halfdrawing.com', false],
  ['www.halfdrawing.com', false],
  ['half-drawing-prac.vercel.app', true],
  ['half-drawing-prac-preview123-team.vercel.app', true],
  ['HALF-DRAWING-PRAC.VERCEL.APP', true],
  ['half-drawing-prac.vercel.app:3000', true],
  ['localhost:3000', false],
  ['preview.vercel.app.evil.com', false],
];

function get(path, host) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL(path, base), {
      headers: { Host: host, 'User-Agent': 'Googlebot' },
      timeout: 15_000,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error(`Timed out: ${host}${path}`)));
    request.on('error', reject);
  });
}

for (const [host, excluded] of hosts) {
  for (const path of publicPaths) {
    const response = await get(path, host);
    assert.equal(response.status, 200, `${host}${path} remains accessible`);
    assert.equal(response.headers['x-robots-tag'], excluded ? 'noindex' : undefined, `${host}${path} indexing isolation`);
    assert.equal(response.headers['referrer-policy'], 'strict-origin');
    const canonical = [...response.body.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
    assert.deepEqual(canonical, [`${origin}${path === '/' ? '' : path}`], `${host}${path} canonical`);
    assert.equal(/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/.test(response.body), false, 'no globally cached noindex metadata');
    assert.match(response.body, /name="google-site-verification" content="L2GlAepP6f4E9SEBD7CsBlv7i1U3EXMZ9zU7YVkO-Xg"/);
    assert.match(response.body.split('</head>')[0], /name="google-site-verification" content="iNNjNR9756OlxhsRmOaWVmKo13ID172qPXwrkwU8npQ"/, 'custom-domain verification is present in the initial head');
  }
  const robots = await get('/robots.txt', host);
  assert.equal(robots.status, 200);
  assert.match(robots.body, /Allow: \/\s/);
  assert.equal(robots.body.includes('Disallow:'), false, 'crawlers must be able to see noindex');
  assert.ok(robots.body.includes(`Sitemap: ${origin}/sitemap.xml`));
  const sitemap = await get('/sitemap.xml', host);
  assert.equal(sitemap.status, 200);
  assert.deepEqual([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), publicPaths.map(path => origin + path));
  const ads = await get('/ads.txt', host);
  assert.equal(ads.status, 200);
  assert.equal(ads.body.trim(), 'google.com, pub-6008052842325785, DIRECT, f08c47fec0942fa0');
  console.log(`${host}: public pages, indexing headers, canonical, sitemap, robots and ads.txt PASS`);
}

// Old-origin links must still open without redirecting domain-scoped sessions.
for (const path of ['/draw', '/join?code=ABC123DEF4', '/library', '/rooms/5d52be45-5a29-403f-9411-7592077b49ea']) {
  const response = await get(path, 'half-drawing-prac.vercel.app');
  assert.equal(response.status, 200, `legacy flow ${path}`);
  assert.equal(response.headers.location, undefined);
  assert.equal(response.headers['x-robots-tag'], 'noindex');
}
console.log('Legacy drawing/invitation/library/room URLs remain accessible without redirects PASS');
