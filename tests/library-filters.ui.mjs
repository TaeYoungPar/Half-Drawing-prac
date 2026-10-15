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
    const requests = { all: 0, host: 0, guest: 0 };
    let guestGate = null;
    let failGuestOnce = false;
    await context.route('**/rest/v1/rooms*', async route => {
      const query = new URL(route.request().url()).searchParams;
      requests[query.has('host_id') ? 'host' : query.has('guest_id') ? 'guest' : 'all']++;
      if (query.has('guest_id') && guestGate) await guestGate;
      await new Promise(resolve => setTimeout(resolve, 650));
      if (query.has('guest_id') && failGuestOnce) {
        failGuestOnce = false;
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Test prefetch failure' }) });
      }
      await route.fallback();
    });
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.getByRole('textbox', { name: '그림 주제', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('#room-prompt').disabled);
    const prefetchedHost = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms' && new URL(r.url()).searchParams.has('host_id'));
    const prefetchedGuest = page.waitForResponse(r => new URL(r.url()).pathname === '/rest/v1/rooms' && new URL(r.url()).searchParams.has('guest_id'));
    await page.getByRole('link', { name: '내 보관함', exact: true }).click();
    const refresh = page.getByRole('button', { name: '상태 새로고침', exact: true });
    const all = page.getByRole('button', { name: '전체', exact: true });
    const host = page.getByRole('button', { name: '내가 시작한 그림', exact: true });
    const guest = page.getByRole('button', { name: '내가 참여한 그림', exact: true });
    const result = page.getByRole('link', { name: '완성 그림 보기 →', exact: true });
    await result.waitFor();
    await Promise.all([prefetchedHost, prefetchedGuest]);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(requests, { all: 1, host: 1, guest: 1 }, 'all three first pages load once before any filter click');
    const refreshWidth = (await refresh.boundingBox()).width;

    // Even the first filter click displays its prefetched list immediately.
    await host.click();
    assert.equal(await refresh.isEnabled(), true);
    assert.equal(await refresh.getAttribute('aria-busy'), 'false');
    assert.equal(await host.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByText('아직 시작한 그림이 없어요.', { exact: true }).isVisible(), true);
    assert.equal(await page.getByText('내 그림을 확인하는 중…', { exact: true }).count(), 0);

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

    // Clicking before prefetch completes joins the in-flight request rather than duplicating it.
    requests.all = 0; requests.host = 0; requests.guest = 0;
    let releaseGuest;
    guestGate = new Promise(resolve => { releaseGuest = resolve; });
    await page.reload();
    await guest.click();
    releaseGuest();
    await result.waitFor();
    guestGate = null;
    assert.equal(requests.guest, 1, 'early filter click reuses its prefetch request');
    assert.equal(await guest.getAttribute('aria-pressed'), 'true');

    // An inactive prefetch failure stays silent; selecting it retries normally.
    if (width === 320) {
      requests.guest = 0;
      failGuestOnce = true;
      const failedPrefetch = page.waitForResponse(r => new URL(r.url()).searchParams.has('guest_id') && r.status() === 403);
      await page.reload();
      await failedPrefetch;
      await result.waitFor();
      assert.equal(await page.locator('#my-drawings').getByRole('alert').count(), 0, 'inactive prefetch failure does not show a library error');
      await guest.click();
      await result.waitFor();
      assert.equal(requests.guest, 2, 'failed prefetch is retried on selection');
    }
    console.log(`${width}px: first-page prefetch, immediate first switch, early-click deduplication, quiet failure/retry, late-response isolation and refresh feedback PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
