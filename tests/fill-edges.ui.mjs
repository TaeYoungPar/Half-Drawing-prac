import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/fill-edges');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
async function color(page, name) {
  await page.getByRole('button', { name: '색상 팔레트', exact: true }).click();
  await page.getByRole('button', { name: `${name} 선택`, exact: true }).click();
  await page.getByRole('button', { name: '이 색으로 채우기', exact: true }).click();
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 도구'));
}
try {
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    await mock(context, hostId);
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
    await page.getByRole('button', { name: '펜', exact: true }).click();
    const canvas = page.getByLabel('왼쪽 반쪽 그림 그리기', { exact: true });
    const box = await canvas.boundingBox();
    const position = (x, y) => [box.x + box.width * x / 800, box.y + box.height * y / 500];
    await page.mouse.move(...position(340, 250)); await page.mouse.down();
    for (let step = 1; step <= 96; step++) {
      const angle = step / 96 * Math.PI * 2;
      await page.mouse.move(...position(200 + Math.cos(angle) * 140, 250 + Math.sin(angle) * 140));
    }
    await page.mouse.up();
    await canvas.evaluate(canvas => {
      window.circleOutline = canvas.getContext('2d').getImageData(0, 0, 400, 500).data;
      window.circlePath = JSON.parse(localStorage.getItem('half-drawing:draft:left')).strokes[0].points;
    });
    await page.getByRole('button', { name: '채우기', exact: true }).click();
    for (const [name, rgb] of [['빨강', [220, 38, 38]], ['파랑', [37, 99, 235]]]) {
      await color(page, name);
      await page.touchscreen.tap(...position(200, 250));
      await page.screenshot({ path: `${out}/circle-${name}-${width}.png` });
      const result = await canvas.evaluate((canvas, replacement) => {
        const before = window.circleOutline, after = canvas.getContext('2d').getImageData(0, 0, 400, 500).data;
        const insideOutline = (x, y) => {
          const points = window.circlePath;
          let inside = false;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[i], b = points[j];
            if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
          }
          return inside;
        };
        let tested = 0, gaps = 0, wrongColor = 0, interiorGaps = 0;
        const gapPixels = [];
        for (let y = 105; y < 395; y++) for (let x = 55; x < 345; x++) {
          const distance = Math.hypot(x + .5 - 200, y + .5 - 250);
          const i = (y * 400 + x) * 4;
          if (distance < 135 && after[i + 3] !== 255) interiorGaps++;
          if (before[i + 3] === 0 || before[i + 3] === 255 || !insideOutline(x + .5, y + .5)) continue;
          tested++;
          if (after[i + 3] !== 255) { gaps++; gapPixels.push({ x, y, before: Array.from(before.slice(i, i + 4)), after: Array.from(after.slice(i, i + 4)) }); }
          const alpha = before[i + 3] / 255;
          if (replacement.some((value, channel) => Math.abs(after[i + channel] - Math.round(before[i + channel] * alpha + value * (1 - alpha))) > 2)) wrongColor++;
        }
        return { tested, gaps, wrongColor, interiorGaps, gapPixels };
      }, rgb);
      assert.ok(result.tested > 100, 'check the actual curved antialiased boundary');
      assert.equal(result.interiorGaps, 0, 'circle interior must have no holes');
      assert.equal(result.gaps, 0, `fill must reach the curved outline without transparent pinholes: ${JSON.stringify(result.gapPixels.slice(0, 10))}`);
      assert.equal(result.wrongColor, 0, 'recoloring must preserve the outline and replace the previous edge color');
    }
    await context.close();
    console.log(`${width}px: circle interior, curved antialias edge coverage and recoloring PASS`);
  }
} finally { await browser.close(); }
