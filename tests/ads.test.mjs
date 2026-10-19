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
