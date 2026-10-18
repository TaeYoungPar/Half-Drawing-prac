import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/gestures');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
async function historyToolsClosed(page) {
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
  await page.getByRole('dialog', { name: '그림 도구', exact: true }).waitFor({ state: 'hidden' });
}
async function forwardDoesNotOpenTools(page, filename) {
  await page.goForward();
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구') || document.querySelector('dialog[aria-label="그림 도구"]')?.open);
  await page.screenshot({ path: filename });
  assert.equal(await page.getByRole('dialog', { name: '그림 도구', exact: true }).count(), 0, 'Forward must not reopen a dismissed tool window');
  await historyToolsClosed(page);
}
try {
  for (const width of [320, 390]) for (const side of ['left', 'right']) {
    fixture.room = side === 'right' ? { id: roomId, code: 'ABC123DEF4', prompt: '가장자리에서 그리기', host_id: hostId, guest_id: guestId, status: 'guest_joined', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [{ role: 'left', completed: true, strokes: [] }] } : null;
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    await mock(context, side === 'left' ? hostId : guestId);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}${side === 'left' ? '/draw' : `/rooms/${roomId}`}`);
    await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
    await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
    await page.getByRole('button', { name: '파랑 선택', exact: true }).click();
    await page.getByRole('button', { name: '이 색으로 그리기', exact: true }).click();
    await historyToolsClosed(page);
    await forwardDoesNotOpenTools(page, `${out}/explicit-close-forward-${side}-${width}.png`);

    await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
    await page.getByRole('button', { name: '빨강 선택', exact: true }).click();
    await page.goBack(); await historyToolsClosed(page);
    await forwardDoesNotOpenTools(page, `${out}/back-close-forward-${side}-${width}.png`);

    const frame = await page.locator('.drawing-frame').boundingBox();
    const start = { x: Math.min(width - 2, frame.x + frame.width - 3), y: frame.y + frame.height / 2 };
    assert.ok(start.x >= width - 24, 'exercise the physical screen-edge gesture zone');
    await page.evaluate(() => {
      window.canvasEdgeTouches = [];
      document.addEventListener('touchstart', event => {
        if (event.target instanceof HTMLCanvasElement) window.canvasEdgeTouches.push(event.defaultPrevented);
      }, { passive: true });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - step * 10, y: start.y + step, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    assert.equal(await page.evaluate(() => window.canvasEdgeTouches.at(-1)), true, 'editing edge touch must cancel native navigation before the swipe');
    const canvas = page.getByLabel(side === 'left' ? '왼쪽 반쪽 그림 그리기' : '오른쪽 반쪽 그림 그리기', { exact: true });
    assert.equal(await canvas.evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, 800, 500).data.some((value, index) => index % 4 === 3 && value > 0)), true, 'edge swipe produces ink');
    assert.equal(await page.getByRole('dialog', { name: '그림 도구', exact: true }).count(), 0);
    await page.screenshot({ path: `${out}/edge-stroke-${side}-${width}.png` });

    // Back must still close tools, then the large drawing view.
    await page.getByRole('button', { name: '굵기 · 더 많은 도구', exact: true }).click();
    await page.goBack(); await historyToolsClosed(page);
    assert.equal(await page.locator('.drawing-expanded').count(), 1);
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('.drawing-expanded'));
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${side}/${width}: dismissed-tool Forward ignored, edge swipe draws, layered Back and scroll unlock PASS`);
  }
} finally { await browser.close(); }
