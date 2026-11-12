import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mock, fixture, hostId, guestId } from './browser-fixtures.mjs';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = process.env.VISUAL_ARTIFACT_DIR || path.resolve('artifacts/language');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const errors = [];
async function pageFor(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration|hydrated|Minified React error/i.test(message.text())) errors.push(message.text()); });
  return page;
}
async function english(page) {
  await page.waitForFunction(() => document.documentElement.lang === 'en');
}
async function noKoreanUI(page) {
  const untranslated = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (parent && !parent.closest('script, style, [lang="ko"]') && /[가-힣]/.test(node.textContent) && parent.getClientRects().length) found.push(node.textContent.trim());
    }
    for (const element of document.querySelectorAll('[aria-label], [placeholder], img[alt]')) {
      if (element.closest('[lang="ko"]')) continue;
      for (const name of ['aria-label', 'placeholder', 'alt']) {
        const text = element.getAttribute(name);
        if (text && /[가-힣]/.test(text)) found.push(`${name}: ${text}`);
      }
    }
    return found;
  });
  assert.deepEqual(untranslated, []);
}
async function draw(page, label, fraction = .25) {
  const canvas = page.getByLabel(label, { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * fraction, box.y + box.height * .45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * (fraction + .2), box.y + box.height * .55, { steps: 6 });
  await page.mouse.up();
}
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width, height: width === 320 ? 740 : width === 390 ? 844 : 1000 } });
    await mock(context, hostId);
    const page = await pageFor(context);
    await page.goto(base); await english(page);
    await noKoreanUI(page);
    const cta = await page.getByRole('link', { name: 'Start drawing', exact: true }).boundingBox();
    assert.ok(cta.y + cta.height <= (width === 320 ? 740 : width === 390 ? 844 : 1000), 'primary action fits first screen');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${out}/home-en-${width}.png`, fullPage: true });
    for (const route of ['/guide', '/examples', '/examples/cat', '/examples/robot', '/examples/flower', '/about', '/privacy', '/library', '/join', '/missing-language-test']) {
      await page.goto(`${base}${route}`); await english(page); await noKoreanUI(page);
      if (route === '/join') {
        await page.getByLabel('Invitation code', { exact: true }).fill('bad');
        await page.getByRole('button', { name: 'Start my half →', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: '10-character' }).waitFor();
        await noKoreanUI(page);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route);
    }
    await page.goto(base); await english(page);
    await page.getByRole('link', { name: "Draw today's topic ↗", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled && Boolean(document.querySelector('#room-prompt')?.value));
    assert.match(await page.locator('#room-prompt').inputValue(), /^[^가-힣]+$/, 'new built-in daily topics use the chosen language');
    await noKoreanUI(page);
    await page.getByRole('button', { name: '한국어', exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === 'ko');
    await page.goto(base);
    await page.getByRole('link', { name: '그림 시작하기', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('link', { name: '그림 시작하기', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'ko', 'explicit choice wins over English browser');
    await context.close();
    console.log(`${width}px: English auto-detection, public pages, accessible labels, mobile layout and Korean preference PASS`);
  }
  const settings = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  await mock(settings, hostId);
  const tab1 = await pageFor(settings), tab2 = await pageFor(settings);
  await tab1.goto(base); await tab2.goto(base); await english(tab1); await english(tab2);
  await tab1.getByRole('button', { name: '한국어', exact: true }).click();
  await tab2.waitForFunction(() => document.documentElement.lang === 'ko');
  await tab2.getByRole('button', { name: 'English', exact: true }).click(); await english(tab1);
  await settings.close();
  const blocked = await browser.newContext({ locale: 'en-US' });
  await mock(blocked, hostId);
  await blocked.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key === 'half-drawing-language') throw new Error('Storage blocked'); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === 'half-drawing-language') throw new Error('Storage blocked'); return set.call(this, key, value); };
  });
  const blockedPage = await pageFor(blocked);
  await blockedPage.goto(base); await english(blockedPage);
  await blockedPage.getByRole('button', { name: '한국어', exact: true }).click();
  await blockedPage.getByRole('link', { name: '참여 코드 입력하기', exact: true }).click();
  await blockedPage.getByRole('heading', { name: '초대받으셨나요?', exact: true }).waitFor();
  await blocked.close();
  console.log('Cross-tab language sync and blocked-storage in-document fallback PASS');
  const host = await browser.newContext({ locale: 'ko-KR' , viewport: { width: 390, height: 844 } });
  const guest = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  await mock(host, hostId); await mock(guest, guestId);
  const h = await pageFor(host), g = await pageFor(guest);
  await h.goto(`${base}/draw`);
  await h.getByRole('button', { name: 'English', exact: true }).click(); await english(h);
  await h.locator('#room-prompt').waitFor();
  await h.waitForFunction(() => !document.querySelector('#room-prompt').disabled);
  await noKoreanUI(h);
  await h.getByRole('button', { name: 'Topic ideas', exact: true }).click();
  await noKoreanUI(h);
  await h.getByRole('group', { name: 'Suggested topics' }).getByRole('button').first().click();
  assert.match(await h.locator('#suggested-topic').inputValue(), /^[^가-힣]+$/);
  await h.getByRole('button', { name: 'Use this topic', exact: true }).click();
  await h.getByRole('button', { name: 'Color palette', exact: true }).click();
  await h.getByRole('button', { name: 'Choose Red', exact: true }).click();
  await noKoreanUI(h);
  await h.screenshot({ path: `${out}/palette-en-390.png` });
  await h.getByRole('button', { name: 'Draw with this color', exact: true }).click();
  await draw(h, 'Draw the left half');
  await h.locator('#room-prompt').fill('졸린 고양이'); // A dictionary key entered by the user must remain verbatim.
  await h.getByRole('button', { name: '한국어', exact: true }).click();
  await h.getByRole('button', { name: 'English', exact: true }).click();
  assert.equal(await h.locator('#room-prompt').inputValue(), '졸린 고양이');
  const strokesBefore = await h.evaluate(() => localStorage.getItem('half-drawing:draft:left'));
  await h.reload(); await english(h);
  await h.waitForFunction(() => !document.querySelector('#room-prompt')?.disabled);
  assert.equal(await h.locator('#room-prompt').inputValue(), '졸린 고양이');
  assert.equal(await h.evaluate(() => localStorage.getItem('half-drawing:draft:left')), strokesBefore);
  h.once('dialog', async dialog => { assert.match(dialog.message(), /Submit this half/); await dialog.accept(); });
  await h.getByRole('button', { name: 'Submit my half', exact: true }).click();
  await h.getByRole('heading', { name: "Now it's your friend's turn.", exact: true }).waitFor();
  assert.equal(fixture.room.prompt, '졸린 고양이');
  await g.goto(`${base}/join?code=ABC123DEF4`); await english(g);
  await g.getByRole('button', { name: 'Start my half →', exact: true }).click();
  await g.getByRole('button', { name: 'Draw my half larger', exact: true }).waitFor();
  await g.waitForFunction(() => !document.querySelector('[data-view-toggle]')?.disabled);
  await draw(g, 'Draw the right half', .6);
  g.once('dialog', async dialog => { assert.match(dialog.message(), /Finish your half/); await dialog.accept(); });
  await g.getByRole('button', { name: 'Finish my half', exact: true }).click();
  await g.getByRole('heading', { name: 'Did you imagine this?', exact: true }).waitFor();
  await g.getByRole('button', { name: 'Share card', exact: true }).first().click();
  await g.getByRole('button', { name: 'Save card as PNG', exact: true }).waitFor();
  const download = g.waitForEvent('download');
  await g.getByRole('button', { name: 'Save card as PNG', exact: true }).click();
  const image = await download; await image.saveAs(`${out}/share-card-en.png`);
  await g.locator('#room-comment').fill('그림 주제');
  await g.getByRole('button', { name: 'Leave a note', exact: true }).click();
  await g.getByText('Your note was saved for your friend.', { exact: true }).waitFor();
  assert.equal(fixture.comments[0].body, '그림 주제');
  await g.getByRole('button', { name: '한국어', exact: true }).click();
  await g.getByRole('button', { name: 'English', exact: true }).click();
  await g.getByText('그림 주제', { exact: true }).waitFor();
  await g.getByRole('link', { name: 'My gallery', exact: true }).first().click();
  await g.getByRole('link', { name: 'View finished drawing →', exact: true }).waitFor();
  await g.getByRole('heading', { name: '졸린 고양이', exact: true }).waitFor();
  await g.screenshot({ path: `${out}/gallery-en-390.png`, fullPage: true });
  await host.close(); await guest.close();
  assert.deepEqual(errors, []);
  console.log('English two-person draw/join/result/share-card/note/gallery; language changes preserve user text and strokes PASS');
} finally { await browser.close(); }
