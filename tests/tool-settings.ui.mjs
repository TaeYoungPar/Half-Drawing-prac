import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/tools');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
async function navSizes(page) {
  return page.locator('.nav-sticker').evaluateAll(links => links.map(link => {
    const box = link.getBoundingClientRect(), style = getComputedStyle(link);
    return { width: box.width, height: box.height, font: style.fontSize, padding: style.padding };
  }));
}
async function brandSize(page) {
  const box = await page.locator('.brand-title').boundingBox();
  return { width: box.width, height: box.height };
}
async function closeTools(page) {
  await page.getByRole('button', { name: '그림 도구 닫기', exact: true }).click();
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
}
function sameRect(a, b) {
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(a[key] - b[key]) < 1, `dialog ${key} must stay stable: ${a[key]} vs ${b[key]}`);
}
try {
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width !== 1440, hasTouch: width !== 1440 });
    await mock(context, guestId);
    const page = await context.newPage();
    await page.goto(base);
    const expectedNav = await navSizes(page);
    const expectedBrand = await brandSize(page);
    await page.getByRole('link', { name: '그림 시작하기', exact: false }).first().click();
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.deepEqual(await navSizes(page), expectedNav, 'drawing menu dimensions match home');
    assert.deepEqual(await brandSize(page), expectedBrand, 'drawing brand dimensions match home');
    await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
    const canvasBefore = await page.locator('.drawing-frame').boundingBox();
    await page.getByRole('button', { name: '굵기 · 더 많은 도구', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '그림 도구', exact: true });
    const tabs = dialog.getByRole('group', { name: '도구 설정 선택', exact: true });
    assert.deepEqual(await tabs.getByRole('button').allTextContents(), ['색상', '굵기 · 작업']);
    const color = tabs.getByRole('button', { name: '색상', exact: true });
    const work = tabs.getByRole('button', { name: '굵기 · 작업', exact: true });
    const colors = await color.boundingBox(), widths = await work.boundingBox();
    assert.ok(Math.abs(colors.width - widths.width) < 1 && colors.height === widths.height, 'tabs have identical sizes');
    const original = await dialog.boundingBox();
    assert.equal(await dialog.getByRole('slider').count(), 1);
    const pen = dialog.getByRole('slider', { name: '펜 굵기', exact: true });
    await pen.focus(); await pen.press('Home'); await pen.press('ArrowRight');
    await color.click();
    sameRect(original, await dialog.boundingBox());
    assert.ok((await color.boundingBox()).x < (await work.boundingBox()).x);
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${out}/color-${width}x${height}.png` });
    await work.click();
    await dialog.getByRole('button', { name: '지우개 굵기 선택', exact: true }).click();
    assert.equal(await dialog.getByRole('slider').count(), 1);
    const eraser = dialog.getByRole('slider', { name: '지우개 굵기', exact: true });
    assert.equal(await eraser.inputValue(), '16');
    await eraser.focus(); await eraser.press('End');
    assert.equal(await color.isDisabled(), true);
    assert.equal(await dialog.getByRole('button', { name: '지우개 굵기 선택', exact: true }).getAttribute('aria-pressed'), 'true');
    sameRect(original, await dialog.boundingBox());
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${out}/eraser-${width}x${height}.png` });
    await dialog.getByRole('button', { name: '펜 굵기 선택', exact: true }).click();
    assert.equal(await dialog.getByRole('slider', { name: '펜 굵기', exact: true }).inputValue(), '2');
    assert.equal(await dialog.getByRole('slider', { name: '지우개 굵기', exact: true }).count(), 0);
    assert.equal(await dialog.getByRole('button', { name: '펜 굵기 선택', exact: true }).getAttribute('aria-pressed'), 'true');
    sameRect(original, await dialog.boundingBox());
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${out}/pen-${width}x${height}.png` });
    await closeTools(page);
    sameRect(canvasBefore, await page.locator('.drawing-frame').boundingBox());
    await page.getByRole('button', { name: '지우개', exact: true }).click();
    await page.getByRole('button', { name: '굵기 · 더 많은 도구', exact: true }).click();
    assert.equal(await dialog.getByRole('slider', { name: '지우개 굵기', exact: true }).inputValue(), '30');
    assert.equal(await dialog.getByRole('slider', { name: '펜 굵기', exact: true }).count(), 0, 'opening settings follows the active external tool');
    await closeTools(page);
    await page.getByRole('button', { name: '그리기 화면으로 돌아가기', exact: true }).click();
    await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === 'drawing'));

    fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: '버튼과 도구 크기 확인', host_id: hostId, guest_id: guestId, status: 'guest_joined', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [{ role: 'left', strokes: [], completed: true }] };
    await page.goto(`${base}/rooms/${roomId}`);
    await page.getByRole('heading', { name: '이어 그리기', exact: true }).waitFor();
    assert.deepEqual(await navSizes(page), expectedNav, 'joined-room menu dimensions match home');
    assert.deepEqual(await brandSize(page), expectedBrand, 'joined-room brand dimensions match home');
    fixture.room.status = 'completed';
    fixture.room.drawings.push({ role: 'right', strokes: [], completed: true });
    await page.reload();
    await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
    assert.deepEqual(await navSizes(page), expectedNav, 'completed-room menu dimensions match home');
    assert.deepEqual(await brandSize(page), expectedBrand, 'completed-room brand dimensions match home');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${out}/completed-${width}x${height}.png`, fullPage: true });
    console.log(`${width}x${height}: identical navigation, color-left tabs, stable dialog/canvas, active-tool-only width and independent preferences PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
