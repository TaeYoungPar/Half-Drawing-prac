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
  vm.runInNewContext("(function(exports, require) {" + source + "\n})", {}, { filename: full })(exports, requireLocal);
  return exports;
}

function setup(readOnly = false) {
  const calls = [];
  const captures = new Set();
  const context = {};
  const canvas = {
    width: 800, height: 500, clientWidth: 800, clientHeight: 500, clientLeft: 1, clientTop: 1,
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    getContext: () => context,
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  context.canvas = canvas;
  for (const method of ["save", "restore", "beginPath", "rect", "clip", "arc", "fill", "moveTo", "lineTo", "stroke", "clearRect"]) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  let refIndex = 0;
  const stateUpdates = [];
  const react = { useRef: (value) => ({ current: refIndex++ === 0 ? canvas : value }), useEffect: (fn) => fn(), useState: (value) => [value, (next) => stateUpdates.push(next)] };
  const { useCanvasDrawing } = loadTS("app/hooks/useCanvasDrawing.ts", { react });
  const completed = [];
  const handlers = useCanvasDrawing({
    backgroundStrokes: [], strokes: [], lineWidth: 4, strokeColor: "#111827",
    tool: "pen", drawingSide: "left", readOnly, onStrokeComplete: (stroke) => completed.push(stroke),
  });
  const event = (x, y = 100, pointerId = 1, button = 0) => ({
    clientX: x + 11, clientY: y + 21, pointerId, button, type: "pointerup", preventDefault() {},
  });
  return { handlers, completed, calls, captures, event, stateUpdates };
}

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

function myRoomsReader({ session = { user: { id: "host" } }, authError = null,
  data = [], count = data?.length ?? 0, queryError = null } = {}) {
  const calls = [];
  const query = {
    select(...args) { calls.push(["select", ...args]); return this; },
    eq(...args) { calls.push(["eq", ...args]); return this; },
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
  status: "waiting", created_at: "2026-01-01T00:00:00Z", expires_at: "2099-01-01T00:00:00Z", ...overrides });

test("home visitor does not create an account or query rooms without an existing session", async () => {
  const { getMyRooms, calls } = myRoomsReader({ session: null });
  const result = await getMyRooms();
  assert.equal(result.total, 0);
  assert.equal(result.rooms.length, 0);
  assert.equal(calls.length, 0);
});

test("home list selects host metadata only and uses stable six-room pagination", async () => {
  const { getMyRooms, calls } = myRoomsReader({ data: [myRoomFixture()], count: 35 });
  const result = await getMyRooms(1);
  assert.equal(result.total, 35);
  assert.equal(result.rooms[0].code, "A1B2C3D4E5");
  assert.equal(calls[0][1], "rooms");
  assert.equal(calls[1][1], "id, code, prompt, status, created_at, expires_at");
  assert.equal(calls[1][2].count, "exact");
  assert.deepEqual(calls[2], ["eq", "host_id", "host"]);
  assert.deepEqual(calls.slice(3).map((call) => [call[0], call[1]]), [["order", "created_at"], ["order", "id"], ["range", 6]]);
  assert.deepEqual(calls.at(-1), ["range", 6, 11]);
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
