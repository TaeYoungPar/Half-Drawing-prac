import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/release-ux');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const stroke = (side, color) => ({ tool: 'pen', color, lineWidth: 12, points: Array.from({ length: 50 }, (_, index) => {
  const angle = index / 49 * Math.PI;
  return { x: 400 + Math.sin(angle) * (side === 'left' ? -160 : 160), y: 250 + Math.cos(angle) * 150 };
}) });
const expiry = new Date(Date.now() + 86400000).toISOString();
const records = Array.from({ length: 8 }, (_, i) => ({
  id: `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`, code: 'ABC123DEF4',
  prompt: ['우리의 무지개 얼굴', '친구를 기다리는 고양이', '이어 그리는 우주 여행', '동그란 상상', '분홍빛 하루', '숲속 친구', '두 번째 페이지의 그림', '마지막 작은 작품'][i],
  status: i === 1 ? 'waiting' : i === 2 ? 'guest_joined' : 'completed',
  created_at: new Date().toISOString(), expires_at: expiry, host_id: hostId, guest_id: guestId,
}));

try {
  for (const width of [320, 390, 1440]) {
    const height = width === 1440 ? 1000 : 740;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 640, hasTouch: width < 640 });
    await mock(context, hostId);
    const thumbnails = new Map();
    let failFirst = width !== 320;
    await context.route('**/rest/v1/rooms*', async route => {
      const query = new URL(route.request().url()).searchParams;
      if (query.has('id')) {
        assert.equal(query.get('status'), 'eq.completed', 'thumbnail requests must filter completion in the database query');
        const id = query.get('id').slice(3);
        const room = records.find(room => room.id === id);
        assert.equal(room?.status, 'completed', 'never fetch unfinished originals for a thumbnail');
        thumbnails.set(id, (thumbnails.get(id) || 0) + 1);
        if (failFirst && id === records[0].id) {
          failFirst = false;
          if (width === 1440) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id, status: 'guest_joined', drawings: [] }) });
          return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture denied preview' }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          id, status: 'completed', drawings: ['left', 'right'].map((side, index) => ({ role: side, completed: true, strokes: [stroke(side, index ? '#16a34a' : '#dc2626')] })),
        }) });
      }
      assert.ok(!query.get('select').includes('drawings'), 'all three filter prefetches stay metadata only');
      const matching = query.has('guest_id') ? [] : records;
      const start = Number(query.get('offset') || 0);
      const selected = matching.slice(start, start + Number(query.get('limit') || 6));
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': selected.length ? `${start}-${start + selected.length - 1}/${matching.length}` : '*/0', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(selected) });
    });
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    const canvas = await page.locator('.drawing-frame').boundingBox();
    if (width < 640) {
      assert.ok(canvas.y <= 420, `mobile canvas should appear early beneath the shared header and topic picker, received ${canvas.y}`);
      assert.ok(canvas.y + canvas.height <= height, 'entire normal canvas fits in the first screen');
      assert.equal(await page.getByRole('dialog', { name: '내 반쪽 크게 그리기', exact: true }).count(), 0);
      const toolBoxes = await Promise.all(['펜', '지우개', '마지막 선 실행 취소', '색상 팔레트', '굵기 · 더 많은 도구'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
      assert.equal(toolBoxes[0].width, toolBoxes[1].width, 'pen and eraser retain identical dimensions');
      for (const box of toolBoxes) assert.ok(box.width >= 44 && box.height >= 44);
      assert.ok(toolBoxes.every(box => Math.abs(box.y - toolBoxes[0].y) < 1), 'primary tools fit one row');
    }
    await page.addStyleTag({ content: 'nextjs-portal { display:none; }' });
    await page.screenshot({ path: `${out}/draw-${width}.png`, fullPage: true });

    fixture.writes = 0;
    await page.goto(`${base}/join?code=ABC123DEF4`);
    await page.getByRole('heading', { name: '친구의 그림이 기다려요!' }).waitFor();
    const join = page.getByRole('button', { name: '이어 그리러 가기 →', exact: true });
    await join.waitFor();
    assert.equal(await page.locator('#room-code').inputValue(), 'ABC123DEF4');
    assert.equal(await page.locator('#room-code').isVisible(), false, 'invited users do not need to re-enter the code');
    assert.equal(fixture.writes, 0, 'opening an invitation never auto-joins');
    if (width < 640) assert.ok((await join.boundingBox()).y + (await join.boundingBox()).height <= height, 'invitation action fits the first screen');
    await page.addStyleTag({ content: 'nextjs-portal { display:none; }' });
    await page.screenshot({ path: `${out}/invited-${width}.png`, fullPage: true });
    await page.getByText('참여 코드 확인·변경', { exact: true }).click();
    await page.getByLabel('참여 코드', { exact: true }).fill('BAD');
    await join.click();
    await page.getByRole('alert').filter({ hasText: '10자리' }).waitFor();
    assert.equal(await page.getByLabel('참여 코드', { exact: true }).isVisible(), true);
    await page.getByLabel('참여 코드', { exact: true }).fill('ABC123DEF4');
    assert.equal(await page.getByLabel('참여 코드', { exact: true }).isVisible(), true, 'correcting an error must keep the editor open');
    await page.goto(`${base}/join`);
    await page.getByRole('heading', { name: '초대받으셨나요?' }).waitFor();
    assert.equal(await page.getByLabel('참여 코드', { exact: true }).isVisible(), true, 'manual entry remains available');

    await page.goto(`${base}/library`);
    await page.locator('article').first().waitFor();
    const notice = page.getByRole('complementary', { name: '보관함 이용 안내' });
    assert.equal(await notice.isVisible(), true, 'browser limitation is visible without opening help');
    const first = page.locator('article').first();
    await first.scrollIntoViewIfNeeded();
    assert.equal(await first.getByRole('link', { name: `${records[0].prompt} 완성 그림 열기`, exact: true }).getAttribute('href'), `/rooms/${records[0].id}`, 'thumbnail itself opens the completed drawing');
    if (width !== 320) {
      await first.getByText('미리보기 대신 아래 버튼으로 그림을 열어주세요.').waitFor();
      assert.equal(await first.getByRole('link', { name: '완성 그림 보기 →', exact: true }).isVisible(), true, 'preview failure does not block the room');
      assert.equal(await page.locator('#my-drawings').getByRole('alert').count(), 0);
    } else {
      await first.getByRole('img').waitFor();
      const pixels = await first.getByRole('img').evaluate(async image => {
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        return [Array.from(context.getImageData(96, 100, 1, 1).data), Array.from(context.getImageData(224, 100, 1, 1).data)];
      });
      assert.ok(pixels[0][0] > 180 && pixels[0][1] < 100 && pixels[1][1] > 100 && pixels[1][0] < 80, 'both thumbnail halves render in their own colors');
    }
    assert.ok(!thumbnails.has(records[6].id) && !thumbnails.has(records[7].id), 'page two originals are not prefetched');
    assert.equal(await page.locator('article').nth(1).getByRole('img').count(), 0);
    assert.equal(await page.locator('article').nth(2).getByRole('img').count(), 0);
    if (width === 320) assert.ok(!thumbnails.has(records[5].id), 'offscreen completed originals wait for scrolling');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.getByRole('heading', { name: records[6].prompt, exact: true }).waitFor();
    await page.locator('article').first().scrollIntoViewIfNeeded();
    await page.locator('article').first().getByRole('img').waitFor();
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.getByRole('heading', { name: records[0].prompt, exact: true }).waitFor();
    await page.locator('article').first().scrollIntoViewIfNeeded();
    await page.locator('article').first().getByRole('img').waitFor();
    assert.equal(thumbnails.get(records[0].id), width !== 320 ? 2 : 1, 'successful images are cached; failed images can retry after returning');
    await page.getByRole('button', { name: '내가 시작한 그림', exact: true }).click();
    await page.locator('article').first().getByRole('img').waitFor();
    assert.equal(thumbnails.get(records[0].id), width !== 320 ? 2 : 1, 'filter switches reuse thumbnails');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.evaluate(() => Object.entries(localStorage).some(([key, value]) => key.includes('thumbnail') || value.startsWith('data:image/'))), false, 'private thumbnails do not persist to localStorage');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.addStyleTag({ content: 'nextjs-portal { display:none; }' });
    await page.screenshot({ path: `${out}/library-${width}.png`, fullPage: true });
    console.log(`${width}px: compact drawing, invitation/manual-code flows, visible storage guidance, completed-only lazy thumbnails, page/filter cache and error isolation PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
