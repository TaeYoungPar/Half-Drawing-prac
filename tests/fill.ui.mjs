import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/fill');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
async function pixel(canvas, x, y) {
  return canvas.evaluate((canvas, { x, y }) => Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data), { x, y });
}
async function tap(page, canvas, x, y) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.touchscreen.tap(box.x + box.width * x / 800, box.y + box.height * y / 500);
}
async function chooseColor(page, color) {
  await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '그림 도구', exact: true });
  await dialog.getByRole('button', { name: `${color} 선택`, exact: true }).click();
  assert.equal(await dialog.isVisible(), true, 'color selection keeps the live preview visible');
  await dialog.getByRole('button', { name: /이 색으로 (그리기|채우기)/ }).click();
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
}
async function redo(page) {
  await page.getByRole('button', { name: '굵기 · 더 많은 도구', exact: true }).click();
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await page.getByRole('button', { name: '그림 도구 닫기', exact: true }).click();
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
}
try {
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000], [844, 390]].filter(([width]) => !process.env.TEST_FILL_WIDTH || width === Number(process.env.TEST_FILL_WIDTH))) {
    fixture.room = null; fixture.writes = 0;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width !== 1440, hasTouch: true });
    await mock(context, hostId);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/draw`);
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    const canvas = page.getByLabel('왼쪽 반쪽 그림 그리기', { exact: true });
    const buttons = await Promise.all(['펜', '지우개', '채우기', '마지막 작업 실행 취소', '색상 팔레트', '굵기 · 더 많은 도구'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
    if (width < 640) assert.ok(buttons.every(box => box.y === buttons[0].y), 'all six primary controls fit a single mobile row');
    assert.equal(buttons[0].width, buttons[1].width); assert.equal(buttons[1].width, buttons[2].width);
    assert.ok(buttons.every(box => box.width >= 44 && box.height >= 44));

    // Draw a closed outline through the actual pen pointer handlers.
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const position = (x, y) => [box.x + box.width * x / 800, box.y + box.height * y / 500];
    await page.mouse.move(...position(60, 80)); await page.mouse.down();
    for (const point of [[300, 80], [300, 360], [60, 360], [60, 80]]) await page.mouse.move(...position(...point), { steps: 16 });
    await page.mouse.up();
    await page.getByRole('button', { name: '채우기', exact: true }).click();
    await chooseColor(page, '빨강');
    await tap(page, canvas, 200, 200);
    assert.deepEqual(await pixel(canvas, 200, 200), [220, 38, 38, 255]);
    assert.equal((await pixel(canvas, 20, 20))[3], 0, 'closed outline contains the fill');
    assert.equal((await pixel(canvas, 600, 200))[3], 0, 'host cannot paint the other half');
    const bytes = await page.evaluate(() => localStorage.getItem('half-drawing:draft:left'));
    await tap(page, canvas, 200, 200);
    assert.equal(await page.evaluate(() => localStorage.getItem('half-drawing:draft:left')), bytes, 'same-color fill does not create an undo action');
    await page.getByRole('button', { name: '마지막 작업 실행 취소', exact: true }).click();
    assert.equal((await pixel(canvas, 200, 200))[3], 0, 'one undo removes the whole fill');
    await redo(page);
    assert.deepEqual(await pixel(canvas, 200, 200), [220, 38, 38, 255]);

    await page.getByRole('button', { name: '지우개', exact: true }).click();
    await tap(page, canvas, 200, 200);
    assert.equal((await pixel(canvas, 200, 200))[3], 0, 'eraser works on filled pixels');
    await page.getByRole('button', { name: '채우기', exact: true }).click();
    await tap(page, canvas, 200, 200);
    assert.deepEqual(await pixel(canvas, 200, 200), [220, 38, 38, 255], 'erased holes can be filled');
    assert.equal(await canvas.evaluate(canvas => canvas.getContext('2d').getImageData(190, 190, 21, 21).data.every((value, index) => value === [220, 38, 38, 255][index % 4])), true, 'refilling erased edges must not leave a pale ring');
    await chooseColor(page, '민트'); await tap(page, canvas, 20, 20);
    assert.deepEqual(await pixel(canvas, 20, 20), [168, 213, 186, 255]);
    assert.deepEqual(await pixel(canvas, 390, 200), [168, 213, 186, 255]);
    assert.deepEqual(await pixel(canvas, 200, 200), [220, 38, 38, 255], 'background fill preserves enclosed color');
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.equal(await page.getByRole('button', { name: '채우기', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await pixel(canvas, 20, 20), [168, 213, 186, 255]);
    assert.deepEqual(await pixel(canvas, 200, 200), [220, 38, 38, 255]);
    await page.getByRole('button', { name: '굵기 · 더 많은 도구', exact: true }).click();
    assert.equal(await page.getByRole('slider').count(), 0, 'fill does not show an irrelevant width slider');
    await page.screenshot({ path: `${out}/fill-settings-${width}.png` });
    await page.getByRole('button', { name: '채울 색 고르기', exact: true }).click();
    await page.getByRole('button', { name: '노랑 선택', exact: true }).click();
    await page.screenshot({ path: `${out}/fill-palette-${width}.png` });
    await page.getByRole('button', { name: '이 색으로 채우기', exact: true }).click();
    await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
    await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
    await tap(page, canvas, 200, 200);
    assert.deepEqual(await pixel(canvas, 200, 200), [245, 158, 11, 255], 'focused view uses the same bucket coordinates');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${out}/fill-focused-${width}.png` });
    await page.getByRole('button', { name: '다 그렸어요', exact: true }).click();
    await page.getByLabel('그림 주제', { exact: true }).fill('색으로 채운 우리 반쪽');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).click();
    await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor();
    assert.ok(fixture.room.drawings[0].strokes.some(stroke => stroke.tool === 'fill'));

    const guest = await browser.newContext({ viewport: { width, height }, isMobile: width !== 1440, hasTouch: true });
    await mock(guest, guestId);
    // Match the existing SQL RPC: only points/tool/color/width, no fill grouping ID.
    await guest.route('**/rest/v1/rpc/get_left_preview', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture.room.drawings[0].strokes.map(({ tool, color, lineWidth, points }) => ({ tool, color, lineWidth, points: points.filter(point => point.x >= 376 && point.x <= 400) })).filter(stroke => stroke.points.length)) }));
    const g = await guest.newPage();
    g.on('pageerror', error => errors.push(error.message));
    await g.goto(`${base}/join?code=ABC123DEF4`);
    await g.getByRole('button', { name: '이어 그리러 가기 →', exact: true }).click();
    const right = g.getByLabel('오른쪽 반쪽 그림 그리기', { exact: true });
    await right.waitFor();
    assert.deepEqual(await pixel(right, 390, 200), [168, 213, 186, 255], 'hint retains boundary fill color');
    assert.equal((await pixel(right, 200, 200))[3], 0, 'hidden host artwork is not downloaded');
    await g.getByRole('button', { name: '채우기', exact: true }).click();
    await chooseColor(g, '파랑'); await tap(g, right, 600, 200);
    assert.deepEqual(await pixel(right, 600, 200), [37, 99, 235, 255]);
    assert.deepEqual(await pixel(right, 390, 200), [168, 213, 186, 255], 'guest fill cannot alter the host hint');
    g.once('dialog', dialog => dialog.accept());
    await g.getByRole('button', { name: '이어 그리기 완료', exact: true }).click();
    await g.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
    const result = g.getByLabel('두 사람이 함께 완성한 그림', { exact: true });
    assert.deepEqual(await pixel(result, 200, 200), [245, 158, 11, 255]);
    assert.deepEqual(await pixel(result, 390, 200), [168, 213, 186, 255]);
    assert.deepEqual(await pixel(result, 600, 200), [37, 99, 235, 255]);
    const download = g.waitForEvent('download');
    await g.getByRole('button', { name: '완성 그림 PNG 저장', exact: true }).click();
    await (await download).saveAs(`${out}/filled-original-${width}.png`);
    await g.getByRole('button', { name: '공유 카드', exact: true }).click();
    await g.waitForFunction(() => document.querySelector('canvas[aria-label="완성 그림 공유 카드 미리보기"]')?.getAttribute('aria-busy') === 'false');
    const card = g.getByLabel('완성 그림 공유 카드 미리보기', { exact: true });
    assert.deepEqual(await pixel(card, 348, 522), [245, 158, 11, 255]);
    assert.deepEqual(await pixel(card, 852, 522), [37, 99, 235, 255]);
    await g.screenshot({ path: `${out}/filled-result-${width}.png`, fullPage: true });
    await g.getByRole('link', { name: '내 보관함으로', exact: true }).click();
    await g.locator('article').first().waitFor();
    await g.locator('article').first().scrollIntoViewIfNeeded();
    const thumbnail = g.getByAltText('색으로 채운 우리 반쪽 완성 그림 미리보기', { exact: true });
    await thumbnail.waitFor();
    const colors = await thumbnail.evaluate(async image => {
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return [80, 240].map(x => Array.from(ctx.getImageData(x, 80, 1, 1).data));
    });
    for (const [index, expected] of [[0, [245, 158, 11, 255]], [1, [37, 99, 235, 255]]]) {
      assert.ok(colors[index].every((value, channel) => Math.abs(value - expected[channel]) < 12), 'library WebP preserves both filled halves');
    }
    assert.deepEqual(errors, []);
    await guest.close(); await context.close();
    console.log(`${width}x${height}: closed/background/recolor fill, undo/redo, eraser, reload, focused touch, seam-only hint, guest/result/card/PNG PASS`);
  }
} finally { await browser.close(); }
