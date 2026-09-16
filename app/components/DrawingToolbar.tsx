"use client";

import type { DrawingTool } from "../types/drawing";

type DrawingToolbarProps = {
    lineWidth: number;
    strokeColor: string;
    tool: DrawingTool;

    onToolChange:
    (tool: DrawingTool) => void;

    onLineWidthChange:
    (lineWidth: number) => void;

    onStrokeColorChange:
    (strokeColor: string) => void;

    strokeCount: number;
    undoneStrokeCount: number;

    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
};

export function DrawingToolbar({
    lineWidth,
    strokeColor,
    tool,
    onToolChange,
    onLineWidthChange,
    onStrokeColorChange,
    strokeCount,
    undoneStrokeCount,
    onUndo,
    onRedo,
    onClear,
}: DrawingToolbarProps) {
    const actionButtonClass =
        "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <button
                type="button"
                onClick={() => {
                    onToolChange("pen");
                }}
                aria-pressed={tool === "pen"}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${tool === "pen"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
            >
                펜
            </button>

            <button
                type="button"
                onClick={() => {
                    onToolChange("eraser");
                }}
                aria-pressed={tool === "eraser"}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${tool === "eraser"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
            >
                지우개
            </button>

            <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium">
                <span>선 굵기:</span>

                <span className="w-6 text-right tabular-nums">
                    {lineWidth}
                </span>

                <input
                    type="range"
                    min={1}
                    max={30}
                    value={lineWidth}
                    onChange={(event) => {
                        onLineWidthChange(
                            Number(event.target.value)
                        );
                    }}
                    className="w-32 cursor-pointer accent-gray-900"
                />
            </label>

            <label
                className={`flex items-center gap-2 rounded-lg  bg-gray-50 px-3 py-2 text-sm font-medium ${tool === "eraser"
                    ? "opacity-50"
                    : ""
                    }`}
            >
                선 색상

                <input
                    type="color"
                    value={strokeColor}
                    disabled={tool === "eraser"}
                    onChange={(event) => {
                        onStrokeColorChange(
                            event.target.value
                        );
                    }}
                    className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-transparent disabled:cursor-not-allowed"
                />
            </label>

            <button
                type="button"
                onClick={onUndo}
                disabled={strokeCount === 0}
                className={actionButtonClass}
            >
                실행 취소
            </button>

            <button
                type="button"
                onClick={onRedo}
                disabled={undoneStrokeCount === 0}
                className={actionButtonClass}
            >
                다시 실행
            </button>

            <button
                type="button"
                onClick={onClear}
                className={actionButtonClass}
                disabled={
                    strokeCount === 0 &&
                    undoneStrokeCount === 0
                }
            >
                전체 지우기

            </button>

            <span className="w-28 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                그린 선: {strokeCount}개
            </span>

            <span className="w-28 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                취소된 선: {undoneStrokeCount}개
            </span>
        </div>
    );
}