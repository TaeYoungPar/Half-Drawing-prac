import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const illustration = (await fs.readFile(path.join(root, 'public/half-notebook-cat.webp'))).toString('base64');
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (await fs.stat('/usr/bin/chromium').catch(() => null) ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; } body { margin: 0; color: #493127; font-family: Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; background: #fffbed; background-image: linear-gradient(#a4beb54d 1px, transparent 1px), linear-gradient(90deg, #a4beb54d 1px, transparent 1px); background-size: 24px 24px; }
    .board { position: absolute; inset: 66px 48px 46px; padding: 30px 26px 22px; border: 3px solid #493127; border-radius: 28px; background: #c5e0e8; box-shadow: 8px 9px 0 #90b3bd; }
    .label { position: absolute; top: 28px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 12px 46px; border: 3px solid #493127; border-radius: 14px; background: #ffe3a0; box-shadow: 0 4px 0 #bc9f71; font-size: 30px; font-weight: 900; letter-spacing: -1px; }
    .paper { display: flex; height: 350px; border: 2px solid #85aab2; border-radius: 18px; background: #fffdf3; overflow: hidden; }
    .copy { width: 56%; padding: 38px 0 32px 40px; }
    .eyebrow { font-size: 18px; font-weight: 700; color: #6b5745; }
    h1 { margin: 20px 0 0; font-size: 48px; line-height: 1.25; font-weight: 900; letter-spacing: -2px; }
    .intro { margin: 22px 0 0; font-size: 20px; line-height: 1.6; color: #6b5745; }
    .art { position: relative; width: 44%; display: flex; align-items: center; justify-content: center; }
    .art img { width: 100%; height: 300px; object-fit: contain; }
    .art::after { content: ''; position: absolute; top: 24px; bottom: 24px; left: 50%; border-left: 2px dashed #9d8972; }
    .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 26px; padding: 0 8px; }
    .footer p { font-size: 20px; font-weight: 700; margin: 0; }
    .button { padding: 14px 24px; border: 2px solid #493127; border-radius: 12px; box-shadow: 0 4px 0 #493127; background: #ffc798; font-size: 21px; font-weight: 800; }
    .brand { position: absolute; bottom: 14px; right: 52px; font-size: 14px; color: #6b5745; font-weight: 700; }
  </style></head><body><div class="label">반쪽그림</div><div class="board"><div class="paper"><div class="copy"><span class="eyebrow">둘이 그려서, 하나의 작품</span><h1>반쪽만 보고,<br>이어 그릴 수 있어?</h1><p class="intro">나는 왼쪽, 너는 오른쪽.<br>완성되면 둘의 그림을 함께 열어봐!</p></div><div class="art"><img alt="살구색과 민트색 반쪽 고양이" src="data:image/webp;base64,${illustration}"></div></div><div class="footer"><p>회원가입 없이 · 친구 한 명과</p><span class="button">친구랑 반쪽 그리기 ↗</span></div></div><span class="brand">Half Drawing Practice</span></body></html>`, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await document.querySelector('img').decode(); });
  await page.screenshot({ path: path.join(root, 'app/opengraph-image.png') });
  console.log('Generated app/opengraph-image.png (1200×630)');
} finally {
  await browser.close();
}
