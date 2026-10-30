import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, fixture, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/loading');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
function barrier() {
  let release, enter;
  return { wait: new Promise(resolve => { release = resolve; }), entered: new Promise(resolve => { enter = resolve; }), release: () => release(), enter: () => enter() };
}
function seed(completed = true) {
  fixture.comments = []; fixture.commentsUnavailable = false;
  fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: '졸린 고양이', host_id: hostId, guest_id: completed ? guestId : null, status: completed ? 'completed' : 'waiting', expires_at: new Date(Date.now()+86400000).toISOString(), drawings: [
    { role: 'left', completed: true, strokes: [{ tool: 'pen', color: '#493127', lineWidth: 8, points: [{ x: 200, y: 100 }, { x: 400, y: 300 }] }] },
    ...(completed ? [{ role: 'right', completed: true, strokes: [{ tool: 'pen', color: '#2563eb', lineWidth: 8, points: [{ x: 400, y: 300 }, { x: 600, y: 100 }] }] }] : []),
  ] };
}
const pageLoader = page => page.locator('[data-loading-state="page"]:visible');
const inlineLoader = page => page.locator('[data-loading-state="inline"]:visible');
try {
  for (const width of [320, 390, 1440]) {
    seed();
    const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 }, isMobile: width < 640, hasTouch: width < 640 });
    await mock(context, hostId);
    const auth = barrier(), comments = barrier(), lists = barrier(); let room = barrier(); let roomFails = false;
    await context.route('**/auth/v1/signup', async route => { auth.enter(); await auth.wait; return route.fallback(); });
    await context.route('**/rest/v1/rooms*', async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.has('id')) {
        if (roomFails) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'test room error' }) });
        const current = room; current.enter(); await current.wait;
      } else { lists.enter(); await lists.wait; }
      return route.fallback();
    });
    await context.route('**/rest/v1/room_comments*', async route => { comments.enter(); await comments.wait; return route.fallback(); });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/rooms/${roomId}`); await auth.entered;
    await pageLoader(page).waitFor();
    assert.equal(await pageLoader(page).getAttribute('role'), 'status');
    await page.waitForFunction(() => document.querySelector('[data-loading-state="page"] img')?.naturalWidth > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await pageLoader(page).locator('img').evaluate(image => { image.dataset.sameLoadingImage = 'yes'; });
    assert.notEqual(await pageLoader(page).locator('.loading-mascot').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.screenshot({ path: `${out}/room-auth-${width}.png`, fullPage: true, animations: 'disabled' });
    auth.release(); await room.entered;
    assert.equal(await pageLoader(page).locator('img').getAttribute('data-same-loading-image'), 'yes', 'auth to data loading retains the same illustration and DOM');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const node of await pageLoader(page).locator('.loading-mascot, .loading-dots > span').all()) assert.equal(await node.evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.screenshot({ path: `${out}/room-data-${width}.png`, fullPage: true });
    room.release();
    await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor(); await comments.entered;
    assert.equal(await pageLoader(page).count(), 0);
    await inlineLoader(page).waitFor(); await inlineLoader(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/comments-${width}.png`, animations: 'disabled' });
    comments.release(); await page.locator('#room-comment').waitFor(); assert.equal(await inlineLoader(page).count(), 0);
    roomFails = true; await page.reload();
    await page.getByRole('alert').filter({ hasText: '방 정보를 불러오지 못했습니다.' }).waitFor(); assert.equal(await pageLoader(page).count(), 0, 'failed request replaces loading with retry');
    roomFails = false; room = barrier(); await page.getByRole('button', { name: '다시 불러오기', exact: true }).click(); await room.entered; await pageLoader(page).waitFor(); room.release();
    await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
    await page.goto(`${base}/library`); await lists.entered;
    const library = page.locator('[data-loading-state="section"]:visible'); await library.waitFor();
    await library.scrollIntoViewIfNeeded();
    assert.ok((await library.boundingBox()).height < 280, 'section loading stays compact instead of covering the list');
    await page.screenshot({ path: `${out}/library-${width}.png`, fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    lists.release(); await page.locator('article').first().waitFor();
    assert.equal(await library.count(), 0);
    await page.getByRole('button', { name: '내가 시작한 그림', exact: true }).click(); await page.locator('article').first().waitFor(); assert.equal(await library.count(), 0);
    assert.deepEqual(errors, []); await context.close();

    seed(false);
    const guest = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 } }); await mock(guest, guestId); const joining = barrier();
    await guest.route('**/rest/v1/rpc/join_room', async route => { joining.enter(); await joining.wait; return route.fallback(); });
    const join = await guest.newPage(); await join.goto(`${base}/join?code=ABC123DEF4`);
    await join.getByRole('heading', { name: '친구의 그림이 기다려요!', exact: true }).waitFor();
    await join.getByRole('button', { name: '이어 그리러 가기 →', exact: true }).click(); await joining.entered;
    await inlineLoader(join).waitFor(); await join.screenshot({ path: `${out}/joining-${width}.png`, fullPage: true, animations: 'disabled' });
    joining.release(); await join.getByRole('heading', { name: '이어 그리기', exact: true }).waitFor();
    await guest.close(); console.log(`${width}px: room auth/data continuity, local art, status announcements, reduced motion, failure/retry, library/filter, comments and joining states PASS`);
  }
  // The image is decorative: losing it never hides the loading message or navigation.
  seed();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); await mock(context, hostId);
  await context.route('**/loading-kitten.webp', route => route.abort()); const pending = barrier();
  await context.route('**/rest/v1/rooms*', async route => { pending.enter(); await pending.wait; return route.fallback(); });
  const page = await context.newPage(); await page.goto(`${base}/rooms/${roomId}`); await pending.entered;
  await pageLoader(page).getByRole('heading', { name: '우리 그림을 꺼내고 있어요' }).waitFor();
  await page.locator('header').getByRole('link', { name: '홈', exact: true }).click(); await page.getByRole('heading', { name: '반쪽은 내가, 나머지는 너!', exact: true }).waitFor();
  pending.release(); assert.equal(await pageLoader(page).count(), 0); await context.close();
  console.log('Image failure keeps guidance readable; shared navigation interrupts pending room loading PASS');
} finally { await browser.close(); }
