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
    assert.ok(copied.endsWith("https://example.com/join?code=ABC123DEF4"));
    assert.match(copied, /나머지를 그려줘/);
    assert.doesNotMatch(copied.slice(0, copied.indexOf("https://")), /\n\s*$/);
  }
});

test("native invitation shares the challenge text and code link without revealing a drawing", async () => {
  let shared;
  const { shareInvitation } = load("shareInvitation", {
    window: { location }, navigator: { share: async (data) => { shared = data; } },
  });
  await shareInvitation("ABC123DEF4");
  const link = shared.text.match(/https:\/\/\S+/)?.[0];
  assert.equal(link, "https://example.com/join?code=ABC123DEF4");
  assert.equal(shared.url, undefined, "a separate URL must not add another line");
  assert.doesNotMatch(shared.text.slice(0, shared.text.indexOf(link)), /\n\s*$/);
  assert.ok(shared.title.length > 0 && shared.text.length > 0);
  assert.equal("files" in shared, false);
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
  const document = { createElement: (tag) => tag === "canvas" ? {
    getContext: () => ({ fillRect: () => calls.push("white"), drawImage: () => calls.push("drawing") }),
    toBlob: (callback) => callback(new Blob(["png"], { type: "image/png" })),
    toDataURL: () => "data:image/png;base64,image",
  } : { click: () => calls.push("download") } };
  return { ...load("downloadCanvasImage", { navigator, document }), calls };
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
