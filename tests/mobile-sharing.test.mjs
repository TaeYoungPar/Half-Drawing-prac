import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(filename, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(`../app/utils/${filename}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, URL, Error, File, ...globals });
  return exports;
}

const location = { origin: "https://example.com" };
test("invitation uses the join page and normalizes pasted codes", () => {
  const { invitationUrl, normalizeRoomCode } = load("shareInvitation");
  assert.equal(invitationUrl(location.origin, "ABC123DEF4"), "https://example.com/join?code=ABC123DEF4");
  assert.equal(normalizeRoomCode(" abc-123 def4 extra "), "ABC123DEF4");
});

test("invitation falls back to clipboard when native sharing is unavailable or rejected", async () => {
  for (const rejected of [false, true]) {
    let copied;
    const navigator = { clipboard: { writeText: async (value) => { copied = value; } } };
    if (rejected) navigator.share = async () => { throw new Error("NotAllowed"); };
    const { shareInvitation } = load("shareInvitation", { window: { location }, navigator });
    await shareInvitation("ABC123DEF4");
    assert.equal(copied, "https://example.com/join?code=ABC123DEF4");
  }
});

test("native invitation shares only the code link without a chat caption or drawing", async () => {
  let shared;
  const { shareInvitation } = load("shareInvitation", {
    window: { location }, navigator: { share: async (data) => { shared = data; } },
  });
  await shareInvitation("ABC123DEF4");
  assert.equal(shared.url, "https://example.com/join?code=ABC123DEF4");
  assert.deepEqual(Object.keys(shared), ["url"]);
});

test("cancelled invitation does not copy or report a completed share", async () => {
  const { shareInvitation } = load("shareInvitation", {
    window: { location },
    navigator: { share: async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); },
      clipboard: { writeText: () => { assert.fail("must not copy on cancellation"); } } },
  });
  assert.equal(await shareInvitation("ABC123DEF4"), null);
});

function imageHarness(navigator) {
  const calls = [];
  const downloads = [];
  const document = { createElement: (tag) => tag === "canvas" ? {
    getContext: () => ({ fillRect: () => calls.push("white"), drawImage: () => calls.push("drawing") }),
    toBlob: (callback) => callback(new Blob(["png"], { type: "image/png" })),
    toDataURL: () => "data:image/png;base64,image",
  } : { download: '', click() { calls.push("download"); downloads.push(this.download); } } };
  return { ...load("downloadCanvasImage", { navigator, document }), calls, downloads };
}

test("image sharing sends a PNG with a white background", async () => {
  let shared;
  const { shareCanvasImage, calls } = imageHarness({ canShare: () => true, share: async (data) => { shared = data; } });
  await shareCanvasImage({ width: 800, height: 500 });
  assert.deepEqual(calls, ["white", "drawing"]);
  assert.equal(shared.files[0].type, "image/png");
  assert.equal(shared.files[0].name, "half-drawing.png");
  assert.ok(shared.title.length > 0 && shared.text.length > 0);
});

test("unsupported image sharing requests download; cancellation does not", async () => {
  const fallback = imageHarness({});
  assert.match(await fallback.shareCanvasImage({ width: 800, height: 500 }), /다운로드/);
  assert.ok(fallback.calls.includes("download"));
  const cancelled = imageHarness({ canShare: () => true, share: async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); } });
  assert.equal(await cancelled.shareCanvasImage({ width: 800, height: 500 }), null);
  assert.ok(!cancelled.calls.includes("download"));
});

test("share cards keep their own filename in native sharing and download fallback", async () => {
  let shared;
  const native = imageHarness({ canShare: () => true, share: async (data) => { shared = data; } });
  await native.shareCanvasImage({ width: 1200, height: 1200 }, { filename: 'half-drawing-card.png' });
  assert.equal(shared.files[0].name, 'half-drawing-card.png');
  assert.equal(shared.files[0].type, 'image/png');
  const fallback = imageHarness({});
  await fallback.shareCanvasImage({ width: 1200, height: 1200 }, { filename: 'half-drawing-card.png' });
  assert.deepEqual(fallback.downloads, ['half-drawing-card.png']);
});

test("topic batches are unique and exclude current and previous suggestions", () => {
  const { suggestTopics, DRAWING_TOPICS } = load('topicSuggestions');
  const first = suggestTopics([], () => 0);
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
  const second = suggestTopics(first, () => 0);
  assert.equal(second.length, 3);
  assert.ok(second.every(topic => !first.includes(topic) && DRAWING_TOPICS.includes(topic)));
  assert.equal(suggestTopics(Array.from(DRAWING_TOPICS)).length, 0);
});

test("share-card topic wrapping preserves long Korean and emoji without overflowing", () => {
  const { wrapCardText } = load('shareCard');
  const context = { measureText: value => ({ width: Array.from(value).length * 36 }) };
  for (const text of ['가'.repeat(80), '친구와 그리는 고양이 🎨 🐈', 'VeryLongUnbrokenTopic'.repeat(4).slice(0, 80)]) {
    const lines = wrapCardText(context, text, 992);
    assert.equal(lines.join(''), text);
    assert.ok(lines.length <= 3 && lines.every(line => context.measureText(line).width <= 992));
  }
  const shortened = wrapCardText(context, '가'.repeat(200), 100, 2);
  assert.equal(shortened.length, 2);
  assert.ok(shortened[1].endsWith('…') && context.measureText(shortened[1]).width <= 100);
});

test("share-card site labels never include room paths, invitation codes or credentials", () => {
  const { shareSiteLabel } = load('shareCard');
  assert.equal(shareSiteLabel('https://example.com/rooms/private?code=SECRET#token'), 'example.com');
  assert.equal(shareSiteLabel('https://user:password@example.com/join'), 'example.com');
  assert.equal(shareSiteLabel('javascript:invalid'), 'half-drawing-prac.vercel.app');
  assert.equal(shareSiteLabel('not a URL'), 'half-drawing-prac.vercel.app');
});
