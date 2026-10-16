import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/share');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
try {
  const context = await browser.newContext(); await mock(context, hostId);
  const page = await context.newPage(); await page.goto(base);
  const pngSize = body => ({ width: body.readUInt32BE(16), height: body.readUInt32BE(20) });
  for (const route of ['/', '/join?code=ABC123DEF4', '/library']) {
    for (const userAgent of ['kakaotalk-scrap/1.0', 'facebookexternalhit/1.1', 'Twitterbot/1.0']) {
      const response = await context.request.get(base + route, { headers: { 'User-Agent': userAgent } });
      assert.equal(response.status(), 200);
      const tags = await page.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const meta = key => doc.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content;
        return { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), width: meta('og:image:width'), height: meta('og:image:height'), twitter: meta('twitter:card'), twitterImage: meta('twitter:image'), icon: doc.querySelector('link[rel="icon"][type="image/png"]')?.getAttribute('href'), apple: doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') };
      }, await response.text());
      assert.match(tags.title, /이어 그릴 수 있어/); assert.ok(tags.description.length > 20);
      assert.equal(tags.width, '1200'); assert.equal(tags.height, '630');
      assert.equal(tags.twitter, 'summary_large_image');
      assert.equal(new URL(tags.image).protocol, 'https:');
      for (const imageUrl of [tags.image, tags.twitterImage]) {
        const url = new URL(imageUrl); const asset = await context.request.get(base + url.pathname + url.search);
        assert.equal(asset.status(), 200); assert.match(asset.headers()['content-type'], /image\/png/);
        assert.deepEqual(pngSize(await asset.body()), { width: 1200, height: 630 });
      }
      for (const [icon, size] of [[tags.icon, 512], [tags.apple, 180]]) {
        assert.ok(icon); const asset = await context.request.get(new URL(icon, base).toString());
        assert.equal(asset.status(), 200); assert.deepEqual(pngSize(await asset.body()), { width: size, height: size });
      }
    }
  }
  const favicon = await context.request.get(`${base}/favicon.ico`); assert.equal(favicon.status(), 200);
  const iconBody = await favicon.body(); assert.equal(iconBody.readUInt16LE(2), 1); assert.equal(iconBody.readUInt16LE(4), 3);
  assert.deepEqual([iconBody[6], iconBody[22], iconBody[38]], [16, 32, 48]);
  // Render a compact sample at an actual link-preview width for visual review.
  const imageData = fs.readFileSync(new URL('../app/opengraph-image.png', import.meta.url)).toString('base64');
  await page.setViewportSize({ width: 390, height: 420 });
  await page.setContent(`<html lang="ko"><body style="margin:0;padding:20px;background:#f4efe4;font-family:sans-serif;color:#38271f"><article style="overflow:hidden;background:white;border:1px solid #d8ccb3;border-radius:14px"><img alt="공유 링크 미리보기 이미지" src="data:image/png;base64,${imageData}" style="display:block;width:100%"><div style="padding:16px"><small>반쪽그림</small><h1 style="font-size:18px;line-height:1.4;margin:8px 0">반쪽만 보고, 이어 그릴 수 있어? 🎨</h1><p style="font-size:13px;line-height:1.6;margin:0">나는 왼쪽, 너는 오른쪽. 힌트만 보고 이어 그린 뒤, 둘의 그림을 함께 열어봐!</p></div></article></body></html>`);
  await page.locator('img').evaluate(el => el.decode()); await page.screenshot({ path: `${out}/link-preview-mobile.png` });
  console.log('Home/invitation/library: server-rendered OG + Twitter tags, public 1200×630 images, 16/32/48 favicon + 512 app icon + 180 Apple icon PASS');
} finally { await browser.close(); }
