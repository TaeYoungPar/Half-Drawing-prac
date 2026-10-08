"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { DrawingToolbar } from "./DrawingToolbar";
import { DrawingNotice } from "./DrawingNotice";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";
import { copyRoomCode } from "../utils/copyRoomCode";

import type {
  DrawingSide,
  DrawingTool,
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

  const [lineWidth, setLineWidth] =
    useState(4);

  const [strokeColor, setStrokeColor] =
    useState("#111827");

  const [tool, setTool] =
    useState<DrawingTool>("pen");

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
  const readOnly = isRestoring || isSaving || Boolean(createdRoom) || isDrawingSubmitted;
  const scrollRef = useRef<HTMLDivElement>(null);
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
    // On a small screen, show the artist's half first at its natural size.
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = drawingSide === "right" ? 376 : 0;
    }
  }, [drawingSide]);

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

    if (!strokes.some((stroke) => stroke.tool === "pen")) {
      setSaveError(
        "그림을 한 개 이상 그려주세요."
      );
      return;
    }

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
    if (!strokes.some((stroke) => stroke.tool === "pen")) {
      setSaveError(
        "오른쪽에 그림을 한 개 이상 그려주세요."
      );
      return;
    }

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
    <section className="flex w-full flex-col gap-4">
      {(saveError || successMessage) && (
        <DrawingNotice message={saveError ?? successMessage ?? ""} isError={Boolean(saveError)} onClose={closeToast} />
      )}

      {isLoading && (
        <p className="text-sm text-gray-600">
          연결 중… 그림은 먼저 그릴 수 있어요.
        </p>
      )}

      {errorMessage && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p>{errorMessage} 그림은 이 브라우저에 임시 저장돼요.</p>
        <button type="button" onClick={retry} className="button-secondary mt-3">연결 다시 시도</button>
      </div>}

      {draftError && <p role="alert" className="text-sm text-amber-700">{draftError}</p>}

      <DrawingToolbar
        disabled={readOnly || isDrawing}
        lineWidth={lineWidth}
        strokeColor={strokeColor}
        onLineWidthChange={setLineWidth}
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

      <p className="text-sm font-medium text-gray-700">
        {drawingSide === "left"
          ? "왼쪽 절반에 그림을 그려주세요."
          : "오른쪽 절반에 그림을 이어 그려주세요."}
      </p>
      <p className="text-xs leading-5 text-slate-500">
        {isRestoring ? "임시 그림 복원 중…" : "완료한 선은 이 브라우저에 자동 임시 저장돼요. 다른 기기에서는 이어서 복원되지 않아요."}
      </p>

      {readOnly && (createdRoom || isDrawingSubmitted) && (
        <p className="text-sm text-gray-600">저장된 그림은 수정할 수 없습니다.</p>
      )}

      <div className="flex gap-2 md:hidden">
        <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: -240, behavior: "smooth" })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">← 왼쪽으로 이동</button>
        <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: 240, behavior: "smooth" })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">오른쪽으로 이동 →</button>
      </div>
      <p className="text-xs text-slate-500 md:hidden">휴대폰에서는 위 버튼으로 작업 영역을 이동해요. 그림 위에서는 손가락으로 바로 그릴 수 있어요.</p>
      <div ref={scrollRef} className="w-full max-w-[800px] overflow-x-auto" aria-label="그림 작업 영역">
      <div className="relative w-[800px] md:w-full">
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
          className={`block h-auto w-full touch-none border border-gray-400 bg-white ${readOnly ? "cursor-not-allowed" : "cursor-crosshair"}`}
        />

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 ${
            drawingSide === "left"
              ? "right-0 w-1/2"
              : "left-0 w-[47%]"
          }`}
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #f3f4f6 0, #f3f4f6 8px, #d1d5db 8px, #d1d5db 16px)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-gray-400"
        />
      </div>
      </div>

      {drawingSide === "left" && (
        <div className="flex w-full max-w-[800px] flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label
            htmlFor="room-prompt"
            className="text-sm font-medium text-gray-700"
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
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900 disabled:bg-gray-100"
          />

          <div className="text-right text-xs text-gray-500">
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
              !strokes.some((stroke) => stroke.tool === "pen") ||
              Boolean(createdRoom)
            }
            className="button-primary"
          >
            {isSaving
              ? "등록 중..."
              : "반쪽 그림 등록"}
          </button>
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
                className="mt-3 rounded-lg border border-green-700 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
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
          <div className="flex w-full max-w-[800px] flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
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
                !strokes.some((stroke) => stroke.tool === "pen") ||
                isDrawingSubmitted
              }
              className="button-primary"
            >
              {isSaving
                ? "완성 중..."
                : "이어 그리기 완료"}
            </button>
            <p className="text-xs leading-5 text-slate-500">완료하면 수정할 수 없어요. 두 사람의 그림이 합쳐진 결과를 바로 확인해요.</p>
          </div>
        )}
    </section>
  );
}
