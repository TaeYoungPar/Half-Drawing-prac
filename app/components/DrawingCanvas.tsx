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


    function handleDownload() {
        downloadCanvasImage(canvasRef.current);
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
        </section>
    );

}