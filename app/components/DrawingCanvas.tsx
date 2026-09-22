"use client";

import {
  useEffect,
  useState,
} from "react";

import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { DrawingToolbar } from "./DrawingToolbar";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";

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

  onSubmitDrawing?: (
    strokes: Stroke[]
  ) => Promise<void>;
};

const EMPTY_BACKGROUND_STROKES: Stroke[] = [];

export function DrawingCanvas({
  drawingSide,
  backgroundStrokes =
    EMPTY_BACKGROUND_STROKES,
  onSubmitDrawing,
}: DrawingCanvasProps) {
  const {
    strokes,
    undoneStrokes,
    addStroke,
    undo,
    redo,
    clear,
  } = useDrawingHistory();

  const [lineWidth, setLineWidth] =
    useState(4);

  const [strokeColor, setStrokeColor] =
    useState("#111827");

  const [tool, setTool] =
    useState<DrawingTool>("pen");

  const {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasDrawing({
    backgroundStrokes,
    strokes,
    lineWidth,
    strokeColor,
    tool,
    drawingSide,
    onStrokeComplete: addStroke,
  });

  const {
    userId,
    isLoading,
    errorMessage,
  } = useAnonymousAuth();

  const [roomPrompt, setRoomPrompt] =
    useState("");

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

  useEffect(() => {
    if (!saveError && !successMessage) {
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
    downloadCanvasImage(canvasRef.current);
  }

  async function handleCreateRoom() {
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

    if (strokes.length === 0) {
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
    if (!onSubmitDrawing) {
      return;
    }

    if (strokes.length === 0) {
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={closeToast}
        >
          <div
            role={
              saveError
                ? "alert"
                : "status"
            }
            onClick={(event) => {
              event.stopPropagation();
            }}
            className={`relative w-full max-w-sm rounded-xl border p-4 pr-12 shadow-lg ${
              saveError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            <p className="text-sm font-medium">
              {saveError ??
                successMessage}
            </p>

            <button
              type="button"
              aria-label="알림 닫기"
              onClick={closeToast}
              className="absolute right-3 top-2 rounded p-1 text-xl leading-none hover:bg-black/10"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-gray-600">
          사용자 연결 중...
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="text-sm text-red-600"
        >
          로그인 오류: {errorMessage}
        </p>
      )}

      {userId && (
        <p className="text-sm text-green-700">
          Supabase 익명 로그인 성공:{" "}
          {userId.slice(0, 8)}
        </p>
      )}

      <DrawingToolbar
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
        onClear={clear}
        tool={tool}
        onToolChange={setTool}
        onDownload={handleDownload}
      />

      <p className="text-sm font-medium text-gray-700">
        {drawingSide === "left"
          ? "왼쪽 절반에 그림을 그려주세요."
          : "오른쪽 절반에 그림을 이어 그려주세요."}
      </p>

      <div className="relative w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={handlePointerUp}
          onPointerLeave={
            handlePointerUp
          }
          width={800}
          height={500}
          className="block h-auto w-full touch-none border border-gray-400 bg-white"
        />

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 ${
            drawingSide === "left"
              ? "right-0 w-1/2"
              : "left-0 w-[calc(50%_-_24px)]"
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
            disabled={Boolean(
              createdRoom
            )}
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
              !userId ||
              strokes.length === 0 ||
              Boolean(createdRoom)
            }
            className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? "등록 중..."
              : "반쪽 그림 등록"}
          </button>

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
                strokes.length === 0 ||
                isDrawingSubmitted
              }
              className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving
                ? "완성 중..."
                : "이어 그리기 완료"}
            </button>
          </div>
        )}
    </section>
  );
}