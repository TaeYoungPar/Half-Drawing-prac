import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/ads');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const stroke = x => ({ tool: 'pen', color: '#493127', lineWidth: 8, points: [{ x, y: 150 }, { x: x + 30, y: 300 }] });
function room() {
  return { id: roomId, code: 'ABC123DEF4', prompt: '함께 그리는 고양이', host_id: hostId, guest_id: guestId, status: 'completed', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [
    { role: 'left', completed: true, strokes: [stroke(200)] }, { role: 'right', completed: true, strokes: [stroke(600)] },
  ] };
}
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 } });
    await mock(context, hostId);
    let loads = 0;
    await context.route('https://pagead2.googlesyndication.com/**', route => { loads++; return route.abort(); });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const noAds = async () => {
      await page.locator('footer').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.ad-banner, ins.adsbygoogle, script[src*="adsbygoogle"]').count(), 0);
      assert.equal(loads, 0);
    };
    for (const route of ['/', '/guide', '/examples', '/join?code=ABC123DEF4']) { await page.goto(`${base}${route}`); await noAds(); }
    await page.goto(`${base}/draw`); await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled); await noAds();
    fixture.room = { ...room(), status: 'waiting', guest_id: null, drawings: room().drawings.slice(0, 1) };
    await page.goto(`${base}/rooms/${roomId}`); await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor(); await noAds();
    fixture.room = room();
    await page.goto(`${base}/rooms/${roomId}`); await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor(); await noAds();
    await page.screenshot({ path: `${out}/completed-${width}.png`, fullPage: true });
    await page.goto(`${base}/library`); await page.locator('article').first().waitFor(); await noAds();
    await page.getByRole('button', { name: '내가 시작한 그림', exact: true }).click(); await noAds();
    await page.screenshot({ path: `${out}/library-${width}.png`, fullPage: true });
    fixture.room = null; await page.goto(`${base}/library`); await noAds();
    assert.equal(await page.locator('meta[name="google-adsense-account"]').getAttribute('content'), 'ca-pub-6008052842325785');
    assert.equal(await (await context.request.get(`${base}/ads.txt`)).text(), 'google.com, pub-6008052842325785, DIRECT, f08c47fec0942fa0\n');
    assert.deepEqual(errors, []); await context.close(); console.log(`No ads on public, working or private pages; verification retained: ${width}px passed`);
  }
} finally { await browser.close(); }
