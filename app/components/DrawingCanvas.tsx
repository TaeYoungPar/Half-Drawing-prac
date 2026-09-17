"use client";

import { useState } from "react";

import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { DrawingToolbar } from "./DrawingToolbar";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";
import type {
    DrawingSide,
    DrawingTool,
} from "../types/drawing";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import {
  createRoom,
  type CreatedRoom,
} from "../lib/drawings/createRoom";

type DrawingCanvasProps = {
    drawingSide: DrawingSide;
};



export function DrawingCanvas({
    drawingSide
}: DrawingCanvasProps) {
    const {
        strokes,
        undoneStrokes,
        addStroke,
        undo,
        redo,
        clear,
    } = useDrawingHistory();

    const [lineWidth, setLineWidth] = useState(4);

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

const [createdRoom, setCreatedRoom] =
  useState<CreatedRoom | null>(null);

    function handleDownload() {
        downloadCanvasImage(canvasRef.current);
    }

    async function handleCreateRoom() {
  const trimmedPrompt = roomPrompt.trim();

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


    return (
        <section className="flex w-full flex-col gap-4">
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
    Supabase 익명 로그인 성공:
    {" "}
    {userId.slice(0, 8)}
  </p>
)}
            <DrawingToolbar
                lineWidth={lineWidth}
                strokeColor={strokeColor}
                onLineWidthChange={setLineWidth}
                onStrokeColorChange={setStrokeColor}
                strokeCount={strokes.length}
                undoneStrokeCount={undoneStrokes.length}
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
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    width={800}
                    height={500}
                    className="block h-auto w-full touch-none border border-gray-400 bg-white"
                />

                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 w-1/2 bg-gray-900/5 ${drawingSide === "left"
                            ? "right-0"
                            : "left-0"
                        }`}
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
      disabled={Boolean(createdRoom)}
      onChange={(event) => {
        setRoomPrompt(event.target.value);
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

    {saveError && (
      <p
        role="alert"
        className="text-sm text-red-600"
      >
        {saveError}
      </p>
    )}

    {createdRoom && (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-800">
          반쪽 그림이 등록되었습니다.
        </p>

        <p className="mt-2 text-sm text-green-700">
          참여 코드:{" "}
          <strong className="font-mono">
            {createdRoom.room_code}
          </strong>
        </p>
      </div>
    )}
  </div>
)}
        </section>
    );

}