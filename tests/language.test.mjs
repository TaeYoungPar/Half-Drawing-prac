import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const exports = {};
const english = JSON.parse(fs.readFileSync(new URL('../app/i18n/en.json', import.meta.url), 'utf8'));
const source = ts.transpileModule(fs.readFileSync(new URL('../app/i18n/translate.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => english });
const { preferredLocale, translate } = exports;
test('explicit language wins, invalid preference falls back to the primary browser language', () => {
  assert.equal(preferredLocale('en', ['ko-KR']), 'en');
  assert.equal(preferredLocale('ko', ['en-US']), 'ko');
  assert.equal(preferredLocale(null, ['ko-KR', 'en-US']), 'ko');
  assert.equal(preferredLocale('invalid', ['en-GB']), 'en');
  assert.equal(preferredLocale(null, ['ja-JP', 'ko-KR']), 'en');
  assert.equal(preferredLocale(null, []), 'en');
});
test('localized templates preserve literal user content and unknown errors', () => {
  const topic = '그림 주제 {1} $& <script>';
  assert.equal(translate('{0} 완성 그림 열기', 'en', topic), `Open finished drawing: ${topic}`);
  assert.equal(translate('unknown backend error', 'en'), 'unknown backend error');
  assert.equal(translate('그림 시작하기', 'ko'), '그림 시작하기');
  assert.equal(translate('그림 시작하기', 'en'), 'Start drawing');
});
