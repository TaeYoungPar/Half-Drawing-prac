"use client";

import type { DrawingTool } from "../types/drawing";

type DrawingToolbarProps = {
  lineWidth: number; strokeColor: string; tool: DrawingTool;
  onDownload: () => void; canDownload?: boolean; disabled?: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onLineWidthChange: (width: number) => void;
  onStrokeColorChange: (color: string) => void;
  strokeCount: number; undoneStrokeCount: number;
  onUndo: () => void; onRedo: () => void; onClear: () => void;
};

export function DrawingToolbar({
  lineWidth, strokeColor, tool, onToolChange, onLineWidthChange,
  onStrokeColorChange, strokeCount, undoneStrokeCount, onUndo, onRedo,
  onClear, onDownload, canDownload = true, disabled = false,
}: DrawingToolbarProps) {
  return (
    <div className="panel flex flex-col gap-4 p-4" aria-label="그림 도구">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="그리기 도구 선택">
          {(["pen", "eraser"] as const).map((value) => (
            <button key={value} type="button" onClick={() => onToolChange(value)}
              aria-pressed={tool === value} disabled={disabled}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-40 ${tool === value ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>
              {value === "pen" ? "펜" : "지우개"}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm font-medium">
          <span>{tool === "eraser" ? "지우개" : "선"} 굵기</span>
          <span className="w-6 text-right tabular-nums text-indigo-700">{lineWidth}</span>
          <input type="range" min={1} max={30} value={lineWidth} disabled={disabled}
            onChange={(event) => onLineWidthChange(Number(event.target.value))}
            className="h-11 w-28 cursor-pointer accent-indigo-600 sm:w-32" />
        </label>
        <label className={`flex min-h-11 items-center gap-2 text-sm font-medium ${tool === "eraser" ? "opacity-40" : ""}`}>
          색상
          <input type="color" value={strokeColor} disabled={disabled || tool === "eraser"}
            onChange={(event) => onStrokeColorChange(event.target.value)}
            className="h-11 w-11 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-not-allowed" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onUndo} disabled={disabled || strokeCount === 0} className="button-secondary">↶ 실행 취소</button>
        <button type="button" onClick={onRedo} disabled={disabled || undoneStrokeCount === 0} className="button-secondary">↷ 다시 실행</button>
        <button type="button" onClick={onClear} disabled={disabled || (!strokeCount && !undoneStrokeCount)} className="button-secondary">전체 지우기</button>
        {canDownload && <button type="button" onClick={onDownload} disabled={disabled || strokeCount === 0} className="button-secondary">PNG 저장 ↓</button>}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 sm:ml-auto">
          <span className="w-28 whitespace-nowrap tabular-nums">그린 선: {strokeCount}개</span>
          <span className="w-28 whitespace-nowrap tabular-nums">취소된 선: {undoneStrokeCount}개</span>
        </div>
      </div>
    </div>
  );
}
