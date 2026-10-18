import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const enabled = process.env.TEST_ADS_ENABLED === 'true';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/ads');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const stroke = x => ({ tool: 'pen', color: '#493127', lineWidth: 8, points: [{ x, y: 150 }, { x: x + 30, y: 300 }] });
function completedRoom() {
  return { id: roomId, code: 'ABC123DEF4', prompt: '함께 그리는 고양이', host_id: hostId, guest_id: guestId, status: 'completed', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [
    { role: 'left', completed: true, strokes: [stroke(200)] }, { role: 'right', completed: true, strokes: [stroke(600)] },
  ] };
}
async function setup(width, outcome = 'filled', id = hostId) {
  const context = await browser.newContext({ viewport: { width, height: width < 640 ? 740 : 900 }, isMobile: width < 640, hasTouch: width < 640 });
  await mock(context, id);
  let loads = 0;
  await context.route('https://pagead2.googlesyndication.com/**', async route => {
    loads++;
    if (outcome === 'failed') return route.abort();
    // Local stub only: never load or click live advertising.
    const body = outcome === 'stalled' ? '' : `window.adsbygoogle = { push() {
      const ad = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
      if (!ad) throw new Error('Duplicate ad request');
      window.adRequests = (window.adRequests || 0) + 1;
      ad.dataset.adsbygoogleStatus = 'done'; ad.dataset.adStatus = '${outcome}';
      if ('${outcome}' === 'filled') {
        const frame = document.createElement('iframe'); frame.title = '테스트 광고';
        frame.style.cssText = 'display:block;border:0;width:100%;height:100px';
        frame.srcdoc = '<html lang="ko"><body style="margin:0;display:grid;place-items:center;height:100vh;background:#f1f5f9;font:14px sans-serif;color:#64748b">테스트 광고 · 실제 광고 아님</body></html>';
        ad.append(frame);
      }
    } };`;
    return route.fulfill({ contentType: 'application/javascript', body });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, loads: () => loads, errors };
}
async function seedSession(page) {
  await page.goto(`${base}/draw`);
  await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
}
async function openCompleted(page) {
  fixture.room = completedRoom();
  await page.goto(`${base}/rooms/${roomId}`);
  await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
}
try {
  for (const width of [320, 390, 1440]) {
    const run = await setup(width);
    const { page, context } = run;
    for (const route of ['/', '/join?code=ABC123DEF4']) {
      await page.goto(`${base}${route}`);
      assert.equal(await page.locator('.ad-banner').count(), 0);
    }
    await seedSession(page);
    assert.equal(await page.locator('.ad-banner').count(), 0);
    fixture.room = { ...completedRoom(), status: 'waiting', guest_id: null, drawings: completedRoom().drawings.slice(0, 1) };
    await page.goto(`${base}/rooms/${roomId}`);
    await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor();
    assert.equal(await page.locator('.ad-banner').count(), 0);
    assert.equal(run.loads(), 0, 'entry, drawing and waiting never load advertising');

    await openCompleted(page);
    const banner = page.getByRole('complementary', { name: '광고', exact: true });
    if (!enabled) {
      assert.equal(await banner.count(), 0);
      await page.goto(`${base}/library`);
      await page.locator('article').first().waitFor();
      assert.equal(await banner.count(), 0);
      assert.equal(run.loads(), 0, 'unconfigured ads make no third-party requests');
    } else {
      const before = await page.getByLabel('두 사람이 함께 완성한 그림', { exact: true }).boundingBox();
      const adBox = await banner.boundingBox();
      assert.ok(adBox.y > 900, 'ad remains below the artwork and all result actions');
      if (adBox.y > (width < 640 ? 740 : 900) + 160) assert.equal(run.loads(), 0, 'ad script waits for nearby scrolling');
      const action = await page.getByRole('link', { name: '내 보관함으로', exact: true }).boundingBox();
      assert.ok(adBox.y - action.y - action.height >= 36, 'keep ads away from navigation buttons');
      await banner.scrollIntoViewIfNeeded();
      await page.locator('ins[data-ad-status="filled"]').waitFor();
      assert.equal(await page.locator('ins').getAttribute('data-adtest'), 'on');
      assert.equal((await page.locator('ins').boundingBox()).height, 100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.evaluate(() => window.adRequests), 1);
      const after = await page.getByLabel('두 사람이 함께 완성한 그림', { exact: true }).evaluate(canvas => ({ width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height }));
      assert.equal(after.width, before.width); assert.equal(after.height, before.height);
      await page.screenshot({ path: `${out}/completed-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${out}/banner-${width}.png` });
      await page.getByRole('button', { name: '공유 카드', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('canvas[aria-label="완성 그림 공유 카드 미리보기"]')?.getAttribute('aria-busy') === 'false');
      assert.equal(await page.evaluate(() => window.adRequests), 1, 'card rerenders do not refresh advertising');
      await page.getByRole('link', { name: '내 보관함으로', exact: true }).click();
      await page.locator('article').first().waitFor();
      await banner.scrollIntoViewIfNeeded();
      await page.locator('ins[data-ad-status="filled"]').waitFor();
      assert.equal(await page.evaluate(() => window.adRequests), 2);
      assert.equal(run.loads(), 1, 'SPA navigation reuses the script and initializes the new unit once');
      await page.getByRole('button', { name: '내가 시작한 그림', exact: true }).click();
      await page.getByRole('button', { name: '상태 새로고침', exact: true }).click();
      await page.getByRole('button', { name: '상태 새로고침', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.adRequests), 2, 'filters and background updates do not refresh advertising');
      await banner.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/library-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: '내가 참여한 그림', exact: true }).click();
      await page.getByText('아직 참여한 그림이 없어요.', { exact: true }).waitFor();
      assert.equal(await banner.count(), 0, 'empty lists never show advertising');
    }
    const adsTxt = await page.request.get(`${base}/ads.txt`);
    assert.equal(adsTxt.status(), enabled ? 200 : 404);
    if (enabled) assert.equal(await adsTxt.text(), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
    assert.deepEqual(run.errors, []);
    await context.close();
    console.log(`${width}px: ${enabled ? 'lazy 100px banner, action spacing, script deduplication, filter stability, empty-list removal' : 'no slots, no requests'} PASS`);
  }
  if (enabled) {
    for (const outcome of ['failed', 'unfilled', 'stalled']) {
      const run = await setup(390, outcome);
      await seedSession(run.page); await openCompleted(run.page);
      if (outcome === 'stalled') await run.page.clock.install();
      await run.page.getByRole('complementary', { name: '광고', exact: true }).scrollIntoViewIfNeeded();
      if (outcome === 'stalled') {
        await run.page.waitForFunction(() => document.querySelector('script[src*="adsbygoogle.js"]'));
        await run.page.clock.fastForward(21000);
      }
      await run.page.locator('.ad-banner').waitFor({ state: 'detached' });
      assert.equal(await run.page.getByRole('button', { name: '완성 그림 PNG 저장', exact: true }).isEnabled(), true);
      assert.deepEqual(run.errors, []);
      await run.context.close();
      console.log(`${outcome}: ad region collapses and drawing actions remain usable PASS`);
    }
    const run = await setup(390, 'filled', guestId);
    await seedSession(run.page);
    fixture.room = { ...completedRoom(), status: 'guest_joined', drawings: completedRoom().drawings.slice(0, 1) };
    await run.page.goto(`${base}/rooms/${roomId}`);
    await run.page.getByLabel('오른쪽 반쪽 그림 그리기', { exact: true }).waitFor();
    assert.equal(await run.page.locator('.ad-banner').count(), 0);
    assert.equal(run.loads(), 0, 'guest drawing has no ads');
    await run.context.close();
    console.log('guest drawing: no ad units or requests PASS');
  }
} finally { await browser.close(); }
