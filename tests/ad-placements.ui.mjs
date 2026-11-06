import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, hostId, guestId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/ad-placements');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const adScript = `window.__placementPushes = 0; window.__placementAttributes = Array.from(document.currentScript.attributes, a => a.name).sort();
window.__placementReady = document.readyState;
window.adsbygoogle = { push() {
  window.__placementPushes++;
  const ins = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
  if (!ins) throw new Error('Duplicate request');
  ins.dataset.adsbygoogleStatus = 'done'; ins.dataset.adStatus = 'filled';
  const frame = document.createElement('iframe'); frame.title = '테스트 광고';
  frame.style.cssText = 'display:block;border:0;width:100%;height:100px';
  frame.srcdoc = '<body style="margin:0;background:#f1f1f1;color:#555;font:13px sans-serif;display:grid;place-content:center;height:100vh">테스트 광고 · 실제 광고 요청 없음</body>';
  ins.append(frame);
} };`;
const records = Array.from({ length: 3 }, (_, i) => ({
  id: `55555555-5555-4555-8555-${String(i).padStart(12, '0')}`, code: 'ABC123DEF4', prompt: ['울보 양파', '화난 딸기', '웃는 로봇'][i],
  status: 'completed', host_id: hostId, guest_id: guestId, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(),
}));
const drawings = ['left', 'right'].map((role, i) => ({ role, completed: true, strokes: [{ tool: 'pen', color: i ? '#16a34a' : '#dc2626', lineWidth: 15, points: [{ x: i ? 500 : 200, y: 120 }, { x: i ? 600 : 300, y: 350 }] }] }));

async function setup(width, mode = 'normal') {
  const context = await browser.newContext({ viewport: { width, height: width < 640 ? 844 : 1000 }, isMobile: width < 640, hasTouch: width < 640 });
  await mock(context, hostId);
  let scripts = 0, listRequests = 0;
  await context.route('https://pagead2.googlesyndication.com/**', r => { scripts++; return r.fulfill({ contentType: 'application/javascript', body: adScript }); });
  let release;
  const gate = mode === 'loading' ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
  await context.route('**/rest/v1/rooms*', async r => {
    const query = new URL(r.request().url()).searchParams;
    if (query.has('id')) {
      const room = records.find(row => row.id === query.get('id').slice(3));
      if (mode === 'preview-error' && room.id === records[2].id) return r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Preview unavailable"}' });
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...room, drawings }) });
    }
    listRequests++;
    await gate;
    if (mode === 'error') return r.fulfill({ status: 400, contentType: 'application/json', body: '{"code":"42501","message":"Fixture list denied"}' });
    const rows = mode === 'empty' || query.has('guest_id') ? [] : records.map((row, i) => ({ ...row, status: mode === 'waiting' || (mode === 'two' && i === 2) ? 'waiting' : 'completed' }));
    return r.fulfill({ contentType: 'application/json', headers: { 'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(rows) });
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  return { context, page, errors, scripts: () => scripts, listRequests: () => listRequests, release: () => release?.(), setMode: value => { mode = value; } };
}

async function connect(t) {
  await t.page.goto(`${base}/draw`);
  await t.page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
}

try {
  for (const width of [320, 390, 1440]) {
    const home = await setup(width);
    await home.page.goto(base);
    const start = await home.page.getByRole('link', { name: '그림 시작하기', exact: true }).boundingBox();
    assert.ok(start.y + start.height <= (width < 640 ? 844 : 1000));
    assert.equal(await home.page.locator('.home-hero .ad-banner').count(), 0);
    assert.equal(await home.page.locator('.ad-banner').count(), 1);
    const topicBottom = await home.page.getByRole('region', { name: '오늘의 엉뚱한 주제', exact: true }).evaluate(e => e.getBoundingClientRect().bottom + scrollY);
    await home.page.locator('.ad-banner').scrollIntoViewIfNeeded();
    await home.page.locator('.ad-banner[data-ad-state="filled"]').waitFor();
    assert.ok(await home.page.locator('.ad-banner').evaluate(e => e.getBoundingClientRect().top + scrollY) - topicBottom >= 48);
    assert.equal(await home.page.evaluate(() => window.__placementReady), 'complete');
    assert.deepEqual(await home.page.evaluate(() => window.__placementAttributes), ['async', 'crossorigin', 'src']);
    assert.equal(await home.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await home.page.screenshot({ path: `${out}/home-ad-${width}.png` });
    await home.page.getByRole('link', { name: '그림 시작하기', exact: true }).click();
    await home.page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.equal(await home.page.evaluate(() => typeof window.adsbygoogle), 'undefined');
    await home.context.close();

    const t = await setup(width);
    await t.page.clock.install();
    await connect(t);
    await t.page.goto(`${base}/library`);
    await t.page.locator('article').nth(2).waitFor();
    for (const card of await t.page.locator('article').all()) {
      await card.scrollIntoViewIfNeeded();
      await card.locator('img').waitFor();
      await card.locator('img').evaluate(image => image.decode());
    }
    await t.page.locator('footer').scrollIntoViewIfNeeded();
    await t.page.locator('.ad-banner[data-ad-state="filled"]').waitFor();
    assert.equal(await t.page.locator('#my-drawings img').count(), 3);
    assert.equal(t.scripts(), 1);
    assert.equal(await t.page.evaluate(() => window.__placementPushes), 1);
    const lastCardBottom = await t.page.locator('article').last().evaluate(e => e.getBoundingClientRect().bottom + scrollY);
    assert.ok(await t.page.locator('.ad-banner').evaluate(e => e.getBoundingClientRect().top + scrollY) - lastCardBottom >= 48);
    await t.page.screenshot({ path: `${out}/library-ad-${width}.png` });
    const oldRequests = t.listRequests();
    await t.page.clock.fastForward(10050);
    for (let i = 0; i < 40 && t.listRequests() === oldRequests; i++) await new Promise(r => setTimeout(r, 50));
    assert.ok(t.listRequests() > oldRequests, 'background list update really ran');
    await t.page.waitForTimeout(200);
    assert.equal(await t.page.evaluate(() => window.__placementPushes), 1, 'list polling never refreshes the ad');
    t.setMode('error');
    await t.page.getByRole('button', { name: '상태 새로고침', exact: true }).click();
    await t.page.getByRole('alert').filter({ hasText: '내 그림 목록을 불러오지 못했어요.' }).waitFor();
    assert.equal(await t.page.locator('.ad-banner[data-ad-state="filled"]').count(), 1, 'visible cached artwork keeps the same existing ad during refresh failure');
    t.setMode('normal');
    await t.page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await t.page.getByRole('alert').filter({ hasText: '내 그림 목록을 불러오지 못했어요.' }).waitFor({ state: 'hidden' });
    assert.equal(await t.page.evaluate(() => window.__placementPushes), 1, 'refresh recovery cannot re-request the ad');
    await t.page.getByRole('button', { name: '내가 참여한 그림', exact: true }).click();
    await t.page.getByText('아직 참여한 그림이 없어요.', { exact: true }).waitFor();
    assert.equal(await t.page.locator('.ad-banner').count(), 0);
    assert.equal(await t.page.evaluate(() => window.__placementPushes), 1);
    await t.page.getByRole('button', { name: '전체', exact: true }).click();
    await t.page.locator('article').first().getByRole('link', { name: '완성 그림 보기 →', exact: true }).click();
    await t.page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
    assert.equal(await t.page.evaluate(() => typeof window.adsbygoogle), 'undefined');
    assert.deepEqual(t.errors, []);
    await t.context.close();
    console.log(`${width}px: home placement, three loaded previews, no polling refresh, empty filter removal and clean editor/result document PASS`);
  }
  for (const mode of ['loading', 'empty', 'waiting', 'two', 'preview-error', 'error']) {
    const t = await setup(390, mode);
    try {
      await connect(t);
      await t.page.goto(`${base}/library`);
      if (mode === 'loading') await t.page.getByText('그림 노트를 펼치고 있어요', { exact: true }).waitFor();
      else if (mode === 'error') await t.page.getByRole('alert').filter({ hasText: '내 그림 목록을 불러오지 못했어요.' }).waitFor();
      else if (mode === 'empty') await t.page.getByText('아직 함께 그린 그림이 없어요.', { exact: true }).waitFor();
      else {
        await t.page.locator('article').last().scrollIntoViewIfNeeded();
        await t.page.locator('footer').scrollIntoViewIfNeeded();
        if (mode === 'preview-error') await t.page.getByText('미리보기 대신 아래 버튼으로 그림을 열어주세요.', { exact: true }).waitFor();
      }
      await t.page.waitForTimeout(200);
      assert.equal(await t.page.locator('.ad-banner').count(), 0);
      assert.equal(t.scripts(), 0);
      assert.deepEqual(t.errors, []);
    } finally { t.release(); await t.context.close(); }
    console.log(`Library ${mode}: no banner or Google request PASS`);
  }
} finally { await browser.close(); }
