import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/finish');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  for (const [width, height] of [[320, 740], [390, 740], [1280, 800]]) {
    for (const side of ['left', 'right']) {
      for (const mode of ['normal', 'missing-popstate', 'late-restoration']) {
        fixture.writes = 0;
        fixture.room = side === 'right' ? {
          id: roomId, code: 'ABC123DEF4', prompt: '친구와 떠나는 여행', host_id: hostId,
          guest_id: guestId, status: 'guest_joined', expires_at: new Date(Date.now() + 86400000).toISOString(),
          drawings: [{ role: 'left', strokes: [], completed: true }],
        } : null;
        const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 });
        await mock(context, side === 'left' ? hostId : guestId);
        const page = await context.newPage();
        await page.goto(`${base}${side === 'left' ? '/draw' : `/rooms/${roomId}`}`);
        await page.getByRole('button', { name: '내 반쪽 크게 그리기', exact: true }).click();
        const canvas = page.getByLabel(side === 'left' ? '왼쪽 반쪽 그림 그리기' : '오른쪽 반쪽 그림 그리기');
        const stage = page.locator('.drawing-frame');
        await page.getByRole('button', { name: '펜', exact: true }).click();
        const box = await stage.boundingBox();
        await page.mouse.click(box.x + box.width * .6, box.y + box.height * .5);
        const finish = page.getByRole('button', { name: '다 그렸어요', exact: true });
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(b => b.textContent === '다 그렸어요')?.disabled);
        await page.evaluate(mode => {
          if (mode === 'missing-popstate') {
            window.addEventListener('popstate', event => {
              event.stopImmediatePropagation();
              setTimeout(() => window.scrollTo(0, 0), 120);
            }, { capture: true, once: true });
          }
          if (mode === 'late-restoration') {
            const back = history.back.bind(history);
            history.back = () => setTimeout(back, 180);
            window.addEventListener('popstate', () => window.scrollTo(0, 0), { capture: true, once: true });
          }
        }, mode);
        await finish.click();
        await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).waitFor({ state: 'hidden' });
        await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === 'drawing'));
        if (mode === 'missing-popstate') await page.waitForTimeout(350);
        await page.waitForFunction(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) <= 2);
        const action = page.getByRole('button', { name: side === 'left' ? '반쪽 그림 등록' : '이어 그리기 완료', exact: true });
        const actionBox = await action.boundingBox();
        assert.ok(actionBox.y >= 0 && actionBox.y + actionBox.height <= height + 1, `${side}/${width}/${mode}: final action visible without manual scroll`);
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), side === 'left' ? '그림 주제와 등록' : '이어 그리기 완료 확인');
        assert.equal(await page.evaluate(() => document.body.style.overflow), '', 'background scroll is unlocked');
        assert.equal(fixture.writes, 0, 'finishing the large view never submits');
        assert.equal(await canvas.evaluate(el => Array.from(el.getContext('2d').getImageData(0, 0, 800, 500).data).some((v, i) => i % 4 === 3 && v > 0)), true, 'drawing is preserved');
        await page.screenshot({ path: `${out}/${side}-${width}-${mode}.png` });
        if (side === 'left' && width === 320 && mode === 'normal') {
          const bottom = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, -120);
          await page.waitForFunction(y => scrollY < y - 20, bottom);
          await page.waitForTimeout(350);
          assert.ok(await page.evaluate(y => scrollY < y - 20, bottom), 'manual scrolling cancels the delayed correction');
        }
        console.log(`${side}/${width}/${mode}: finish reaches bottom, action visible, ink preserved, no submission PASS`);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
