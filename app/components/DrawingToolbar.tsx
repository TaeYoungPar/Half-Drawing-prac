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
    onClear
}: DrawingToolbarProps) {
    return (
        <div>
            <label>
                선 굵기: {lineWidth}

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
                />
            </label>
            <label>
                선 색상

                <input
                    type="color"
                    value={strokeColor}
                    onChange={(event) => {
                        onStrokeColorChange(event.target.value);
                    }}
                />
            </label>
            <button
                type="button"
                onClick={onClear}
            >
                전체 지우기
            </button>
            <button
                type="button"
                onClick={onUndo}
                disabled={strokeCount === 0}
            >
                실행 취소
            </button>

            <button
                type="button"
                onClick={onRedo}
                disabled={undoneStrokeCount === 0}
            >
                다시 실행
            </button>
            <span>
                그린 선: {strokeCount}개
            </span>

            <span>
                취소된 선: {undoneStrokeCount}개
            </span>

            <button
  type="button"
  onClick={() => {
    onToolChange("pen");
  }}
  aria-pressed={tool === "pen"}
  className={
    tool === "pen"
      ? "bg-gray-900 text-white"
      : "bg-white text-gray-900"
  }
>
  펜
</button>

<button
  type="button"
  onClick={() => {
    onToolChange("eraser");
  }}
  aria-pressed={tool === "eraser"}
  className={
    tool === "eraser"
      ? "bg-gray-900 text-white"
      : "bg-white text-gray-900"
  }
>
  지우개
</button>
        </div>
    );
}