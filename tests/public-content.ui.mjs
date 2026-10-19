import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/content');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const routes = ['/guide', '/examples', '/examples/cat', '/examples/robot', '/examples/flower', '/about', '/privacy'];
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 }, isMobile: width < 640, hasTouch: width < 640 });
    let external = 0;
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === base) return route.continue();
      external++; return route.abort();
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('link', { name: '이용 가이드 읽기' }).click();
    await page.getByRole('heading', { level: 1, name: '처음이어도, 반쪽이면 충분해요' }).waitFor();
    for (const route of routes) {
      assert.equal((await page.goto(`${base}${route}`)).status(), 200);
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${route} ${width}`);
      assert.equal(await page.getByRole('navigation', { name: '그리기 안내', exact: true }).getByRole('link', { name: '이용 가이드', exact: true }).count(), 1);
      assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
      assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname, route);
      assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).length > 20);
      if (route.startsWith('/examples/')) {
        const figure = page.locator('figure');
        const before = await figure.boundingBox();
        await page.getByRole('button', { name: '친구의 화면', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: '친구의 화면', exact: true }).getAttribute('aria-pressed'), 'true');
        const svg = figure.getByRole('img');
        assert.match(await svg.getAttribute('aria-label'), /경계 힌트와 빈 오른쪽/);
        const clip = svg.locator('clipPath').last().locator('rect');
        assert.equal(await clip.getAttribute('x'), '376'); assert.equal(await clip.getAttribute('width'), '24');
        await page.screenshot({ path: `${out}/${route.split('/').pop()}-hint-${width}.png`, fullPage: true });
        await page.getByRole('button', { name: '완성 예시', exact: true }).click();
        assert.match(await svg.getAttribute('aria-label'), /완성 그림/);
        const after = await figure.boundingBox();
        assert.equal(before.width, after.width); assert.equal(before.height, after.height, 'preview switches without layout shift');
        for (const button of await figure.getByRole('button').all()) assert.ok((await button.boundingBox()).height >= 44);
        await page.getByRole('button', { name: '내 반쪽', exact: true }).click();
      }
      if (route === '/privacy') assert.equal(await page.locator('main a[href="mailto:dhfak1@gmail.com"]').count(), 3);
      if (route === '/guide') {
        await page.getByRole('link', { name: '자주 묻는 질문', exact: true }).click();
        const summary = page.locator('summary').last(); await summary.click();
        assert.equal(await summary.evaluate(el => el.parentElement.open), true);
      }
      await page.screenshot({ path: `${out}/${route.slice(1).replaceAll('/', '-')}-${width}.png`, fullPage: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${out}/${route.slice(1).replaceAll('/', '-')}-viewport-${width}.png` });
    }
    await page.goto(base); await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: '모든 예시 보기' }).click();
    await page.getByRole('heading', { name: '무엇을 그릴지 망설여질 때' }).waitFor();
    const card = page.locator('main a[href="/examples/robot"]');
    if (width === 1440) {
      await card.hover();
      await page.waitForTimeout(180);
      assert.notEqual(await card.evaluate(el => getComputedStyle(el).transform), 'none');
      await page.screenshot({ path: `${out}/example-card-hover-desktop.png` });
    }
    await card.focus();
    assert.equal(await card.evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { level: 1, name: '각자의 기능을 가진 로봇' }).waitFor();
    assert.equal(external, 0, 'public content makes no authentication, database or advertising requests');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Public content, previews and navigation: ${width}px passed`);
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(`${base}${route}`);
    assert.ok((await page.locator('main').innerText()).length > 400, `server-rendered article ${route}`);
  }
  const sitemap = await (await context.request.get(`${base}/sitemap.xml`)).text();
  for (const route of routes) assert.ok(sitemap.includes(`${route}</loc>`));
  assert.equal(sitemap.includes('/rooms/'), false); assert.equal(sitemap.includes('/library'), false);
  assert.match(await (await context.request.get(`${base}/robots.txt`)).text(), /Allow: \/[\s\S]*Sitemap: https:\/\//);
  assert.equal((await context.request.get(`${base}/examples/unknown-example`)).status(), 404);
  await context.close(); console.log('Server rendering, sitemap, robots and unknown example 404 passed');
} finally { await browser.close(); }
