import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId } from './browser-fixtures.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/header-layout');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const measurements = [];
async function check(page, width) {
  const result = await page.locator('.site-header').evaluate(header => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { height: header.getBoundingClientRect().height, brand: rect(header.querySelector('.brand-title')), language: rect(header.querySelector('.language-switcher')), menu: [...header.querySelectorAll('.nav-sticker')].map(rect), targets: [...header.querySelectorAll('a, button')].map(rect), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const first = result.menu[0], last = result.menu.at(-1);
  assert.ok(Math.abs((first.x + last.right) / 2 - width / 2) < 1, 'menu stays centered in the viewport');
  assert.ok(result.menu.every(item => Math.abs(item.y - first.y) < 1), 'all three links stay on one row');
  assert.equal(result.overflow, false);
  assert.ok(result.targets.every(item => item.width >= 43.9 && item.height >= 43.9), 'header controls keep 44px touch targets');
  if (width < 768) {
    assert.ok(result.menu.every(item => Math.abs(item.width - first.width) < 1), 'mobile menu has balanced equal widths');
    assert.ok(result.height <= 120, 'mobile header stays compact');
    assert.ok(result.brand.right + 8 <= result.language.x, 'brand and language control do not overlap');
    assert.ok(first.y >= result.language.bottom + 4, 'menu sits below the top row');
  } else {
    assert.ok(result.height <= 80, 'desktop header stays on one compact row');
    assert.ok(result.brand.right + 8 <= first.x && last.right + 8 <= result.language.x, 'desktop brand, menu and language remain separated');
    assert.ok(Math.abs(result.language.y + result.language.height / 2 - (first.y + first.height / 2)) < 1);
  }
  return result;
}
try {
  for (const locale of ['ko-KR', 'en-US']) for (const width of [320, 360, 390, 430, 640, 767, 768, 820, 1024, 1440]) {
    const context = await browser.newContext({ locale, viewport: { width, height: width === 320 ? 740 : width < 768 ? 844 : 1000 } });
    await mock(context, hostId);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(base);
      await page.waitForFunction(language => document.documentElement.lang === language, locale.slice(0, 2));
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.home-hero img').evaluate(i => i.decode());
      const home = await check(page, width);
      if ([320, 390, 768, 1440].includes(width)) await page.screenshot({ path: `${out}/home-${locale}-${width}.png` });
      const nav = page.locator('.site-navigation');
      await nav.locator('a[href="/library"]').click();
      await nav.locator('a[href="/library"][aria-current="page"]').waitFor();
      assert.equal((await check(page, width)).height, home.height, 'same header height in the gallery');
      await nav.locator('a[href="/join"]').focus();
      await page.keyboard.press('Enter');
      await nav.locator('a[href="/join"][aria-current="page"]').waitFor();
      await check(page, width);
      await page.locator('.site-brand').click();
      await page.locator('#home-heading').waitFor();
      await nav.locator('a[href="/"][aria-current="page"]').waitFor();
      measurements.push({ locale, width, ...home });
      assert.deepEqual(errors, []);
      console.log(`${locale} ${width}px: centered menu, compact spacing, 44px targets, no overlap, gallery/join/home navigation PASS`);
    } finally { await context.close(); }
  }
  fs.writeFileSync(`${out}/measurements.json`, JSON.stringify(measurements, null, 2));
} finally { await browser.close(); }
