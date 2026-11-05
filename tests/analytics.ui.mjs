import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { fixture, mock, hostId, roomId } from './browser-fixtures.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
// Exercise the real SDK registration/navigation against a collector contract fixture.
// This does not assert delivery to the production Vercel dashboard.
const tracker = `(() => {
  let beforeSend;
  function command(type, props) {
    if (type === 'beforeSend') beforeSend = props;
    if (type !== 'pageview') return;
    const raw = { type: 'pageview', url: new URL(props.path + location.search + location.hash, location.origin).href };
    const event = beforeSend ? beforeSend(raw) : raw;
    if (event) fetch('/_vercel/insights/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...event, route: props.route }) });
  }
  const queued = window.vaq || [];
  window.va = command;
  queued.forEach(args => command(...args));
  window.vaq = [];
})();`;

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mock(context, hostId);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  if (process.env.ANALYTICS_EXPECT_DISABLED === '1') {
    let requests = 0;
    page.on('request', r => { if (/insights|vercel-scripts/.test(r.url())) requests++; });
    await page.goto(base);
    await page.getByRole('link', { name: '참여 코드 입력하기', exact: false }).first().click();
    await page.getByLabel('참여 코드', { exact: true }).waitFor();
    await page.waitForTimeout(500);
    assert.equal(requests, 0);
    assert.deepEqual(errors, []);
    console.log('Non-production: no analytics script or collector requests; navigation PASS');
  } else {
    const views = [];
    let scripts = 0;
    await context.route('**/_vercel/insights/script.js', r => { scripts++; return r.fulfill({ contentType: 'application/javascript', body: tracker }); });
    await context.route('**/_vercel/insights/view', r => {
      assert.equal(r.request().headers().referer, `${base}/`, 'Referer must not include a private path/query');
      views.push(r.request().postDataJSON());
      return r.fulfill({ status: 204 });
    });
    const waitViews = n => assertEventually(() => views.length === n);
    const response = await page.goto(`${base}/?prompt=secret#private`);
    assert.equal(response.headers()['referrer-policy'], 'strict-origin');
    await waitViews(1);
    assert.equal(views[0].url, `${base}/`);
    assert.equal(await page.locator('script[src="/_vercel/insights/script.js"]').getAttribute('data-disable-auto-track'), '1');
    await page.getByRole('link', { name: '참여 코드 입력하기', exact: false }).first().click();
    await page.getByLabel('참여 코드', { exact: true }).waitFor();
    await waitViews(2);
    assert.equal(views[1].url, `${base}/join`);
    await page.getByLabel('참여 코드', { exact: true }).fill('ABC123DEF4');
    await page.waitForTimeout(250);
    assert.equal(views.length, 2, 'typing does not send analytics events');
    assert.equal(scripts, 1, 'client navigation reuses one analytics script');
    await page.goto(`${base}/join?code=ABC123DEF4#private`);
    await waitViews(3);
    assert.equal(views[2].url, `${base}/join`);
    fixture.room = { id: roomId, code: 'ABC123DEF4', prompt: 'private drawing topic', host_id: hostId, guest_id: null, status: 'waiting', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), drawings: [{ role: 'left', completed: true, strokes: [] }] };
    await page.goto(`${base}/rooms/${roomId}?code=ABC123DEF4#private`);
    await page.getByRole('heading', { name: '이제 친구의 차례예요.', exact: true }).waitFor();
    await waitViews(4);
    assert.equal(views[3].url, `${base}/rooms/[id]`);
    assert.equal(views[3].route, '/rooms/[id]');
    assert.equal(/ABC123DEF4|private|33333333/.test(JSON.stringify(views)), false);
    await page.getByRole('link', { name: '홈', exact: true }).click();
    await waitViews(5);
    await page.waitForTimeout(300);
    assert.equal(views.length, 5, 'no duplicate pageviews after navigation settles');
    assert.deepEqual(errors, []);
    await context.close();
    const blocked = await browser.newContext();
    await mock(blocked, hostId);
    await blocked.route('**/_vercel/insights/script.js', r => r.abort());
    const b = await blocked.newPage();
    await b.goto(base);
    await b.getByRole('link', { name: '참여 코드 입력하기', exact: false }).first().click();
    await b.getByLabel('참여 코드', { exact: true }).fill('ABC123DEF4');
    assert.equal(await b.getByRole('button', { name: '이어 그리러 가기 →', exact: true }).isEnabled(), true);
    await blocked.close();
    console.log('Production SDK: one script, pageviews across navigation, sanitized URL/Referer, no typing/duplicate events and blocked-script fallback PASS (collector fixture)');
  }
} finally { await browser.close(); }

async function assertEventually(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(predicate(), 'analytics event count did not settle');
}
