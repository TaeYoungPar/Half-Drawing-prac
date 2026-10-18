/* eslint-disable react-hooks/rules-of-hooks -- Unit harness injects mock React refs/effects; it does not render a React component. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireModule = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Compile the actual TS modules in memory; no generated files or browser
// dependencies. These test event logic, not browser rendering or Supabase.
export function loadTS(filename, mocks = {}) {
  const full = path.resolve(__dirname, "..", filename);
  const source = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const requireLocal = (name) => {
    if (mocks[name]) return mocks[name];
    if (name.startsWith(".")) {
      return loadTS(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(full), name + ".ts")), mocks);
    }
    return requireModule(name);
  };
  vm.runInNewContext("(function(exports, require) {" + source + "\n})", { crypto: globalThis.crypto, window: { innerWidth: 800 } }, { filename: full })(exports, requireLocal);
  return exports;
}

function setup(readOnly = false, dimensions = {}, drawingSide = "left", tool = "pen") {
  const calls = [];
  const captures = new Set();
  const listeners = new Map();
  const context = {};
  const canvas = {
    width: 800, height: 500, clientWidth: 800, clientHeight: 500, clientLeft: 1, clientTop: 1,
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    getContext: () => context,
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
    addEventListener: (name, listener, options) => listeners.set(name, { listener, options }),
    removeEventListener: name => listeners.delete(name),
    ...dimensions,
  };
  context.canvas = canvas;
  for (const method of ["save", "restore", "beginPath", "rect", "clip", "arc", "fill", "fillRect", "moveTo", "lineTo", "stroke", "clearRect"]) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  context.getImageData = (x, y, width, height) => {
    calls.push(["getImageData", x, y, width, height]);
    return { width, height, data: new Uint8ClampedArray(width * height * 4) };
  };
  let refIndex = 0;
  const stateUpdates = [];
  const react = { useRef: (value) => ({ current: refIndex++ === 0 ? canvas : value }), useEffect: (fn) => fn(), useState: (value) => [value, (next) => stateUpdates.push(next)] };
  const { useCanvasDrawing } = loadTS("app/hooks/useCanvasDrawing.ts", { react });
  const completed = [];
  const fills = [];
  const handlers = useCanvasDrawing({
    backgroundStrokes: [], strokes: [], lineWidth: 4, strokeColor: "#111827",
    tool, drawingSide, readOnly, onStrokeComplete: (stroke) => completed.push(stroke), onFillComplete: (strokes) => fills.push(strokes),
  });
  const event = (x, y = 100, pointerId = 1, button = 0) => ({
    clientX: x + 11, clientY: y + 21, pointerId, button, type: "pointerup", preventDefault() {},
  });
  return { handlers, completed, fills, calls, captures, event, stateUpdates, listeners };
}

test("phone-size input reaches the same bitmap seam for both artists", () => {
  for (const width of [272, 343, 390, 800]) {
    const height = width * 500 / 800;
    for (const side of ["left", "right"]) {
      const { handlers, completed, event } = setup(false, { clientWidth: width, clientHeight: height }, side);
      handlers.handlePointerDown(event(width * (side === "left" ? 0.25 : 0.75), height / 2));
      handlers.handlePointerUp(event(width / 2, height / 2));
      assert.equal(completed.length, 1);
      assert.ok(Math.abs(completed[0].points.at(-1).x - 400) < 0.000001);
      assert.ok(Math.abs(completed[0].points.at(-1).y - 250) < 0.000001);
    }
  }
});

test("fractional focused-canvas dimensions preserve the exact seam", () => {
  const width = 701.875, height = width * 500 / 800;
  for (const side of ["left", "right"]) {
    const { handlers, completed, event } = setup(false, {
      clientWidth: Math.round(width), clientHeight: Math.round(height), clientLeft: 0, clientTop: 0,
      getBoundingClientRect: () => ({ left: 10, top: 20, width, height }),
    }, side);
    handlers.handlePointerDown(event(width * (side === "left" ? .25 : .75) - 1, height / 2 - 1));
    handlers.handlePointerUp(event(width / 2 - 1, height / 2 - 1));
    assert.equal(completed.length, 1);
    assert.equal(completed[0].points.at(-1).x, 400);
    assert.equal(completed[0].points.at(-1).y, 250);
  }
});

test("tap is visible and committed once after capture release", () => {
  const { handlers, completed, calls, captures, event } = setup();
  handlers.handlePointerDown(event(100));
  assert.equal(captures.has(1), true);
  assert.equal(calls.some(([name]) => name === "arc"), true);
  handlers.handlePointerUp(event(100));
  handlers.handlePointerUp(event(100));
  assert.equal(completed.length, 1);
  assert.equal(captures.size, 0);
  assert.equal(completed[0].points[0].x, 100);
});

test("second touch cannot overwrite first stroke", () => {
  const { handlers, completed, event } = setup();
  handlers.handlePointerDown(event(100));
  handlers.handlePointerDown(event(200, 100, 2));
  handlers.handlePointerMove(event(250, 100, 2));
  handlers.handlePointerUp(event(250, 100, 2));
  handlers.handlePointerUp(event(100));
  assert.equal(completed.length, 1);
  assert.equal(completed[0].points.length, 1);
});

test("outside captured movement is clamped to own half", () => {
  const { handlers, completed, event } = setup();
  handlers.handlePointerDown(event(100));
  handlers.handlePointerMove(event(900, 900));
  handlers.handlePointerUp(event(900, 900));
  assert.equal(completed[0].points[1].x, 400);
  assert.equal(completed[0].points[1].y, 500);
});

test("other half, secondary mouse and read-only drawing are ignored", () => {
  for (const [readonly, x, button] of [[false, 600, 0], [false, 100, 2], [true, 100, 0]]) {
    const { handlers, completed, captures, event } = setup(readonly);
    handlers.handlePointerDown(event(x, 100, 1, button));
    handlers.handlePointerUp(event(x));
    assert.equal(completed.length, 0);
    assert.equal(captures.size, 0);
  }
});

test("drawing helper clips left and right and restores context", () => {
  const { drawHalfStrokes } = loadTS("app/utils/drawHalfStrokes.ts");
  const calls = [];
  const context = { canvas: { width: 800, height: 500 } };
  for (const method of ["save", "restore", "beginPath", "rect", "clip"]) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  drawHalfStrokes(context, [], "left");
  drawHalfStrokes(context, [], "right");
  assert.deepEqual(calls.filter(([name]) => name === "rect"), [
    ["rect", 0, 0, 400, 500], ["rect", 400, 0, 400, 500],
  ]);
  assert.equal(calls.filter(([name]) => name === "restore").length, 2);
});

test("pointerup preserves its final coordinate without a last move event", () => {
  const { handlers, completed, event } = setup();
  handlers.handlePointerDown(event(100));
  handlers.handlePointerUp(event(150, 140));
  assert.equal(completed[0].points.at(-1).x, 150);
  assert.equal(completed[0].points.at(-1).y, 140);
});

test("drawing activity locks saving until the stroke is committed", () => {
  const { handlers, event, stateUpdates } = setup();
  handlers.handlePointerDown(event(100));
  assert.equal(stateUpdates.at(-1), true);
  handlers.handlePointerUp(event(100));
  assert.equal(stateUpdates.at(-1), false);
});

test("a canvas border tap saves a valid nonnegative point", () => {
  const { handlers, completed, event } = setup();
  handlers.handlePointerDown(event(-1, -1));
  handlers.handlePointerUp(event(-1, -1));
  assert.equal(completed[0].points[0].x, 0);
  assert.equal(completed[0].points[0].y, 0);
  assert.equal(loadTS("app/utils/validateStroke.ts").isStroke(completed[0]), true);
});

test("pointercancel commits the last valid point, not cancellation coordinates", () => {
  const { handlers, completed, event } = setup();
  handlers.handlePointerDown(event(100));
  handlers.handlePointerMove(event(120));
  handlers.handlePointerUp({ ...event(0, 0), type: "pointercancel" });
  assert.equal(completed[0].points.at(-1).x, 120);
});

const sampleStroke = (x = 100) => ({ points: [{ x, y: 100 }], color: "#111827", lineWidth: 4, tool: "pen" });

test("history undo and redo preserve order without mutating prior state", () => {
  const { historyReducer } = loadTS("app/hooks/useDrawingHistory.ts");
  const original = { strokes: [sampleStroke(10), sampleStroke(20)], undoneStrokes: [] };
  const undone = historyReducer(original, { type: "undo" });
  assert.equal(original.strokes.length, 2);
  assert.equal(undone.strokes.length, 1);
  assert.equal(undone.undoneStrokes[0].points[0].x, 20);
  const restored = historyReducer(undone, { type: "redo" });
  assert.equal(restored.strokes[1].points[0].x, 20);
  assert.equal(restored.undoneStrokes.length, 0);
});

test("new stroke clears redo branch and clear empties both stacks", () => {
  const { historyReducer } = loadTS("app/hooks/useDrawingHistory.ts");
  const state = { strokes: [sampleStroke()], undoneStrokes: [sampleStroke(20)] };
  const added = historyReducer(state, { type: "add", stroke: sampleStroke(30) });
  assert.equal(added.undoneStrokes.length, 0);
  const cleared = historyReducer(added, { type: "clear" });
  assert.equal(cleared.strokes.length, 0);
  assert.equal(cleared.undoneStrokes.length, 0);
});

test("empty history undo and redo are safe no-ops", () => {
  const { historyReducer } = loadTS("app/hooks/useDrawingHistory.ts");
  const empty = { strokes: [], undoneStrokes: [] };
  assert.equal(historyReducer(empty, { type: "undo" }), empty);
  assert.equal(historyReducer(empty, { type: "redo" }), empty);
});

test("runtime stroke validation rejects negative width, invalid points and tool", () => {
  const { isStroke } = loadTS("app/utils/validateStroke.ts");
  assert.equal(isStroke(sampleStroke()), true);
  for (const value of [null, { ...sampleStroke(), lineWidth: -2 },
    { ...sampleStroke(), points: [] }, { ...sampleStroke(), tool: "unknown" },
    sampleStroke(Infinity), sampleStroke(801), { ...sampleStroke(), color: "invalid" }]) {
    assert.equal(isStroke(value), false);
  }
});

function roomFixture(overrides = {}) {
  return { id: "room", code: "A1B2C3D4E5", prompt: "고양이", host_id: "host", guest_id: "guest",
    status: "guest_joined", expires_at: "2099-01-01T00:00:00Z",
    drawings: [{ role: "right", strokes: [sampleStroke(450)], completed: false }], ...overrides };
}

function roomReader(data, error = null) {
  const query = { select() { return this; }, eq() { return this; }, async single() { return { data, error }; } };
  return loadTS("app/lib/rooms/getRoom.ts", { "../supabase/client": { createClient: () => ({ from: () => query }) } }).getRoom;
}

test("room reader accepts valid response and turns elapsed active room into expired UI", async () => {
  const valid = await roomReader(roomFixture())("room");
  assert.equal(valid.status, "guest_joined");
  const expired = await roomReader(roomFixture({ expires_at: "2000-01-01T00:00:00Z" }))("room");
  assert.equal(expired.status, "expired");
});

test("completed results remain readable after participation expiry", async () => {
  const result = await roomReader(roomFixture({ status: "completed", expires_at: "2000-01-01T00:00:00Z" }))("room");
  assert.equal(result.status, "completed");
});

test("room reader gives controlled errors for null or corrupt API data", async () => {
  for (const data of [null, roomFixture({ drawings: null }), roomFixture({ expires_at: "bad-date" }),
    roomFixture({ drawings: [{ role: "right", strokes: [{ ...sampleStroke(), lineWidth: -4 }], completed: true }] })]) {
    await assert.rejects(roomReader(data)("room"), /방 데이터 형식/);
  }
  await assert.rejects(roomReader(null, { message: "network failure" })("room"), /방 정보를 불러오지/);
});

test("preview rejects malformed data and points outside permitted seam", async () => {
  for (const [data, valid] of [[[], true], [[sampleStroke(390)], true], [[sampleStroke(50)], false], [[{}], false]]) {
    const { getLeftPreview } = loadTS("app/lib/rooms/getLeftPreview.ts", {
      "../supabase/client": { createClient: () => ({ rpc: async () => ({ data, error: null }) }) },
    });
    if (valid) assert.equal((await getLeftPreview("room")).length, data.length);
    else await assert.rejects(getLeftPreview("room"), /경계 그림/);
  }
});

test("join RPC receives code and translates unavailable-room errors", async () => {
  let received;
  const { joinRoom } = loadTS("app/lib/rooms/joinRoom.ts", {
    "../supabase/client": { createClient: () => ({ rpc: async (name, args) => {
      received = [name, args.room_code]; return { data: null, error: { message: "ROOM_NOT_AVAILABLE" } };
    } }) },
  });
  await assert.rejects(joinRoom("A1B2C3D4E5"), /코드를 확인/);
  assert.deepEqual(received, ["join_room", "A1B2C3D4E5"]);
});

test("right save treats duplicate completed drawing as saved, never overwrites it", async () => {
  for (const completed of [true, false]) {
    let insertCount = 0;
    const query = { async insert() { insertCount++; return { error: { code: "23505" } }; },
      select() { return this; }, eq() { return this; }, async single() { return { data: { completed }, error: null }; } };
    const { saveRightDrawing } = loadTS("app/lib/drawings/saveRightDrawing.ts", {
      "../supabase/client": { createClient: () => ({ from: () => query }) },
    });
    if (completed) await saveRightDrawing("room", [sampleStroke(450)]);
    else await assert.rejects(saveRightDrawing("room", [sampleStroke(450)]), /저장하지 못/);
    assert.equal(insertCount, 1);
  }
});

test("creation RPC rejects incomplete responses instead of navigating to undefined room", async () => {
  for (const valid of [true, false]) {
    const data = valid ? [{ room_id: "room", room_code: "A1B2C3D4E5", prompt: "고양이",
      room_status: "waiting", expires_at: "2099-01-01T00:00:00Z" }] : [{}];
    const { createRoom } = loadTS("app/lib/drawings/createRoom.ts", {
      "../supabase/client": { createClient: () => ({ rpc: async () => ({ data, error: null }) }) },
    });
    if (valid) assert.equal((await createRoom("고양이", [sampleStroke()])).room_id, "room");
    else await assert.rejects(createRoom("고양이", [sampleStroke()]), /생성된 방 정보/);
  }
});

test("join RPC rejects incomplete responses and accepts a completed rejoining room", async () => {
  for (const valid of [true, false]) {
    const data = valid ? [{ room_id: "room", prompt: "고양이", room_status: "completed", expires_at: "2099-01-01T00:00:00Z" }] : [{}];
    const { joinRoom } = loadTS("app/lib/rooms/joinRoom.ts", {
      "../supabase/client": { createClient: () => ({ rpc: async () => ({ data, error: null }) }) },
    });
    if (valid) assert.equal((await joinRoom("A1B2C3D4E5")).room_id, "room");
    else await assert.rejects(joinRoom("A1B2C3D4E5"), /참여할 방 정보/);
  }
});

const HOME_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

function myRoomsReader({ session = { user: { id: HOME_USER_ID } }, authError = null,
  data = [], count = data?.length ?? 0, queryError = null } = {}) {
  const calls = [];
  const query = {
    select(...args) { calls.push(["select", ...args]); return this; },
    eq(...args) { calls.push(["eq", ...args]); return this; },
    or(...args) { calls.push(["or", ...args]); return this; },
    order(...args) { calls.push(["order", ...args]); return this; },
    async range(...args) { calls.push(["range", ...args]); return { data, count, error: queryError }; },
  };
  const { getMyRooms } = loadTS("app/lib/rooms/getMyRooms.ts", {
    "../supabase/client": { createClient: () => ({
      auth: { getSession: async () => ({ data: { session }, error: authError }) },
      from(name) { calls.push(["from", name]); return query; },
    }) },
  });
  return { getMyRooms, calls };
}

const myRoomFixture = (overrides = {}) => ({ id: "room", code: "A1B2C3D4E5", prompt: "고양이",
  host_id: HOME_USER_ID, guest_id: null, status: "waiting", created_at: "2026-01-01T00:00:00Z", expires_at: "2099-01-01T00:00:00Z", ...overrides });

test("home visitor does not create an account or query rooms without an existing session", async () => {
  const { getMyRooms, calls } = myRoomsReader({ session: null });
  const result = await getMyRooms();
  assert.equal(result.total, 0);
  assert.equal(result.rooms.length, 0);
  assert.equal(calls.length, 0);
});

test("home list selects participant metadata only and uses stable six-room pagination", async () => {
  const { getMyRooms, calls } = myRoomsReader({ data: [myRoomFixture()], count: 35 });
  const result = await getMyRooms(1);
  assert.equal(result.total, 35);
  assert.equal(result.rooms[0].code, "A1B2C3D4E5");
  assert.equal(calls[0][1], "rooms");
  assert.equal(calls[1][1], "id, code, prompt, status, created_at, expires_at, host_id, guest_id");
  assert.equal(calls[1][2].count, "exact");
  assert.deepEqual(calls[2], ["or", `host_id.eq.${HOME_USER_ID},guest_id.eq.${HOME_USER_ID}`]);
  assert.equal(result.rooms[0].participantRole, "host");
  assert.deepEqual(calls.slice(3).map((call) => [call[0], call[1]]), [["order", "created_at"], ["order", "id"], ["range", 6]]);
  assert.deepEqual(calls.at(-1), ["range", 6, 11]);
});

test("home list supports joined rooms and separately filtered scopes", async () => {
  const joined = myRoomFixture({ host_id: OTHER_USER_ID, guest_id: HOME_USER_ID, status: "completed" });
  const all = myRoomsReader({ data: [myRoomFixture(), joined] });
  const result = await all.getMyRooms();
  assert.deepEqual(Array.from(result.rooms, room => room.participantRole), ["host", "guest"]);
  for (const [scope, column, fixture] of [["host", "host_id", myRoomFixture()], ["guest", "guest_id", joined]]) {
    const reader = myRoomsReader({ data: [fixture] });
    await reader.getMyRooms(0, scope);
    assert.deepEqual(reader.calls[2], ["eq", column, HOME_USER_ID]);
  }
  await assert.rejects(myRoomsReader({ data: [joined] }).getMyRooms(0, "host"), /데이터 형식/);
  await assert.rejects(myRoomsReader({ data: [myRoomFixture({ host_id: OTHER_USER_ID })] }).getMyRooms(), /데이터 형식/);
  await assert.rejects(myRoomsReader().getMyRooms(0, "invalid"), /목록 종류/);
  const malformed = myRoomsReader({ session: { user: { id: "invalid,guest_id.not.is.null" } } });
  await assert.rejects(malformed.getMyRooms(), /사용자 연결/);
  assert.equal(malformed.calls.length, 0);
});

test("home list expires active rooms but preserves completed results", async () => {
  const { getMyRooms } = myRoomsReader({ data: [myRoomFixture({ expires_at: "2000-01-01T00:00:00Z" }),
    myRoomFixture({ status: "completed", expires_at: "2000-01-01T00:00:00Z" })] });
  const result = await getMyRooms();
  assert.equal(result.rooms[0].status, "expired");
  assert.equal(result.rooms[1].status, "completed");
});

test("home list reports connection and malformed-data errors instead of showing a false empty list", async () => {
  await assert.rejects(myRoomsReader({ authError: {} }).getMyRooms(), /사용자 연결/);
  await assert.rejects(myRoomsReader({ queryError: {} }).getMyRooms(), /내 그림 목록을 불러오지/);
  for (const options of [{ data: null }, { data: [{}] }, { data: [myRoomFixture({ status: "other" })] },
    { data: [myRoomFixture({ expires_at: "invalid" })] }, { count: NaN }, { count: -1 }]) {
    await assert.rejects(myRoomsReader(options).getMyRooms(), /데이터 형식/);
  }
  await assert.rejects(myRoomsReader().getMyRooms(-1), /목록 페이지/);
});


test("empty erased and white pixels are rejected while visible ink is accepted", () => {
  const { pixelsHaveInk, hasCanvasInk } = loadTS("app/utils/visibleInk.ts");
  assert.equal(pixelsHaveInk(new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 255])), false);
  assert.equal(pixelsHaveInk(new Uint8ClampedArray([255, 255, 255, 0, 20, 30, 40, 255])), true);
  const rectangles = [];
  const canvas = { width: 800, height: 500, getContext: () => ({ getImageData: (...args) => {
    rectangles.push(args); return { data: new Uint8ClampedArray([255, 255, 255, 255]) };
  } }) };
  assert.equal(hasCanvasInk(canvas, "left"), false);
  assert.equal(hasCanvasInk(canvas, "right"), false);
  assert.deepEqual(rectangles, [[0, 0, 400, 500], [400, 0, 400, 500]]);
});

test("drawing preferences restore each tool independently and reject malformed values", () => {
  const { parseDrawingSettings } = loadTS("app/utils/drawingSettings.ts");
  const restored = parseDrawingSettings({ penWidth: 2, eraserWidth: 30, strokeColor: "#9333ea", tool: "eraser" });
  assert.equal(restored.penWidth, 2);assert.equal(restored.eraserWidth, 30);assert.equal(restored.strokeColor, "#9333ea");assert.equal(restored.tool, "eraser");
  for (const bad of [null, {}, { penWidth: -1, eraserWidth: 999, strokeColor: "javascript:bad", tool: "unknown" }, { penWidth: 2.5, eraserWidth: NaN }]) {
    const parsed = parseDrawingSettings(bad);assert.equal(parsed.penWidth, 4);assert.equal(parsed.eraserWidth, 16);assert.equal(parsed.strokeColor, "#111827");assert.equal(parsed.tool, "pen");
  }
});

test("recent colors migrate old preferences and reject corrupt or duplicate entries", () => {
  const { parseDrawingSettings } = loadTS("app/utils/drawingSettings.ts");
  assert.equal(parseDrawingSettings({ penWidth: 12 }).recentColors.length, 0);
  const settings = parseDrawingSettings({ recentColors: ['#DC2626', null, '#dc2626', 'red', '#a8d5ba', '#2563eb', '#16a34a', '#f59e0b', '#9333ea'] });
  assert.deepEqual(Array.from(settings.recentColors), ['#dc2626', '#a8d5ba', '#2563eb', '#16a34a', '#f59e0b']);
  assert.equal(parseDrawingSettings({ recentColors: 'not an array' }).recentColors.length, 0);
});

test("reusing a recent color promotes it while retaining five unique colors without mutating preferences", () => {
  const { addRecentColor } = loadTS("app/utils/drawingSettings.ts");
  const before = ['#dc2626', '#a8d5ba', '#2563eb', '#16a34a', '#f59e0b'];
  const promoted = addRecentColor(before, '#2563EB');
  assert.deepEqual(Array.from(promoted), ['#2563eb', '#dc2626', '#a8d5ba', '#16a34a', '#f59e0b']);
  assert.deepEqual(Array.from(addRecentColor(promoted, '#ffc798')), ['#ffc798', '#2563eb', '#dc2626', '#a8d5ba', '#16a34a']);
  assert.deepEqual(before, ['#dc2626', '#a8d5ba', '#2563eb', '#16a34a', '#f59e0b']);
  assert.deepEqual(Array.from(addRecentColor(before, 'invalid')), before);
});

function filledPixels(strokes) {
  const { drawStroke } = loadTS('app/utils/drawStroke.ts');
  const pixels = new Set();
  const context = { fillRect(x, y, width, height) {
    assert.ok([x, y, width, height].every(Number.isInteger), 'fill tiles land on exact pixel boundaries');
    for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) pixels.add(`${column},${row}`);
  } };
  for (const stroke of strokes) drawStroke(context, stroke);
  return pixels;
}
test('bucket fills only a connected enclosed area and replays its exact pixels', () => {
  const { createFillStrokes } = loadTS('app/utils/fillRegion.ts');
  const image = { width: 400, height: 500, data: new Uint8ClampedArray(400 * 500 * 4) };
  for (let y = 50; y <= 150; y++) for (let x = 50; x <= 150; x++) {
    if (x === 50 || x === 150 || y === 50 || y === 150) image.data[(y * 400 + x) * 4 + 3] = 255;
  }
  const strokes = createFillStrokes(image, { x: 100, y: 100 }, '#dc2626', 'left', 'one-tap');
  assert.ok(strokes.every(loadTS('app/utils/validateStroke.ts').isStroke));
  const pixels = filledPixels(strokes);
  assert.equal(pixels.size, 99 * 99);
  for (let y = 51; y < 150; y++) for (let x = 51; x < 150; x++) assert.equal(pixels.has(`${x},${y}`), true);
  assert.equal(pixels.has('50,100'), false);
  assert.equal(pixels.has('20,20'), false);
});
test('full-half fills stay compact and existing hint filtering preserves exactly the 24px strip', () => {
  const { createFillStrokes } = loadTS('app/utils/fillRegion.ts');
  const image = { width: 400, height: 500, data: new Uint8ClampedArray(400 * 500 * 4) };
  const strokes = createFillStrokes(image, { x: 400, y: 500 }, '#a8d5ba', 'left', 'edge-tap');
  assert.ok(JSON.stringify(strokes).length < 100000, 'background fills must fit comfortably in browser drafts');
  const hint = strokes.map(stroke => ({ ...stroke, points: stroke.points.filter(point => point.x >= 376 && point.x <= 400) })).filter(stroke => stroke.points.length);
  const pixels = filledPixels(hint);
  assert.equal(pixels.size, 24 * 500);
  assert.ok([...pixels].every(pixel => Number(pixel.split(',')[0]) >= 376 && Number(pixel.split(',')[0]) < 400));
  const right = filledPixels(createFillStrokes(image, { x: 400, y: 0 }, '#2563eb', 'right', 'guest-tap'));
  assert.equal(right.size, 400 * 500);
  assert.ok([...right].every(pixel => Number(pixel.split(',')[0]) >= 400 && Number(pixel.split(',')[0]) < 800));
});
test('bucket compares transparent pixels on white, does not cross diagonal gaps, and skips unchanged color', () => {
  const { createFillStrokes } = loadTS('app/utils/fillRegion.ts');
  const image = { width: 2, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 255]) };
  const red = createFillStrokes(image, { x: 0, y: 0 }, '#2563eb', 'left', 'red');
  assert.deepEqual([...filledPixels(red)], ['0,0']);
  assert.equal(createFillStrokes(image, { x: 1, y: 0 }, '#ffffff', 'left', 'white').length, 0);
  assert.equal(createFillStrokes(image, { x: 0, y: 0 }, '#ff0000', 'left', 'unchanged').length, 0);
  const erased = { width: 3, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 220, 38, 38, 128, 0, 0, 0, 0]) };
  assert.deepEqual([...filledPixels(createFillStrokes(erased, { x: 2, y: 0 }, '#dc2626', 'left', 'restore-edge'))].sort(), ['1,0', '2,0']);
});
test('one bucket tap undoes and redoes all tiles together without affecting adjacent pen or fill actions', () => {
  const { historyReducer } = loadTS('app/hooks/useDrawingHistory.ts');
  const pen = sampleStroke();
  const tiles = [16, 8, 1].map(lineWidth => ({ ...pen, tool: 'fill', lineWidth, fillId: 'first' }));
  let state = historyReducer({ strokes: [pen], undoneStrokes: [] }, { type: 'addMany', strokes: tiles });
  state = historyReducer(state, { type: 'undo' });
  assert.equal(state.strokes.length, 1);
  assert.equal(state.strokes[0], pen);
  assert.equal(state.undoneStrokes.length, 3);
  state = historyReducer(state, { type: 'redo' });
  assert.deepEqual(Array.from(state.strokes), [pen, ...tiles]);
  state = historyReducer(state, { type: 'addMany', strokes: [{ ...tiles[0], fillId: 'second' }] });
  state = historyReducer(state, { type: 'undo' });
  assert.deepEqual(Array.from(state.strokes), [pen, ...tiles]);
  state = historyReducer(state, { type: 'add', stroke: pen });
  assert.equal(state.undoneStrokes.length, 0);
});
test('bucket gestures commit once on release, ignore dragging/second fingers, and cancel without paint', () => {
  const run = setup(false, {}, 'right', 'fill');
  run.handlers.handlePointerDown(run.event(600));
  run.handlers.handlePointerMove(run.event(700));
  run.handlers.handlePointerDown(run.event(650, 100, 2));
  assert.equal(run.fills.length, 0);
  run.handlers.handlePointerUp(run.event(700));
  run.handlers.handlePointerUp(run.event(700));
  assert.equal(run.fills.length, 1);
  assert.equal(run.completed.length, 0);
  assert.deepEqual(run.calls.find(([name]) => name === 'getImageData'), ['getImageData', 400, 0, 400, 500]);
  const cancelled = setup(false, {}, 'left', 'fill');
  cancelled.handlers.handlePointerDown(cancelled.event(100));
  cancelled.handlers.handlePointerUp({ ...cancelled.event(100), type: 'pointercancel' });
  assert.equal(cancelled.fills.length, 0);
  assert.equal(cancelled.captures.size, 0);
});
test('fill preferences restore without changing pen/eraser widths and invalid fill records are rejected', () => {
  const settings = loadTS('app/utils/drawingSettings.ts').parseDrawingSettings({ tool: 'fill', penWidth: 2, eraserWidth: 30 });
  assert.equal(settings.tool, 'fill'); assert.equal(settings.penWidth, 2); assert.equal(settings.eraserWidth, 30);
  const { isStroke } = loadTS('app/utils/validateStroke.ts');
  assert.equal(isStroke({ ...sampleStroke(), tool: 'fill', lineWidth: 3 }), false);
  assert.equal(isStroke({ ...sampleStroke(), tool: 'fill', fillId: 123 }), false);
});

test('native edge navigation is cancelled only for single editable touches on the artist half', () => {
  for (const side of ['left', 'right']) {
    const { listeners } = setup(false, {}, side);
    const { listener, options } = listeners.get('touchstart');
    assert.equal(options.passive, false);
    for (const [clientX, count, cancelable, expected] of [[side === 'left' ? 11 : 799, 1, true, true], [side === 'left' ? 799 : 11, 1, true, false], [400, 1, true, false], [11, 2, true, false], [11, 1, false, false]]) {
      let prevented = false;
      listener({ touches: Array.from({ length: count }, () => ({ clientX, clientY: 100 })), cancelable, preventDefault: () => { prevented = true; } });
      assert.equal(prevented, expected);
    }
  }
  assert.equal(setup(true).listeners.has('touchstart'), false, 'read-only canvases keep native navigation');
});

test('fill completes antialiased borders and recolors them from the original outline without crossing it', () => {
  const { createFillStrokes } = loadTS('app/utils/fillRegion.ts');
  const outline = { width: 4, height: 1, data: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 255, 0, 0, 0, 0]) };
  const red = createFillStrokes(outline, { x: 0, y: 0 }, '#dc2626', 'left', 'red', outline);
  const colorAt = (strokes, x) => strokes.find(stroke => stroke.points.some(point => point.x - stroke.lineWidth / 2 <= x && point.x + stroke.lineWidth / 2 > x))?.color;
  assert.equal(colorAt(red, 0), '#dc2626');
  assert.equal(colorAt(red, 1), '#6e1313');
  assert.equal(colorAt(red, 2), undefined, 'opaque outline is preserved');
  assert.equal(colorAt(red, 3), undefined, 'outside of the closed region remains untouched');
  const filled = { width: 4, height: 1, data: new Uint8ClampedArray([220, 38, 38, 255, 110, 19, 19, 255, 0, 0, 0, 255, 0, 0, 0, 0]) };
  assert.equal(createFillStrokes(filled, { x: 0, y: 0 }, '#dc2626', 'left', 'same-red', outline).length, 0);
  const blue = createFillStrokes(filled, { x: 0, y: 0 }, '#2563eb', 'left', 'blue', outline);
  assert.equal(colorAt(blue, 1), '#123175', 'previous red edge must be replaced with the blue/outline blend');
  assert.ok(blue.every(loadTS('app/utils/validateStroke.ts').isStroke));
});
