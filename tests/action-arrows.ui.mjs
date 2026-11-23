import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/action-arrows');
fs.mkdirSync(out, { recursive: true });
const engines = [['chromium', chromium, { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }]];
if (fs.existsSync(webkit.executablePath())) engines.push(['webkit', webkit, {}]);
const measurements = [];
async function geometry(page, name, underlined = false) {
  const control = page.getByRole('link', { name, exact: true });
  await control.scrollIntoViewIfNeeded();
  const metrics = await control.evaluate(element => {
    const row = element.querySelector('.action-text');
    if (!row) return { missing: true };
    const label = row.querySelector('.action-text-label'), arrow = row.querySelector('.action-arrow');
    const a = arrow.getBoundingClientRect(), l = label.getBoundingClientRect();
    return {
      gap: a.left >= l.right ? a.left - l.right : l.left - a.right,
      centerOffset: Math.abs((a.top + a.height / 2) - (l.top + l.height / 2)),
      iconWidth: a.width, labelSize: parseFloat(getComputedStyle(label).fontSize),
      arrowDecoration: getComputedStyle(arrow).textDecorationLine,
      linkDecoration: getComputedStyle(element).textDecorationLine,
      labelDecoration: getComputedStyle(label).textDecorationLine,
      svg: arrow.querySelectorAll('svg').length,
    };
  });
  assert.ok(!metrics.missing, `${name}: one label/icon row is present`);
  assert.ok(metrics.gap >= 5.5 && metrics.gap <= 6.5, `${name}: stable 6px spacing (${metrics.gap})`);
  assert.ok(metrics.centerOffset <= 1, `${name}: vertically centered (${metrics.centerOffset})`);
  assert.ok(Math.abs(metrics.iconWidth - metrics.labelSize) < .1, "icon tracks the inherited font size within browser subpixel rounding");
  assert.equal(metrics.svg, 1);
  assert.equal(metrics.arrowDecoration, 'none');
  assert.equal(metrics.linkDecoration, 'none');
  if (underlined) assert.equal(metrics.labelDecoration, 'underline');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  measurements.push({ name, ...metrics });
  return control;
}
for (const [engine, type, launch] of engines) {
  const browser = await type.launch(launch);
  try {
    for (const locale of ['ko-KR', 'en-US']) for (const width of [320, 390, 430, 1440]) {
      const context = await browser.newContext({ locale, viewport: { width, height: width < 640 ? 844 : 1000 }, deviceScaleFactor: width < 640 ? 2 : 1 });
      await mock(context, hostId);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /hydration|hydrated|Minified React error/i.test(message.text())) errors.push(message.text()); });
      try {
        const ko = locale.startsWith('ko');
        await page.goto(base);
        await page.waitForFunction(language => document.documentElement.lang === language, ko ? 'ko' : 'en');
        await page.locator('.home-hero img').evaluate(image => image.decode());
        const example = await geometry(page, ko ? '친구 없이 예시 먼저 보기' : 'Explore an example first', true);
        const before = await example.boundingBox();
        await example.hover();
        assert.equal(await example.locator('.action-text-label').evaluate(e => getComputedStyle(e).textDecorationThickness), '2px');
        assert.deepEqual(await example.boundingBox(), before, 'hover does not shift the link');
        await page.keyboard.press('Tab'); await example.focus();
        assert.equal(await example.evaluate(e => e.matches(':focus-visible')), true);
        assert.ok(before.height >= 44, 'mobile target stays at least 44px');
        await page.locator('.home-hero').screenshot({ path: `${out}/home-${engine}-${ko ? 'ko' : 'en'}-${width}.png` });
        await geometry(page, ko ? '참여 코드 입력하기' : 'Enter invitation code');
        await geometry(page, ko ? '오늘의 주제로 그리기 ↗' : "Draw today's topic ↗");
        await geometry(page, ko ? '모든 예시 보기 ↗' : 'All examples ↗', true);
        await example.click();
        await page.getByRole('heading', { name: ko ? '서로 다른 표정의 고양이' : 'A cat with two expressions', exact: true }).waitFor();
        const back = await geometry(page, ko ? '← 다른 주제의 예시 보기' : '← Explore other examples', true);
        await back.screenshot({ path: `${out}/back-${engine}-${ko ? 'ko' : 'en'}-${width}.png` });
        await back.click();
        await page.getByRole('heading', { level: 1, name: ko ? '무엇을 그릴지 망설여질 때' : 'Not sure what to draw?' }).waitFor();
        await page.goto(`${base}/guide`);
        const guide = await geometry(page, ko ? '주제별 예시 보기 ↗' : 'Explore drawing examples ↗', true);
        await guide.screenshot({ path: `${out}/guide-${engine}-${ko ? 'ko' : 'en'}-${width}.png` });
        await guide.click();
        await page.getByRole('heading', { level: 1, name: ko ? '무엇을 그릴지 망설여질 때' : 'Not sure what to draw?' }).waitFor();
        assert.deepEqual(errors, []);
        console.log(`${engine} ${locale} ${width}px: alignment, spacing, label-only underline, hover/focus and navigation PASS`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
fs.writeFileSync(`${out}/measurements.json`, JSON.stringify(measurements, null, 2));
