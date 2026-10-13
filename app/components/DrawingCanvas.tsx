"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { useDrawingSettings } from "../hooks/useDrawingSettings";
import { useOverlayHistory } from "../hooks/useOverlayHistory";
import { lockBodyScroll } from "../utils/bodyScrollLock";
import { hasCanvasInk } from "../utils/visibleInk";
import { DrawingToolbar } from "./DrawingToolbar";
import { DrawingNotice } from "./DrawingNotice";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";
import { copyRoomCode } from "../utils/copyRoomCode";

import type {
  DrawingSide,
  Stroke,
} from "../types/drawing";

import { useAnonymousAuth } from "../hooks/useAnonymousAuth";

import {
  createRoom,
  type CreatedRoom,
} from "../lib/drawings/createRoom";

type DrawingCanvasProps = {
  drawingSide: DrawingSide;
  backgroundStrokes?: Stroke[];
  draftId?: string;

  onSubmitDrawing?: (
    strokes: Stroke[]
  ) => Promise<void>;
};

const EMPTY_BACKGROUND_STROKES: Stroke[] = [];

export function DrawingCanvas({
  drawingSide,
  backgroundStrokes =
    EMPTY_BACKGROUND_STROKES,
  draftId,
  onSubmitDrawing,
}: DrawingCanvasProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const storageKey = `half-drawing:draft:${draftId ?? drawingSide}`;
  const {
    strokes,
    undoneStrokes,
    addStroke,
    undo,
    redo,
    clear,
    discardDraft,
    isRestoring,
    draftError,
  } = useDrawingHistory(storageKey);

  const { penWidth, eraserWidth, strokeColor, tool, setPenWidth, setEraserWidth, setStrokeColor, setTool, restored: settingsRestored } = useDrawingSettings();
  const [hasInk, setHasInk] = useState(false);
  const autoStarted = useRef(false);
  useOverlayHistory(isExpanded, setIsExpanded, "drawing");

  const lineWidth = tool === "pen" ? penWidth : eraserWidth;
  const reviewRef = useRef<HTMLDivElement>(null);
  const [reviewRequested, setReviewRequested] = useState(false);

  const {
    userId,
    isLoading,
    errorMessage,
    retry,
  } = useAnonymousAuth();

  const [roomPrompt, setRoomPrompt] =
    useState("");
  const [isPromptRestored, setIsPromptRestored] = useState(false);
  const promptStorageKey = "half-drawing:draft:prompt";

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [createdRoom, setCreatedRoom] =
    useState<CreatedRoom | null>(null);

  const [
    isDrawingSubmitted,
    setIsDrawingSubmitted,
  ] = useState(false);

  // Once sent, local edits would differ from the drawing saved in the room.
  const readOnly = isRestoring || !settingsRestored || isSaving || Boolean(createdRoom) || isDrawingSubmitted;
  const {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing,
  } = useCanvasDrawing({
    backgroundStrokes,
    strokes,
    lineWidth,
    strokeColor,
    tool,
    drawingSide,
    readOnly,
    onStrokeComplete: addStroke,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHasInk(hasCanvasInk(canvasRef.current, drawingSide)));
    return () => window.cancelAnimationFrame(frame);
  }, [canvasRef, strokes, drawingSide]);

  useEffect(() => {
    if (isRestoring || !settingsRestored || autoStarted.current) return;
    if (!window.matchMedia("(max-width: 767px)").matches) { autoStarted.current = true; return; }
    const frame = window.requestAnimationFrame(() => { autoStarted.current = true; setIsExpanded(true); });
    return () => window.cancelAnimationFrame(frame);
  }, [isRestoring, settingsRestored]);

  useEffect(() => {
    if (!isExpanded || !sectionRef.current) return;
    const section = sectionRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();
    const inertElements: Array<[HTMLElement, boolean]> = [];
    // Keep the drawing mounted so switching views preserves the current strokes.
    let ancestor: HTMLElement = section;
    while (ancestor.parentElement) {
      for (const sibling of ancestor.parentElement.children) {
        if (sibling !== ancestor && sibling instanceof HTMLElement && sibling.tagName !== "DIALOG") {
          inertElements.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      ancestor = ancestor.parentElement;
      if (ancestor === document.body) break;
    }
    section.querySelector<HTMLButtonElement>("[data-view-toggle]")?.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !section.querySelector("[data-view-toggle]")?.hasAttribute("disabled")) setIsExpanded(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(section.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), summary, a[href]"))
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
    section.addEventListener("keydown", onKeyDown);
    return () => {
      section.removeEventListener("keydown", onKeyDown);
      unlock();
      for (const [element, inert] of inertElements) element.inert = inert;
      previousFocus?.focus();
    };
  }, [isExpanded]);

  useEffect(() => {
    if (drawingSide !== "left") return;
    const timer = window.setTimeout(() => {
      try {
        setRoomPrompt(window.localStorage.getItem(promptStorageKey)?.slice(0, 80) ?? "");
      } catch {
        // Drawing is still possible when browser storage is unavailable.
      }
      setIsPromptRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drawingSide]);

  useEffect(() => {
    if (drawingSide !== "left" || !isPromptRestored || createdRoom) return;
    try {
      if (roomPrompt) window.localStorage.setItem(promptStorageKey, roomPrompt);
      else window.localStorage.removeItem(promptStorageKey);
    } catch {
      // The drawing hook reports storage errors for the more valuable strokes.
    }
  }, [drawingSide, roomPrompt, isPromptRestored, createdRoom]);

  useEffect(() => {
    // Errors stay until dismissed so users have enough time to read them.
    if (saveError || !successMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSaveError(null);
      setSuccessMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [saveError, successMessage]);

  useEffect(() => {
    if (isExpanded || !reviewRequested) return;
    const frame = window.requestAnimationFrame(() => {
      reviewRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      reviewRef.current?.querySelector<HTMLElement>("input:not(:disabled), button:not(:disabled)")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded, reviewRequested]);

  useEffect(() => {
    if (isExpanded || !reviewRequested) return;
    const viewport = window.visualViewport;
    const onResize = () => {
      if (document.activeElement === reviewRef.current?.querySelector("input")) {
        document.activeElement?.scrollIntoView({ block: "center" });
      }
    };
    viewport?.addEventListener("resize", onResize);
    return () => viewport?.removeEventListener("resize", onResize);
  }, [isExpanded, reviewRequested]);

  function finishFocusedDrawing() {
    if (isDrawing || readOnly || !hasCanvasInk(canvasRef.current, drawingSide)) return;
    setReviewRequested(true);
    setIsExpanded(false);
  }

  function closeToast() {
    setSaveError(null);
    setSuccessMessage(null);
  }

  function handleDownload() {
    if (isDrawing || isSaving) return;
    downloadCanvasImage(canvasRef.current);
  }

  function handleClear() {
    if (readOnly || isDrawing) return;
    if (strokes.length === 0 && undoneStrokes.length === 0) return;
    if (window.confirm("모든 선을 지울까요? 지운 뒤에는 실행 취소할 수 없습니다.")) {
      clear();
    }
  }

  async function handleCopyCode() {
    if (!createdRoom) return;
    try {
      await copyRoomCode(createdRoom.room_code);
      setSuccessMessage("참여 코드를 복사했습니다.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "코드를 복사하지 못했습니다.");
    }
  }

  async function handleCreateRoom() {
    if (readOnly || isDrawing) return;
    const trimmedPrompt =
      roomPrompt.trim();

    if (!userId) {
      setSaveError(
        "사용자 연결이 완료되지 않았습니다."
      );
      return;
    }

    if (!trimmedPrompt) {
      setSaveError(
        "그림 주제를 입력해주세요."
      );
      return;
    }

    if (!hasCanvasInk(canvasRef.current, drawingSide)) {
      setSaveError(
        "그림을 한 개 이상 그려주세요."
      );
      return;
    }

    if (!window.confirm("이 그림으로 등록할까요? 등록 후에는 수정할 수 없습니다.")) return;

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const room = await createRoom(
        trimmedPrompt,
        strokes
      );

      setCreatedRoom(room);
      discardDraft();
      try {
        window.localStorage.removeItem(promptStorageKey);
      } catch {
        // A successful server save should still navigate to the room.
      }
      // The waiting page keeps the code visible after refresh.
      router.push(`/rooms/${room.room_id}`);
    } catch (error) {
      if (error instanceof Error) {
        setSaveError(error.message);
      } else {
        setSaveError(
          "방을 생성하지 못했습니다."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitDrawing() {
    if (readOnly || isDrawing || !onSubmitDrawing) {
      return;
    }

    if (!userId) {
      setSaveError("사용자 연결을 확인하고 다시 시도해주세요.");
      return;
    }
    if (!hasCanvasInk(canvasRef.current, drawingSide)) {
      setSaveError(
        "오른쪽에 그림을 한 개 이상 그려주세요."
      );
      return;
    }

    if (!window.confirm("이어 그리기를 완료할까요? 완료 후에는 수정할 수 없습니다.")) return;

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      await onSubmitDrawing(strokes);

      setIsDrawingSubmitted(true);
      discardDraft();

      setSuccessMessage(
        "완성된 그림이 저장되었습니다."
      );
    } catch (error) {
      if (error instanceof Error) {
        setSaveError(error.message);
      } else {
        setSaveError(
          "이어 그린 그림을 저장하지 못했습니다."
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section ref={sectionRef} className={`flex w-full flex-col gap-4 ${isExpanded ? "drawing-expanded" : ""}`}
      role={isExpanded ? "dialog" : undefined} aria-modal={isExpanded || undefined} aria-label={isExpanded ? "내 반쪽 크게 그리기" : undefined} data-drawing-side={drawingSide}>
      {(saveError || successMessage) && (
        <DrawingNotice message={saveError ?? successMessage ?? ""} isError={Boolean(saveError)} onClose={closeToast} />
      )}

      {isLoading && (
        <p className="text-sm text-slate-600">
          연결 중… 그림은 먼저 그릴 수 있어요.
        </p>
      )}

      {errorMessage && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p>{errorMessage} 그림은 이 브라우저에 임시 저장돼요.</p>
        <button type="button" onClick={retry} className="button-secondary mt-3">연결 다시 시도</button>
      </div>}

      {draftError && <p role="alert" className="text-sm text-amber-700">{draftError}</p>}

      <div className="drawing-tools">
      <DrawingToolbar
        disabled={readOnly || isDrawing}
        penWidth={penWidth}
        eraserWidth={eraserWidth}
        strokeColor={strokeColor}
        onPenWidthChange={setPenWidth}
        onEraserWidthChange={setEraserWidth}
        onStrokeColorChange={
          setStrokeColor
        }
        strokeCount={strokes.length}
        undoneStrokeCount={
          undoneStrokes.length
        }
        onUndo={undo}
        onRedo={redo}
        onClear={handleClear}
        tool={tool}
        onToolChange={setTool}
        onDownload={handleDownload}
        // On the guest's canvas the hidden half still exists in pixels.
        // Only the finished result view may export both halves together.
        canDownload={drawingSide === "left"}
      />
      </div>

      <p className="text-sm font-medium text-slate-700">
        {drawingSide === "left"
          ? "왼쪽 절반에 그림을 그려주세요."
          : "오른쪽 절반에 그림을 이어 그려주세요."}
      </p>
      {readOnly && (createdRoom || isDrawingSubmitted) && (
        <p className="text-sm text-slate-600">저장된 그림은 수정할 수 없습니다.</p>
      )}

      <div className="drawing-view-controls flex flex-wrap items-center gap-2">
        <button data-view-toggle type="button" aria-pressed={isExpanded} disabled={isDrawing} onClick={() => { setReviewRequested(false); setIsExpanded(!isExpanded); }} className="button-secondary">{isExpanded ? "그리기 화면으로 돌아가기" : "내 반쪽 크게 그리기"}</button>
        {isExpanded && <button type="button" onClick={finishFocusedDrawing} disabled={readOnly || isDrawing || !hasInk} className="button-primary">다 그렸어요</button>}
        {isExpanded && (errorMessage || draftError) && <div role="alert" className="w-full rounded-xl bg-amber-50 p-2 text-sm text-amber-900">
          {draftError ?? errorMessage}
          {errorMessage && <button type="button" onClick={retry} className="button-secondary ml-2">연결 다시 시도</button>}
        </div>}
        {isExpanded && !hasInk && strokes.length > 0 && <p role="status" className="text-sm text-amber-800">남은 그림이 없어요. 다시 그려주세요.</p>}
        {isExpanded && <p className="text-xs text-slate-500">{drawingSide === "left" ? "오른쪽 점선까지 그리면 친구 그림과 이어져요." : "왼쪽의 얇은 힌트를 보고 점선부터 이어 그려요."}</p>}
      </div>
      <div className="drawing-stage w-full max-w-[800px]">
      <div className="drawing-frame relative w-full overflow-hidden rounded-xl border border-slate-300" aria-label="그림 작업 영역">
        <div className="drawing-bitmap relative w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          aria-label={drawingSide === "left" ? "왼쪽 반쪽 그림 그리기" : "오른쪽 반쪽 그림 그리기"}
          width={800}
          height={500}
          className={`block h-auto w-full touch-none bg-white ${readOnly ? "cursor-not-allowed" : "cursor-crosshair"}`}
        />

        <div
          aria-hidden="true"
          className={`pointer-events-auto touch-pan-y absolute inset-y-0 ${
            drawingSide === "left"
              ? "right-0 w-[calc(50%-1px)]"
              : "left-0 w-[47%]"
          }`}
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #f3f4f6 0, #f3f4f6 8px, #d1d5db 8px, #d1d5db 16px)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-slate-400"
        />
        </div>
      </div>
      </div>

      <details className="text-sm text-slate-600">
        <summary className="min-h-11 cursor-pointer py-3">자동 저장 · 그림 연결 안내</summary>
        <p className="text-sm leading-6">{isRestoring ? "임시 그림 복원 중…" : "완료한 선은 이 브라우저에 자동 임시 저장돼요. 다른 기기에서는 복원되지 않아요."}</p>
        <p className="mt-2 text-sm leading-6">점선이 친구 그림과 이어지는 경계예요. 이어질 선은 점선까지 그려주세요. 큰 보기에서 돌아오면 전체 그림을 볼 수 있어요.</p>
      </details>

      {drawingSide === "left" && (
        <div ref={reviewRef} className="flex w-full max-w-[800px] flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {reviewRequested && <p role="status" className="text-sm font-semibold text-indigo-700">그림 주제를 확인하고 등록해주세요. 아직 친구에게 전송되지 않았어요.</p>}
          <label
            htmlFor="room-prompt"
            className="text-sm font-medium text-slate-700"
          >
            그림 주제
          </label>

          <input
            id="room-prompt"
            type="text"
            maxLength={80}
            value={roomPrompt}
            disabled={readOnly || isDrawing || !isPromptRestored}
            onChange={(event) => {
              setRoomPrompt(
                event.target.value
              );
            }}
            placeholder="예: 우주를 여행하는 고양이"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-indigo-600 disabled:bg-slate-100"
          />

          <div className="text-right text-xs text-slate-500">
            {roomPrompt.length}/80
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={
              isSaving ||
              isDrawing ||
              isRestoring ||
              !userId ||
              !roomPrompt.trim() ||
              !hasInk ||
              Boolean(createdRoom)
            }
            className="button-primary"
          >
            {isSaving
              ? "등록 중..."
              : "반쪽 그림 등록"}
          </button>
          {strokes.length > 0 && !hasInk && <p role="status" className="text-sm text-amber-800">남은 그림이 없어요. 다시 그리면 등록할 수 있어요.</p>}
          {(!hasInk || !roomPrompt.trim()) && <p className="text-sm text-slate-600">그림과 주제를 채우면 등록할 수 있어요.</p>}
          <p className="text-xs leading-5 text-slate-500">등록하면 그림을 수정할 수 없어요. 다음 화면에서 친구에게 줄 참여 코드를 확인할 수 있어요.</p>

          {createdRoom && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-800">
                반쪽 그림이
                등록되었습니다.
              </p>

              <p className="mt-2 text-sm text-green-700">
                참여 코드:{" "}
                <strong className="font-mono">
                  {
                    createdRoom.room_code
                  }
                </strong>
              </p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="button-secondary mt-3"
              >
                참여 코드 복사
              </button>
              <a
                href={`/rooms/${createdRoom.room_id}`}
                className="mt-3 inline-block text-sm font-medium text-green-800 underline"
              >
                방으로 이동해 완성 결과 기다리기
              </a>
            </div>
          )}
        </div>
      )}

      {drawingSide === "right" &&
        onSubmitDrawing && (
          <div ref={reviewRef} className="flex w-full max-w-[800px] flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {reviewRequested && <p role="status" className="text-sm font-semibold text-indigo-700">경계 연결을 확인하고 완료해주세요. 아직 제출되지 않았어요.</p>}
            <button
              type="button"
              onClick={
                handleSubmitDrawing
              }
              disabled={
                isSaving ||
                isDrawing ||
                isRestoring ||
                !userId ||
                !hasInk ||
                isDrawingSubmitted
              }
              className="button-primary"
            >
              {isSaving
                ? "완성 중..."
                : "이어 그리기 완료"}
            </button>
            {strokes.length > 0 && !hasInk && <p role="status" className="text-sm text-amber-800">남은 그림이 없어요. 다시 그려주세요.</p>}
            {!hasInk && <p className="text-sm text-slate-600">펜으로 선을 그리면 완료할 수 있어요.</p>}
            <p className="text-xs leading-5 text-slate-500">완료하면 수정할 수 없어요. 두 사람의 그림이 합쳐진 결과를 바로 확인해요.</p>
          </div>
        )}
    </section>
  );
}
