import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId, fixture } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/colors');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const settings = page => page.evaluate(() => JSON.parse(localStorage.getItem('half-drawing:tool-settings')));
async function closed(page) {
  await page.getByRole('dialog', { name: '그림 도구', exact: true }).waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
}
async function paint(page) {
  const canvas = page.getByLabel('왼쪽 반쪽 그림 그리기');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * .25, box.y + box.height * .5);
}
try {
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width !== 1440, hasTouch: width !== 1440 });
    await mock(context, hostId);
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
    const palette = page.getByRole('button', { name: '색상 팔레트', exact: true });
    const dialog = page.getByRole('dialog', { name: '그림 도구', exact: true });
    const recent = dialog.getByRole('group', { name: '최근 사용한 색', exact: true });
    const tabs = dialog.getByRole('group', { name: '도구 설정 선택', exact: true });
    await palette.click();
    const initial = await dialog.boundingBox();
    assert.ok(initial.height <= 540 && initial.y >= 0 && initial.y + initial.height <= height);
    const quick = dialog.getByRole('group', { name: '빠른 색상 선택', exact: true });
    assert.equal(await quick.getByRole('button').count(), 12);
    for (const button of await quick.getByRole('button').all()) {
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, 'all preset targets are at least 44px');
    }
    assert.equal(await recent.getByRole('button').count(), 0);
    await recent.getByText('선으로 그린 색이 여기에 모여요.', { exact: true }).waitFor();
    await page.screenshot({ path: `${out}/empty-${width}x${height}.png` });
    for (const name of ['검정', '빨강', '노랑', '초록', '파랑', '보라', '살구', '분홍', '연노랑', '민트', '하늘', '라벤더']) {
      const choice = quick.getByRole('button', { name: `${name} 선택`, exact: true });
      await choice.click();
      assert.equal(await dialog.isVisible(), true, 'all twelve choices keep the preview open');
      assert.equal(await choice.getAttribute('aria-pressed'), 'true');
      const selected = (await settings(page)).strokeColor;
      const line = dialog.getByRole('img');
      assert.equal(await line.getAttribute('data-color'), selected);
      const lineBox = await line.boundingBox(), actionBox = await dialog.getByRole('button', { name: '이 색으로 그리기', exact: true }).boundingBox();
      assert.ok(lineBox.y >= initial.y && lineBox.y + lineBox.height <= initial.y + initial.height, 'preview stays visible after scrolling to a color');
      assert.ok(actionBox.y >= 0 && actionBox.y + actionBox.height <= height, 'drawing action stays visible');
    }

    await tabs.getByRole('button', { name: '굵기 · 작업', exact: true }).click();
    await dialog.getByRole('button', { name: '펜 굵기 굵게', exact: true }).click();
    await tabs.getByRole('button', { name: '색상', exact: true }).click();
    const box = await dialog.boundingBox();
    assert.deepEqual(box, initial, 'tab switching keeps the shorter dialog stable');
    await dialog.getByLabel('직접 고르기', { exact: true }).evaluate(input => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#1284ab');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const preview = dialog.getByRole('img', { name: '#1284ab 색상, 펜 굵기 12 선 미리보기', exact: true });
    await preview.waitFor();
    assert.equal(await preview.locator('path').getAttribute('stroke'), '#1284ab');
    assert.equal(await preview.locator('path').getAttribute('stroke-width'), '12');
    assert.equal(await recent.getByRole('button').count(), 0, 'selecting without drawing does not record usage');
    await dialog.getByRole('button', { name: '이 색으로 그리기', exact: true }).click(); await closed(page);
    await paint(page);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('half-drawing:tool-settings')).recentColors[0] === '#1284ab');

    for (const name of ['빨강', '노랑', '초록', '파랑', '민트']) {
      await palette.click();
      await quick.getByRole('button', { name: `${name} 선택`, exact: true }).click();
      assert.equal(await dialog.isVisible(), true);
      await dialog.getByRole('button', { name: '이 색으로 그리기', exact: true }).click();
      await closed(page);
      await paint(page);
    }
    await palette.click();
    const expected = ['#a8d5ba', '#2563eb', '#16a34a', '#f59e0b', '#dc2626'];
    assert.deepEqual((await settings(page)).recentColors, expected);
    assert.equal(await recent.getByRole('button').count(), 5);
    assert.deepEqual(await recent.getByRole('button').evaluateAll(buttons => buttons.map(button => button.title)), expected);
    for (const button of await recent.getByRole('button').all()) {
      const target = await button.boundingBox(); assert.ok(target.width >= 44 && target.height >= 44);
    }
    await dialog.getByRole('img', { name: '#a8d5ba 색상, 펜 굵기 12 선 미리보기', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/recent-${width}x${height}.png` });
    await recent.getByRole('button', { name: '최근 색 #dc2626 선택', exact: true }).click();
    assert.equal(await dialog.isVisible(), true, 'recent color also keeps the preview open');
    assert.equal(await dialog.getByRole('img').getAttribute('data-color'), '#dc2626');
    await page.screenshot({ path: `${out}/selected-${width}x${height}.png` });
    await dialog.getByRole('button', { name: '이 색으로 그리기', exact: true }).click(); await closed(page);
    assert.deepEqual((await settings(page)).recentColors, expected, 'picking a recent color alone keeps usage order');
    await paint(page);
    const promoted = ['#dc2626', '#a8d5ba', '#2563eb', '#16a34a', '#f59e0b'];
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('half-drawing:tool-settings')).recentColors[0] === '#dc2626');
    await page.getByRole('button', { name: '지우개', exact: true }).click();
    await paint(page);
    assert.deepEqual((await settings(page)).recentColors, promoted, 'erasing does not add a color');
    await page.getByRole('button', { name: '펜', exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    await palette.click();
    assert.deepEqual((await settings(page)).recentColors, promoted, 'recent colors survive reload');
    assert.equal(await recent.getByRole('button').count(), 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(fixture.writes, 0, 'palette changes and local painting do not submit drawings');
    await page.screenshot({ path: `${out}/restored-${width}x${height}.png` });
    console.log(`${width}x${height}: 12 colors, real stroke preview, five actual-use colors, dedup/order, eraser isolation, reload and stable compact dialog PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
