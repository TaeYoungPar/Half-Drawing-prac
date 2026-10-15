import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/library');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
try {
  for (const width of [320, 390]) {
    fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: '친구와 떠나는 여행', host_id: hostId, guest_id: guestId,
      status: 'completed', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [] };
    const context = await browser.newContext({ viewport: { width, height: 740 }, isMobile: true, hasTouch: true });
    await mock(context, guestId);
    await context.route('**/rest/v1/rooms*', async route => {
      await new Promise(resolve => setTimeout(resolve, 650));
      await route.fallback();
    });
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.getByRole('textbox', { name: '그림 주제', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('#room-prompt').disabled);
    await page.getByRole('link', { name: '내 보관함', exact: true }).click();
    const refresh = page.getByRole('button', { name: '상태 새로고침', exact: true });
    const all = page.getByRole('button', { name: '전체', exact: true });
    const host = page.getByRole('button', { name: '내가 시작한 그림', exact: true });
    const guest = page.getByRole('button', { name: '내가 참여한 그림', exact: true });
    const result = page.getByRole('link', { name: '완성 그림 보기 →', exact: true });
    await result.waitFor();
    const refreshWidth = (await refresh.boundingBox()).width;

    // A new filter loads only the list; the refresh control stays still and usable.
    await host.click();
    assert.equal(await refresh.isEnabled(), true);
    assert.equal(await refresh.getAttribute('aria-busy'), 'false');
    assert.equal(await host.getAttribute('aria-pressed'), 'true');
    await page.getByText('아직 시작한 그림이 없어요.', { exact: true }).waitFor();

    // A previously seen filter is visible before its delayed network request returns.
    await all.click();
    assert.equal(await result.isVisible(), true, 'cached list should appear immediately');
    assert.equal(await page.getByText('내 그림을 확인하는 중…', { exact: true }).count(), 0);
    assert.equal(await refresh.isEnabled(), true);

    // A slower old filter response must never replace the newly selected filter.
    const oldGuestResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms' && new URL(r.url()).searchParams.has('guest_id'));
    await guest.click();
    const currentHostResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms' && new URL(r.url()).searchParams.has('host_id'));
    await host.click();
    await Promise.all([oldGuestResponse, currentHostResponse]);
    await page.getByText('아직 시작한 그림이 없어요.', { exact: true }).waitFor();
    assert.equal(await result.count(), 0, 'late guest response cannot overwrite the host list');
    assert.equal(await host.getAttribute('aria-pressed'), 'true');

    // Automatic revalidation leaves both the button and the current list unchanged.
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const backgroundRequest = page.waitForRequest(r => new URL(r.url()).pathname === '/rest/v1/rooms');
    const backgroundResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await backgroundRequest;
    assert.equal(await refresh.isEnabled(), true);
    assert.equal(await refresh.getAttribute('aria-busy'), 'false');
    await backgroundResponse;

    // Only an explicit refresh gets its own progress feedback, with a stable width.
    await refresh.click();
    const busy = page.getByRole('button', { name: '새로고침 중…', exact: true });
    assert.equal(await busy.isDisabled(), true);
    assert.ok(Math.abs((await busy.boundingBox()).width - refreshWidth) < 1);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent === '상태 새로고침' && !b.disabled));
    const allResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms' && new URL(r.url()).searchParams.has('or'));
    await all.click();
    await result.waitFor();
    assert.equal(await all.getAttribute('aria-pressed'), 'true');
    await allResponse;
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${out}/library-${width}.png`, fullPage: true });
    await page.getByRole('group', { name: '내 그림 목록 선택', exact: true }).screenshot({ path: `${out}/filters-${width}.png` });
    console.log(`${width}px: independent filters, cached switching, late-response isolation, quiet background updates, manual-only refresh feedback PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
