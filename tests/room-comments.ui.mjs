import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/comments');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const section = page => page.getByRole('region', { name: '서로에게 한마디', exact: true });
function complete() {
  fixture.comments = []; fixture.commentsUnavailable = false;
  fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: '울보 양파', host_id: hostId, guest_id: guestId, status: 'completed', expires_at: new Date(Date.now()-86400000).toISOString(), drawings: [
    { role: 'left', completed: true, strokes: [{ tool: 'pen', color: '#493127', lineWidth: 8, points: [{ x: 200, y: 100 }, { x: 350, y: 300 }] }] },
    { role: 'right', completed: true, strokes: [{ tool: 'pen', color: '#2563eb', lineWidth: 8, points: [{ x: 450, y: 300 }, { x: 600, y: 100 }] }] },
  ] };
}
async function viewer(width, id) {
  const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 }, isMobile: width < 640, hasTouch: width < 640 });
  await mock(context, id);
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/rooms/${roomId}`);
  await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
  await section(page).locator('input').waitFor();
  return { context, page, errors };
}
async function autoRefresh(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}
try {
  for (const width of [320, 390, 1440]) {
    complete();
    const host = await viewer(width, hostId); const guest = await viewer(width, guestId);
    const h = section(host.page), g = section(guest.page);
    await h.scrollIntoViewIfNeeded();
    await host.page.screenshot({ path: `${out}/empty-comments-${width}.png` });
    assert.ok((await h.locator('input').boundingBox()).height >= 44);
    assert.equal(await host.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const original = await host.page.getByLabel('두 사람이 함께 완성한 그림', { exact: true }).evaluate(canvas => canvas.toDataURL());
    await h.getByLabel('친구에게 남길 한마디', { exact: true }).fill('🎨'.repeat(81));
    assert.equal(await h.locator('input').inputValue(), '🎨'.repeat(80)); assert.equal(await h.locator('#comment-count').innerText(), '80/80');
    const message = '나는 고양이를 그린 줄 알았어 😆';
    await h.locator('input').fill(message);
    await h.getByRole('button', { name: '한마디 남기기', exact: true }).click();
    await h.getByLabel('내 한마디', { exact: true }).getByText(message, { exact: true }).waitFor();
    assert.equal(fixture.comments.length, 1);
    await autoRefresh(guest.page);
    await g.getByLabel('친구의 한마디', { exact: true }).getByText(message, { exact: true }).waitFor();
    assert.equal(await g.getByLabel('친구의 한마디', { exact: true }).getByRole('button').count(), 0);
    const reply = '나는 양파였는데! 너도 울고 있네 😂';
    await g.locator('input').fill(reply); await g.getByRole('button', { name: '한마디 남기기', exact: true }).click();
    await g.getByLabel('내 한마디', { exact: true }).getByText(reply, { exact: true }).waitFor();
    if (width !== 390) await autoRefresh(host.page);
    await h.getByLabel('친구의 한마디', { exact: true }).getByText(reply, { exact: true }).waitFor({ timeout: 12000 });
    assert.equal(fixture.comments.length, 2);
    await h.scrollIntoViewIfNeeded(); await host.page.screenshot({ path: `${out}/two-comments-${width}.png` });
    await h.getByRole('button', { name: '수정', exact: true }).click();
    await h.getByLabel('내 한마디 수정', { exact: true }).fill('취소할 문장');
    await h.getByRole('button', { name: '수정 취소', exact: true }).click();
    await h.getByLabel('내 한마디', { exact: true }).getByText(message, { exact: true }).waitFor();
    // Editing and a failed save preserve the draft; a retry updates one record.
    await host.context.route('**/rest/v1/room_comments*', async route => {
      if (route.request().method() === 'POST') { await host.context.unroute('**/rest/v1/room_comments*'); return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary error' }) }); }
      return route.fallback();
    });
    await h.getByRole('button', { name: '수정', exact: true }).click();
    const edited = '<img src=x onerror=alert(1)> 웃긴 양파';
    await h.locator('input').fill(edited); await h.getByRole('button', { name: '수정 저장', exact: true }).click();
    await h.getByRole('alert').waitFor(); assert.equal(await h.locator('input').inputValue(), edited);
    await h.scrollIntoViewIfNeeded(); await host.page.screenshot({ path: `${out}/comment-retry-${width}.png` });
    await h.getByRole('button', { name: '수정 저장', exact: true }).click();
    await h.getByLabel('내 한마디', { exact: true }).getByText(edited, { exact: true }).waitFor();
    assert.equal(await h.locator('img').count(), 0, 'text is escaped'); assert.equal(fixture.comments.length, 2);
    assert.equal(await host.page.getByLabel('두 사람이 함께 완성한 그림', { exact: true }).evaluate(canvas => canvas.toDataURL()), original);
    // Native confirmation protects deletion; cancelling leaves the record intact.
    host.page.once('dialog', dialog => dialog.dismiss()); await h.getByRole('button', { name: '삭제', exact: true }).click(); assert.equal(fixture.comments.length, 2);
    host.page.once('dialog', dialog => dialog.accept()); await h.getByRole('button', { name: '삭제', exact: true }).click();
    await h.getByLabel('친구에게 남길 한마디', { exact: true }).waitFor(); assert.equal(fixture.comments.length, 1); assert.equal(fixture.comments[0].author_id, guestId);
    await autoRefresh(guest.page); await g.getByLabel('친구의 한마디', { exact: true }).getByText('친구는 어떤 생각으로 그렸을까요?', { exact: false }).waitFor();
    await guest.page.reload(); await section(guest.page).getByLabel('내 한마디', { exact: true }).getByText(reply, { exact: true }).waitFor();
    await guest.page.getByRole('button', { name: '공유 카드', exact: true }).click();
    await guest.page.getByRole('button', { name: '공유 카드 PNG 저장', exact: true }).waitFor();
    assert.deepEqual(host.errors, []); assert.deepEqual(guest.errors, []);
    await host.context.close(); await guest.context.close();
    console.log(`${width}px: two participants, emoji limit, write/edit/cancel/delete, live refresh, reload, failure retry, escaped text, unchanged canvas and card access PASS`);
  }
  complete();
  // An old in-flight read cannot replace a successful edit.
  const run = await viewer(390, hostId); const s = section(run.page);
  await s.locator('input').fill('처음 한마디'); await s.getByRole('button', { name: '한마디 남기기', exact: true }).click(); await s.getByRole('button', { name: '수정', exact: true }).waitFor();
  let release; const barrier = new Promise(resolve => { release = resolve; });
  let requested; const started = new Promise(resolve => { requested = resolve; });
  let delayNext = true;
  await run.context.route('**/rest/v1/room_comments*', async route => {
    if (route.request().method() === 'GET' && delayNext) { delayNext = false; const old = JSON.stringify(fixture.comments); requested(); await barrier; return route.fulfill({ contentType: 'application/json', body: old }); }
    return route.fallback();
  });
  await autoRefresh(run.page); await started;
  await s.getByRole('button', { name: '수정', exact: true }).click(); await s.locator('input').fill('새 한마디'); await s.getByRole('button', { name: '수정 저장', exact: true }).click(); await s.getByText('새 한마디', { exact: true }).waitFor();
  release(); await run.page.waitForTimeout(100); assert.equal(await s.getByText('새 한마디', { exact: true }).count(), 1);
  await run.context.close();
  // A missing migration must not break drawing results or invite early comments.
  complete(); fixture.commentsUnavailable = true;
  const context = await browser.newContext(); await mock(context, hostId); const page = await context.newPage();
  await page.goto(`${base}/rooms/${roomId}`); await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
  await section(page).waitFor({ state: 'hidden' }); await page.getByRole('button', { name: '완성 그림 PNG 저장', exact: true }).waitFor();
  fixture.commentsUnavailable = false; fixture.room.status = 'waiting'; fixture.room.expires_at = new Date(Date.now()+86400000).toISOString(); fixture.room.guest_id = null; fixture.room.drawings = fixture.room.drawings.slice(0,1);
  let reads = 0; await context.route('**/rest/v1/room_comments*', route => { reads++; return route.fallback(); });
  await page.reload(); await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor(); assert.equal(await section(page).count(), 0); assert.equal(reads, 0);
  complete();
  let failRead = true;
  await context.route('**/rest/v1/room_comments*', route => failRead ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary read error' }) }) : route.fallback());
  await page.reload(); await section(page).getByRole('alert').waitFor();
  assert.equal(await section(page).locator('input').isDisabled(), true);
  failRead = false;
  await section(page).getByRole('button', { name: '한마디 다시 불러오기', exact: true }).click();
  await section(page).locator('input').waitFor(); await page.waitForFunction(() => !document.querySelector('#room-comment').disabled);
  await context.close(); console.log('Stale read protection, missing migration fallback, unfinished room exclusion and initial read failure retry PASS');
} finally { await browser.close(); }
