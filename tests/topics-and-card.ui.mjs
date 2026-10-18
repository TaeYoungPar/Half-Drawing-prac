import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, mock, hostId, guestId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/topics-card');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
async function closeTopic(page) {
  await page.getByRole('dialog', { name: '그림 주제 추천', exact: true }).waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !(history.state?.halfDrawingOverlays || []).some(entry => entry.kind === '그림 주제 추천'));
}
function assertPng(filename, width, height) {
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
}
try {
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000]]) {
    fixture.room = null; fixture.writes = 0;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 640, hasTouch: width < 640 });
    await mock(context, hostId);
    const page = await context.newPage();
    await page.goto(`${base}/draw`);
    await page.getByRole('button', { name: '주제 추천', exact: true }).click();
    const chooser = page.getByRole('dialog', { name: '그림 주제 추천', exact: true });
    const choices = chooser.getByRole('group', { name: '추천 주제', exact: true });
    const firstBatch = await choices.getByRole('button').allTextContents();
    assert.equal(new Set(firstBatch).size, 3);
    await choices.getByRole('button').first().click();
    assert.equal(await chooser.getByLabel('추천 주제 직접 수정', { exact: true }).inputValue(), firstBatch[0]);
    assert.equal(await page.locator('#room-prompt').inputValue(), '', 'recommendation stays a draft until confirmed');
    await chooser.getByRole('button', { name: '다른 주제 추천', exact: true }).click();
    const secondBatch = await choices.getByRole('button').allTextContents();
    assert.ok(secondBatch.every(topic => !firstBatch.includes(topic)));
    await choices.getByRole('button').first().click();
    const topic = '우리 둘의 우주 고양이 🎨';
    await chooser.getByLabel('추천 주제 직접 수정', { exact: true }).fill(topic);
    await page.screenshot({ path: `${out}/topic-picker-${width}.png`, fullPage: true });
    await chooser.getByRole('button', { name: '이 주제로 그리기', exact: true }).click(); await closeTopic(page);
    assert.equal(await page.locator('#room-prompt').inputValue(), topic);
    assert.equal(fixture.writes, 0, 'choosing a topic never submits a drawing');
    const canvas = page.getByLabel('왼쪽 반쪽 그림 그리기');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width * .25, box.y + box.height * .5);
    const inkBefore = await canvas.evaluate(canvas => canvas.toDataURL());
    await page.getByRole('button', { name: '주제 추천', exact: true }).click();
    await chooser.getByLabel('추천 주제 직접 수정', { exact: true }).fill('취소할 주제');
    await chooser.getByRole('button', { name: '그림 주제 추천 닫기', exact: true }).click(); await closeTopic(page);
    assert.equal(await page.locator('#room-prompt').inputValue(), topic, 'closing does not overwrite an existing topic');
    assert.equal(await canvas.evaluate(canvas => canvas.toDataURL()), inkBefore, 'topic changes do not erase ink');
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
    assert.equal(await page.locator('#room-prompt').inputValue(), topic, 'selected topic persists across reload');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '반쪽 그림 등록', exact: true }).click();
    await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor();
    assert.equal(fixture.room.prompt, topic, 'the chosen topic reaches the existing room RPC');

    const stroke = (x, color) => ({ tool: 'pen', color, lineWidth: 30, points: [{ x, y: 100 }, { x, y: 400 }] });
    fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: topic, host_id: hostId, guest_id: guestId, status: 'completed', expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [
      { role: 'left', completed: true, strokes: [stroke(200, '#dc2626'), { tool: 'eraser', color: '#111827', lineWidth: 30, points: [{ x: 200, y: 300 }] }] },
      { role: 'right', completed: true, strokes: [stroke(600, '#2563eb')] },
    ] };
    await page.goto(`${base}/rooms/${roomId}`);
    await page.getByRole('heading', { name: '이런 그림이 될 줄 알았나요?', exact: true }).waitFor();
    const original = page.getByLabel('두 사람이 함께 완성한 그림', { exact: true });
    const originalBytes = await original.evaluate(canvas => canvas.toDataURL());
    const section = page.getByRole('region', { name: '완성 그림 공유 형식', exact: true });
    if (width === 390) await page.evaluate(() => {
      const original = CanvasRenderingContext2D.prototype.roundRect;
      window.restoreCardRenderer = () => { CanvasRenderingContext2D.prototype.roundRect = original; };
      CanvasRenderingContext2D.prototype.roundRect = function (...args) {
        if (this.canvas.width === 1200) throw new Error('Fixture card failure');
        return original.apply(this, args);
      };
    });
    await section.getByRole('button', { name: '공유 카드', exact: true }).click();
    if (width === 390) {
      await section.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('button', { name: '완성 그림 PNG 저장', exact: true }).isEnabled(), true, 'original export survives card failure');
      await page.evaluate(() => window.restoreCardRenderer());
      await section.getByRole('button', { name: '다시 준비', exact: true }).click();
    }
    const card = page.getByLabel('완성 그림 공유 카드 미리보기', { exact: true });
    await page.waitForFunction(() => document.querySelector('canvas[aria-label="완성 그림 공유 카드 미리보기"]')?.getAttribute('aria-busy') === 'false');
    await section.getByRole('button', { name: '공유 카드 공유', exact: true }).waitFor();
    assert.equal(await section.getByRole('alert').count(), 0);
    const sample = await card.evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      return { width: canvas.width, height: canvas.height, left: Array.from(ctx.getImageData(348, 585, 1, 1).data), right: Array.from(ctx.getImageData(852, 585, 1, 1).data), erased: Array.from(ctx.getImageData(348, 648, 1, 1).data) };
    });
    assert.equal(sample.width, 1200); assert.equal(sample.height, 1200);
    assert.deepEqual(sample.left, [220, 38, 38, 255]);
    assert.deepEqual(sample.right, [37, 99, 235, 255]);
    assert.deepEqual(sample.erased, [255, 255, 255, 255], 'erased artwork remains white in the card');
    assert.equal(await original.evaluate(canvas => canvas.toDataURL()), originalBytes, 'card creation never changes the original');
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/card-preview-${width}.png`, fullPage: true });

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: async data => {
        const file = data.files[0], bitmap = await createImageBitmap(file);
        const encoded = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
        window.sharedCard = { name: file.name, type: file.type, width: bitmap.width, height: bitmap.height, encoded };
        bitmap.close();
      } });
    });
    await section.getByRole('button', { name: '공유 카드 공유', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.sharedCard));
    const shared = await page.evaluate(() => window.sharedCard);
    assert.equal(shared.name, 'half-drawing-card.png'); assert.equal(shared.type, 'image/png');
    assert.equal(shared.width, 1200); assert.equal(shared.height, 1200);
    fs.writeFileSync(`${out}/share-card-${width}.png`, Buffer.from(shared.encoded.split(',')[1], 'base64'));

    await page.evaluate(() => { navigator.share = async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); }; });
    await section.getByRole('button', { name: '공유 카드 공유', exact: true }).click();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some(button => button.textContent === '이미지 준비 중…'));
    assert.equal(await section.getByRole('status').count(), 0, 'cancelled card share reports no success or error');
    await page.evaluate(() => { navigator.share = undefined; });
    const fallback = page.waitForEvent('download');
    await section.getByRole('button', { name: '공유 카드 공유', exact: true }).click();
    const fallbackFile = await fallback;
    assert.equal(fallbackFile.suggestedFilename(), 'half-drawing-card.png');
    await fallbackFile.saveAs(`${out}/fallback-${width}.png`);
    assertPng(`${out}/fallback-${width}.png`, 1200, 1200);
    const originalDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '완성 그림 PNG 저장', exact: true }).click();
    const originalFile = await originalDownload;
    assert.equal(originalFile.suggestedFilename(), 'half-drawing.png');
    await originalFile.saveAs(`${out}/original-${width}.png`);
    assertPng(`${out}/original-${width}.png`, 800, 500);
    await section.getByRole('button', { name: '그림만', exact: true }).click();
    assert.equal(await card.count(), 0);
    assert.equal(await section.getByRole('button', { name: '완성 그림 공유', exact: true }).isEnabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (width === 320) {
      fixture.room.prompt = '가'.repeat(80);
      await page.reload();
      await page.getByRole('button', { name: '공유 카드', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('canvas[aria-label="완성 그림 공유 카드 미리보기"]')?.getAttribute('aria-busy') === 'false');
      const image = await page.getByLabel('완성 그림 공유 카드 미리보기', { exact: true }).evaluate(canvas => canvas.toDataURL());
      fs.writeFileSync(`${out}/long-topic-card.png`, Buffer.from(image.split(',')[1], 'base64'));
    }
    console.log(`${width}px: topic recommendation/edit/cancel/restore/register, actual card pixels and erased white, native PNG/cancel/fallback, error retry and original export PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
