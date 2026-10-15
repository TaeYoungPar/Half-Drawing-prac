import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/mobile');
fs.mkdirSync(out, { recursive: true });
async function settled(page, kind, present) {
  await page.waitForFunction(({ kind, present }) => (history.state?.halfDrawingOverlays || []).some(entry => entry.kind === kind) === present, { kind, present });
}
async function openDrawing(page) {
  await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
  assert.equal(await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).count(), 0, 'new drawing and normal-view reload must stay in normal view');
  assert.equal(await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
}
async function closeTools(page) {
  await page.getByRole('button', { name: '그림 도구 닫기', exact: true }).click();
  await settled(page, '그림 도구', false);
}
async function ink(page) {
  return page.getByLabel('왼쪽 반쪽 그림 그리기').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, 400, 500).data;
    return Array.from({ length: pixels.length / 4 }, (_, i) => pixels[i * 4 + 3] > 0 && pixels.slice(i * 4, i * 4 + 3).some(c => c < 255)).some(Boolean);
  });
}
async function swipe(context, page, x, y, dx, dy) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  const results = [];
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true });
    await mock(context, hostId);
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('link', { name: '그림 시작하기', exact: false }).first().click();
    await openDrawing(page);
    await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor();
    const stage = page.locator('.drawing-frame');
    const first = await stage.boundingBox();
    await page.screenshot({ path: `${out}/default-drawing-${width}.png` });
    assert.ok(first.height >= 350, 'explicit large view shows the larger active half');
    await page.getByText('굵기 · 더 많은 도구').click();
    await page.getByRole('dialog', { name: '그림 도구', exact: true }).waitFor();
    assert.equal(Math.round((await stage.boundingBox()).height), Math.round(first.height), 'tool sheet must not resize canvas');
    await page.getByRole('button', { name: '펜 굵기 얇게', exact: true }).click();
    await page.getByRole('button', { name: '펜 굵기 늘리기', exact: true }).click();
    assert.equal(await page.getByRole('slider', { name: '펜 굵기', exact: true }).inputValue(), '3');
    await page.getByRole('button', { name: '펜 굵기 줄이기', exact: true }).click();
    await page.getByRole('button', { name: '지우개 굵기 굵게', exact: true }).click();
    assert.equal(await page.getByRole('slider', { name: '펜 굵기', exact: true }).inputValue(), '2');
    assert.equal(await page.getByRole('slider', { name: '지우개 굵기', exact: true }).inputValue(), '30');
    await page.screenshot({ path: `${out}/tools-${width}.png` });
    // Native Back closes settings, then the drawing view, then the route.
    await page.goBack(); await settled(page, '그림 도구', false);
    await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/draw');
    await page.goBack(); await settled(page, 'drawing', false);
    assert.equal(new URL(page.url()).pathname, '/draw');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.goBack(); await page.waitForURL(base + '/');
    await page.getByRole('link', { name: '그림 시작하기', exact: false }).first().click();
    await openDrawing(page);
    await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor();
    await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
    await page.getByRole('button', { name: '보라 선택', exact: true }).click(); await settled(page, '그림 도구', false);
    let box = await stage.boundingBox();
    await page.touchscreen.tap(box.x + box.width * .25, box.y + box.height * .5);
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(b => b.textContent === '다 그렸어요').disabled);
    assert.equal(await ink(page), true);
    await page.getByRole('button', { name: '다 그렸어요', exact: true }).click(); await settled(page, 'drawing', false);
    await page.waitForFunction(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) <= 2);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '그림 주제와 등록', 'review receives focus without opening the keyboard');
    const reviewSubmit = await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).boundingBox();
    assert.ok(reviewSubmit.y >= 0 && reviewSubmit.y + reviewSubmit.height <= 741, 'finish scrolls to the bottom with registration visible');
    await page.screenshot({ path: `${out}/finish-scroll-bottom-${width}.png` });
    await page.getByLabel('그림 주제', { exact: true }).fill('설정과 그림 복원');
    await page.setViewportSize({ width, height: 400 });
    await page.getByLabel('그림 주제', { exact: true }).scrollIntoViewIfNeeded();
    const fieldBox = await page.getByLabel('그림 주제', { exact: true }).boundingBox();
    assert.ok(fieldBox.y >= 0 && fieldBox.y + fieldBox.height <= 401, 'topic remains reachable in a keyboard-sized viewport');
    await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).scrollIntoViewIfNeeded();
    const submitBox = await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).boundingBox();
    assert.ok(submitBox.y >= 0 && submitBox.y + submitBox.height <= 401, 'submit remains reachable in a keyboard-sized viewport');
    await page.screenshot({ path: `${out}/small-input-viewport-${width}.png` });
    await page.setViewportSize({ width, height: 740 });
    await page.reload();
    await openDrawing(page);
    await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor();
    assert.equal(await ink(page), true);
    assert.equal(await page.locator('#room-prompt').inputValue(), '설정과 그림 복원');
    assert.equal(await page.getByRole('button', { name: '색상 팔레트', exact: true }).locator('span').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(147, 51, 234)');
    await page.getByText('굵기 · 더 많은 도구').click();
    assert.equal(await page.getByRole('slider', { name: '펜 굵기', exact: true }).inputValue(), '2');
    assert.equal(await page.getByRole('slider', { name: '지우개 굵기', exact: true }).inputValue(), '30');
    await closeTools(page);
    await page.getByRole('button', { name: '지우개', exact: true }).click();
    await page.reload(); await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '지우개', exact: true }).getAttribute('aria-pressed'), 'true');
    box = await stage.boundingBox();
    await page.touchscreen.tap(box.x + box.width * .25, box.y + box.height * .5);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent === '다 그렸어요').disabled);
    assert.equal(await ink(page), false);
    await page.getByRole('button', { name: '그리기 화면으로 돌아가기', exact: true }).click(); await settled(page, 'drawing', false);
    assert.equal(await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).isEnabled(), false);
    await page.getByRole('status').filter({ hasText: '남은 그림이 없어요' }).waitFor();
    // White paint on a white export must also remain empty.
    await page.getByRole('button', { name: '펜', exact: true }).click();
    await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
    await page.getByLabel('직접 고르기').evaluate(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '#ffffff'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await closeTools(page);
    const canvas = page.getByLabel('왼쪽 반쪽 그림 그리기'); await canvas.scrollIntoViewIfNeeded(); box = await canvas.boundingBox();
    await page.touchscreen.tap(box.x + box.width * .25, box.y + box.height * .25);
    assert.equal(await ink(page), false);
    assert.equal(await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).isEnabled(), false);
    assert.equal(fixture.writes, 0, 'blank drawings never reach RPC');
    await page.screenshot({ path: `${out}/blank-blocked-${width}.png`, fullPage: true });
    // Gray half scrolls the document without leaving a stroke.
    await canvas.scrollIntoViewIfNeeded();box = await canvas.boundingBox();
    const before = await page.evaluate(() => ({ y: scrollY, n: JSON.parse(localStorage.getItem('half-drawing:draft:left')).strokes.length }));
    await swipe(context, page, box.x + box.width * .75, box.y + box.height * .8, 0, -90);
    await page.waitForFunction(y => scrollY > y, before.y);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('half-drawing:draft:left')).strokes.length), before.n);
    await canvas.scrollIntoViewIfNeeded();const edge=await canvas.boundingBox();
    const seamBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('half-drawing:draft:left')).strokes.length);
    await page.touchscreen.tap(edge.x+edge.width/2,edge.y+edge.height/2);
    await page.waitForFunction(n=>JSON.parse(localStorage.getItem('half-drawing:draft:left')).strokes.length>n,seamBefore);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    results.push(`${width}px: normal default and explicit large view, stable canvas under tool sheet, presets/steps, layered Back, settings/draft reload, erased/white blank guard, gray-half touch scroll PASS`);
    await context.close();
  }
  fs.writeFileSync(`${out}/mobile-results.txt`, results.join('\n') + '\n');console.log(results.join('\n'));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
