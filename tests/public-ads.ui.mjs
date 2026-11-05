import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/public-ads');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
// No live Google requests or impressions. Exercise the app's lifecycle with a fixture.
const script = `window.__adPushes = 0; window.adsbygoogle = { push() {
  window.__adPushes++;
  const slot = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
  if (!slot) throw new Error('Duplicate ad request');
  slot.dataset.adsbygoogleStatus = 'done'; slot.dataset.adStatus = 'filled';
  const frame = document.createElement('iframe');
  frame.title = '테스트 광고'; frame.style.cssText = 'width:100%;height:100px;border:0;display:block';
  frame.srcdoc = '<body style="margin:0;background:#f1f1f1;color:#555;font:13px sans-serif;display:grid;place-content:center;height:100vh">테스트 광고 · 실제 광고 요청 없음</body>';
  slot.append(frame);
} };`;

async function setup(width, behavior = 'filled') {
  const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 }, hasTouch: width < 640, isMobile: width < 640 });
  await mock(context, hostId);
  let loads = 0;
  await context.route('https://pagead2.googlesyndication.com/**', async route => {
    loads++;
    if (behavior === 'blocked') return route.abort();
    const body = behavior === 'unfilled' ? script.replace("slot.dataset.adStatus = 'filled'", "slot.dataset.adStatus = 'unfilled'") : script;
    return route.fulfill({ contentType: 'application/javascript', body });
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  return { context, page, errors, loads: () => loads };
}

try {
  for (const width of [320, 390, 1440]) {
    const t = await setup(width);
    await t.page.goto(`${base}/guide`);
    const banner = t.page.getByRole('complementary', { name: '광고', exact: true });
    await banner.waitFor({ state: 'attached' });
    await t.page.waitForTimeout(400);
    assert.equal(t.loads(), 0, 'no ad request before reaching the bottom');
    assert.equal(await t.page.locator('ins.adsbygoogle').count(), 1);
    const reservedHeight = await banner.evaluate(el => el.getBoundingClientRect().height);
    const cta = t.page.getByRole('link', { name: '그림 시작하기', exact: true });
    const ctaBottom = await cta.evaluate(el => el.getBoundingClientRect().bottom + scrollY);
    await banner.scrollIntoViewIfNeeded();
    await t.page.locator('ins.adsbygoogle[data-ad-status="filled"]').waitFor();
    const before = await banner.boundingBox();
    assert.equal(before.height, reservedHeight, 'filling the reserved slot does not move content');
    assert.equal(await banner.locator('ins').getAttribute('data-ad-client'), 'ca-pub-6008052842325785');
    assert.equal(await banner.locator('ins').getAttribute('data-ad-slot'), '9331445471');
    assert.equal(await banner.locator('ins').getAttribute('data-ad-format'), 'horizontal');
    assert.equal(await banner.locator('ins').getAttribute('data-full-width-responsive'), 'false');
    assert.equal(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok(await banner.evaluate(el => el.getBoundingClientRect().top + scrollY) - ctaBottom >= 48);
    assert.equal(await banner.locator('ins').evaluate(el => el.getBoundingClientRect().height), 100);
    await t.page.waitForTimeout(250);
    assert.equal(await t.page.evaluate(() => window.__adPushes), 1);
    assert.equal((await banner.boundingBox()).height, before.height);
    await t.page.screenshot({ path: `${out}/guide-bottom-${width}.png` });
    await t.page.evaluate(() => { window.__adDocumentMarker = 'same-public-document'; });
    await t.page.getByRole('navigation', { name: '그리기 안내', exact: true }).getByRole('link', { name: '그리기 예시', exact: true }).click();
    await t.page.getByRole('heading', { level: 1, name: '무엇을 그릴지 망설여질 때' }).waitFor();
    await t.page.locator('.ad-banner').scrollIntoViewIfNeeded();
    await t.page.locator('ins.adsbygoogle[data-ad-status="filled"]').waitFor();
    assert.equal(await t.page.evaluate(() => window.__adDocumentMarker), 'same-public-document');
    assert.equal(t.loads(), 1, 'one script reused across eligible public articles');
    assert.equal(await t.page.evaluate(() => window.__adPushes), 2, 'new article gets exactly one new request');
    for (const [kind, title] of [['cat', '서로 다른 표정의 고양이'], ['robot', '각자의 기능을 가진 로봇'], ['flower', '두 계절이 만나는 꽃']]) {
      await t.page.locator(`main a[href="/examples/${kind}"]`).first().click();
      await t.page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
      await t.page.locator('.ad-banner').scrollIntoViewIfNeeded();
      await t.page.locator('ins.adsbygoogle[data-ad-status="filled"]').waitFor();
      assert.equal(await t.page.locator('ins.adsbygoogle').count(), 1);
      await t.page.getByRole('link', { name: '← 다른 주제의 예시 보기', exact: true }).click();
      await t.page.getByRole('heading', { level: 1, name: '무엇을 그릴지 망설여질 때' }).waitFor();
    }
    await t.page.getByRole('link', { name: '그림 시작하기', exact: true }).click();
    await t.page.waitForURL('**/draw');
    await t.page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.equal(await t.page.evaluate(() => typeof window.adsbygoogle), 'undefined', 'Google runtime must not follow the user into the editor');
    assert.equal(await t.page.locator('script[src*="adsbygoogle"], ins.adsbygoogle, .ad-banner').count(), 0);
    assert.deepEqual(t.errors, []);
    await t.context.close();
    console.log(`${width}px: lazy horizontal slot, spacing, no overflow, one script, article navigation and clean editor document PASS`);
  }
  for (const behavior of ['blocked', 'unfilled']) {
    const t = await setup(390, behavior);
    await t.page.goto(`${base}/guide`);
    await t.page.locator('.ad-banner').scrollIntoViewIfNeeded();
    await t.page.locator('.ad-banner').waitFor({ state: 'hidden' });
    await t.page.getByRole('link', { name: '그림 시작하기', exact: true }).click();
    await t.page.waitForURL('**/draw');
    await t.page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.deepEqual(t.errors, []);
    await t.context.close();
    console.log(`${behavior}: ad collapses and drawing navigation stays usable PASS`);
  }
  const slow = await setup(390);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await slow.context.route('https://pagead2.googlesyndication.com/**', async route => {
    await pending;
    await route.fulfill({ contentType: 'application/javascript', body: script }).catch(() => {});
  });
  try {
    await slow.page.goto(`${base}/guide`);
    await slow.page.locator('.ad-banner').scrollIntoViewIfNeeded();
    await slow.page.locator('script[src*="adsbygoogle"]').waitFor({ state: 'attached' });
    await slow.page.evaluate(() => { window.__adDocumentMarker = 'old-document'; });
    await slow.page.getByRole('link', { name: '그림 시작하기', exact: true }).click();
    await slow.page.waitForURL('**/draw');
    await slow.page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.equal(await slow.page.evaluate(() => window.__adDocumentMarker), undefined);
    assert.equal(await slow.page.evaluate(() => typeof window.adsbygoogle), 'undefined');
    assert.equal(await slow.page.locator('script[src*="adsbygoogle"]').count(), 0);
  } finally {
    release();
    await slow.context.close();
  }
  console.log('Leaving during a pending Google script download also opens a clean editor document PASS');
  const t = await setup(390);
  await t.page.goto(base);
  await t.page.getByRole('link', { name: '이용 가이드 읽기', exact: true }).click();
  await t.page.locator('.ad-banner').scrollIntoViewIfNeeded();
  await t.page.locator('ins.adsbygoogle[data-ad-status="filled"]').waitFor();
  await t.page.goBack();
  await t.page.waitForURL(base + '/');
  await t.page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await t.page.evaluate(() => typeof window.adsbygoogle), 'undefined', 'Back to non-ad route reloads without Google runtime');
  assert.equal(await t.page.locator('.ad-banner, script[src*="adsbygoogle"]').count(), 0);
  await t.context.close();
  console.log('Back navigation to non-ad home uses a clean document PASS');
} finally { await browser.close(); }
