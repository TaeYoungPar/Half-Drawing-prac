import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(fs.readFileSync(new URL('../app/utils/analytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(source, { exports, URL });
const { sanitizeAnalyticsEvent } = exports;

test('analytics URLs exclude invite codes, arbitrary query data, fragments and credentials without changing navigation', () => {
  const original = { type: 'pageview', url: 'https://user:secret@example.com/join?code=ABC123DEF4&prompt=private#token=secret' };
  const result = sanitizeAnalyticsEvent(original);
  assert.equal(result.type, 'pageview');
  assert.equal(result.url, 'https://example.com/join');
  assert.equal(original.url, 'https://user:secret@example.com/join?code=ABC123DEF4&prompt=private#token=secret');
});

test('analytics aggregate private room URLs while retaining public page distinctions', () => {
  for (const path of ['/rooms/33333333-3333-4333-8333-333333333333', '/rooms/another-room/', '/rooms/another-room/nested']) {
    assert.equal(sanitizeAnalyticsEvent({ type: 'pageview', url: `https://example.com${path}?code=secret` }).url, 'https://example.com/rooms/[id]');
  }
  for (const path of ['/', '/library', '/examples/cat', '/examples/robot', '/draw']) {
    assert.equal(sanitizeAnalyticsEvent({ type: 'pageview', url: `https://example.com${path}?daily=2026-11-05` }).url, `https://example.com${path}`);
  }
});

test('invalid and non-web analytics URLs are dropped', () => {
  for (const url of ['invalid', '/join?code=secret', 'javascript:alert(1)', 'file:///private', 'data:text/plain,secret']) {
    assert.equal(sanitizeAnalyticsEvent({ type: 'pageview', url }), null);
  }
});
