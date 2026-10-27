import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const room = '33333333-3333-4333-8333-333333333333';
const author = '11111111-1111-4111-8111-111111111111';
const row = { room_id: room, author_id: author, body: '너도 고양이를 생각했어? 😆', created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' };
function load(result) {
  const calls = [];
  const query = { then(resolve) { return Promise.resolve(result).then(resolve); } };
  for (const method of ['from','select','eq','order','abortSignal','upsert','delete','single']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../app/lib/rooms/comments.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ createClient: () => query }) });
  return { ...exports, calls };
}
test('comment input counts complete emoji and normalizes pasted line breaks without splitting surrogate pairs', () => {
  const api = load({});
  assert.equal(api.commentLength('가🎨'), 2);
  assert.equal(api.commentDraft('안녕\n친구\t반가워'), '안녕 친구 반가워');
  assert.equal(api.commentDraft('🎨'.repeat(81)), '🎨'.repeat(80));
});
test('blank, too-long and control-containing comments never send a write request', async () => {
  for (const body of ['', '  ', '가'.repeat(81), '🎨'.repeat(81), '첫줄\n둘째줄', '제어\u0000문자']) {
    const api = load({});
    await assert.rejects(api.saveRoomComment(room, author, body), /1~80자/);
    assert.equal(api.calls.length, 0);
  }
});
test('save trims surrounding whitespace, scopes both identities and performs an idempotent upsert', async () => {
  const api = load({ data: row, error: null });
  const saved = await api.saveRoomComment(room, author, `  ${row.body}  `);
  assert.equal(saved.body, row.body);
  const upsert = api.calls.find(call => call[0] === 'upsert');
  assert.equal(upsert[1].room_id, room); assert.equal(upsert[1].author_id, author); assert.equal(upsert[1].body, row.body);
  assert.equal(upsert[2].onConflict, 'room_id,author_id');
});
test('a missing migration disables only comments; permission and transport errors remain retryable', async () => {
  for (const code of ['42P01', 'PGRST205']) assert.equal(await load({ error: { code } }).getRoomComments(room), null);
  for (const code of ['42501', 'PGRST301', 'network']) await assert.rejects(load({ error: { code } }).getRoomComments(room), /불러오지 못했어요/);
});
test('reads reject wrong-room, duplicate-author, oversized and malformed records', async () => {
  for (const data of [null, [row, row], [row, row, row], [{ ...row, room_id: 'another-room' }], [{ ...row, body: '' }], [{ ...row, body: '가'.repeat(81) }], [{ ...row, updated_at: 'invalid' }]]) {
    await assert.rejects(load({ data, error: null }).getRoomComments(room), /불러오지 못했어요/);
  }
  const api = load({ data: [row], error: null });
  assert.equal((await api.getRoomComments(room))[0].body, row.body);
  assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'room_id' && call[2] === room));
});
test('save errors and wrong-author responses never report success', async () => {
  for (const result of [{ error: { code: '42501' } }, { data: { ...row, author_id: 'another-author' } }, { data: null }]) {
    await assert.rejects(load(result).saveRoomComment(room, author, row.body), /저장/);
  }
});
test('delete scopes room and author, tolerates an already-deleted own comment, and rejects bad results', async () => {
  for (const data of [[], [{ author_id: author }]]) {
    const api = load({ data, error: null });
    await api.deleteRoomComment(room, author);
    assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'room_id' && call[2] === room));
    assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'author_id' && call[2] === author));
  }
  for (const result of [{ error: { code: '42501' } }, { data: [{ author_id: 'other' }] }, { data: null }]) await assert.rejects(load(result).deleteRoomComment(room, author), /삭제/);
});
