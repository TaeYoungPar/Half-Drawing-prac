import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const client = 'ca-pub-0000000000000000';
const configured = { NEXT_PUBLIC_ADSENSE_ENABLED: 'true', NEXT_PUBLIC_ADSENSE_CLIENT: client, NEXT_PUBLIC_ADSENSE_COMPLETED_SLOT: '1111111111', NEXT_PUBLIC_ADSENSE_LIBRARY_SLOT: '2222222222' };
function load(env, route = false) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(route ? '../app/ads.txt/route.ts' : '../app/lib/ads.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env }, Response, require: () => load(env) });
  return exports;
}
test('advertising requires explicit activation and valid publisher and slot IDs', () => {
  for (const env of [{}, { ...configured, NEXT_PUBLIC_ADSENSE_ENABLED: 'false' }, { ...configured, NEXT_PUBLIC_ADSENSE_CLIENT: 'ca-pub-invalid' }, { ...configured, NEXT_PUBLIC_ADSENSE_COMPLETED_SLOT: 'not-a-slot' }]) {
    assert.equal(load(env).adSettings('completed'), null);
  }
});
test('placements can be enabled separately and use test ads by default', () => {
  const ads = load({ ...configured, NEXT_PUBLIC_ADSENSE_LIBRARY_SLOT: '' });
  assert.equal(ads.adSettings('library'), null);
  assert.equal(ads.adSettings('completed').slot, '1111111111');
  assert.equal(ads.adSettings('completed').testMode, true);
  assert.equal(load({ ...configured, NEXT_PUBLIC_ADSENSE_TEST_MODE: 'false' }).adSettings('completed').testMode, false);
});
test('ads.txt verifies a configured publisher even before banners are enabled', async () => {
  const response = load({ NEXT_PUBLIC_ADSENSE_CLIENT: client }, true).GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  assert.match(response.headers.get('content-type'), /^text\/plain/);
});
test('ads.txt does not publish a placeholder or malformed publisher', async () => {
  for (const env of [{}, { NEXT_PUBLIC_ADSENSE_CLIENT: 'ca-pub-123\nmalicious-entry' }]) {
    const response = load(env, true).GET();
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '');
  }
});
