import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const client = 'ca-pub-0000000000000000';
function load(env, route = false) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(route ? '../app/ads.txt/route.ts' : '../app/lib/ads.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env }, Response, require: () => load(env) });
  return exports;
}
test('ads.txt verifies a configured publisher even before banners are enabled', async () => {
  const response = load({ NEXT_PUBLIC_ADSENSE_CLIENT: client }, true).GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  assert.match(response.headers.get('content-type'), /^text\/plain/);
});
test('site ownership can be verified before ads or slots are configured', async () => {
  assert.equal(load({}).adsPublisherId(), 'ca-pub-6008052842325785');
  const response = load({}, true).GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'google.com, pub-6008052842325785, DIRECT, f08c47fec0942fa0\n');
});
test('ads.txt rejects an explicitly empty or malformed publisher override', async () => {
  for (const env of [{ NEXT_PUBLIC_ADSENSE_CLIENT: '' }, { NEXT_PUBLIC_ADSENSE_CLIENT: 'ca-pub-123\nmalicious-entry' }]) {
    const response = load(env, true).GET();
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '');
  }
});

test('public ads use the supplied slot only in production and can be disabled without affecting ownership', () => {
  const active = load({ VERCEL_ENV: 'production' });
  assert.equal(active.publicBannerConfig().client, 'ca-pub-6008052842325785');
  assert.equal(active.publicBannerConfig().slot, '9331445471');
  for (const env of [{}, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, { VERCEL_ENV: 'production', NEXT_PUBLIC_ADSENSE_PUBLIC_BANNER_ENABLED: 'false' }]) {
    assert.equal(load(env).publicBannerConfig(), null);
    assert.equal(load(env).adsPublisherId(), 'ca-pub-6008052842325785');
  }
});

test('invalid or intentionally cleared publisher/slot settings never request a public ad', () => {
  for (const value of ['', 'abc', '9331445471\nmalicious', '123']) {
    assert.equal(load({ VERCEL_ENV: 'production', NEXT_PUBLIC_ADSENSE_PUBLIC_BANNER_SLOT: value }).publicBannerConfig(), null);
  }
  assert.equal(load({ VERCEL_ENV: 'production', NEXT_PUBLIC_ADSENSE_CLIENT: '' }).publicBannerConfig(), null);
  const old = { VERCEL_ENV: 'preview', NEXT_PUBLIC_ADSENSE_ENABLED: 'true', NEXT_PUBLIC_ADSENSE_LIBRARY_SLOT: '1234567890', NEXT_PUBLIC_ADSENSE_COMPLETED_SLOT: '1234567890' };
  assert.equal(load(old).publicBannerConfig(), null);
});

test('ad page allowlist excludes private, empty and unknown example paths', () => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../app/utils/publicAdPages.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports });
  for (const path of ['/guide', '/examples', '/examples/cat', '/examples/robot', '/examples/flower/']) assert.equal(exports.isPublicAdPage(path), true);
  for (const path of ['/', '/join', '/draw', '/library', '/rooms/private', '/privacy', '/about', '/examples/unknown', '/guide/unknown']) assert.equal(exports.isPublicAdPage(path), false);
});
