"use client";

import { useId, useState } from "react";
import { ToolIcon } from "./ToolIcon";
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
  const [showPalette, setShowPalette] = useState(false);
  const paletteId = useId();
  function chooseColor(color: string) { onStrokeColorChange(color); setShowPalette(false); }
  return (
    <div className="panel flex flex-col gap-4 p-4" aria-label="그림 도구">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="그리기 도구 선택">
          {(["pen", "eraser"] as const).map((value) => (
            <button key={value} type="button" onClick={() => { onToolChange(value); setShowPalette(false); }}
              aria-pressed={tool === value} disabled={disabled}
              className="tool-toggle">
              <ToolIcon name={value} />{value === "pen" ? "펜" : "지우개"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onUndo} disabled={disabled || strokeCount === 0} className="icon-button" aria-label="마지막 선 실행 취소" title="실행 취소"><ToolIcon name="undo" /></button>
        <button type="button" onClick={() => setShowPalette(!showPalette)} disabled={disabled || tool === "eraser"}
          aria-label="색상 팔레트" title="색상 팔레트" aria-expanded={showPalette} aria-controls={paletteId}
          className="icon-button relative">
          <ToolIcon name="palette" /><span aria-hidden="true" className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: strokeColor }} />
        </button>
      </div>
      {showPalette && <div id={paletteId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold">그림 색상</p>
          <div className="grid grid-cols-3 justify-items-center gap-2" role="group" aria-label="빠른 색상 선택">
            {[["#111827", "검정"], ["#dc2626", "빨강"], ["#f59e0b", "노랑"], ["#16a34a", "초록"], ["#2563eb", "파랑"], ["#9333ea", "보라"]].map(([color, name]) => (
              <button key={color} type="button" aria-label={`${name} 선택`} title={name} aria-pressed={strokeColor === color}
                disabled={disabled || tool === "eraser"} onClick={() => chooseColor(color)}
                className="color-swatch">
                <span className="h-7 w-7 rounded-full" style={{ backgroundColor: color }} />
              </button>
            ))}
          </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-medium">
          직접 고르기
          <input type="color" value={strokeColor} disabled={disabled || tool === "eraser"} onChange={(event) => onStrokeColorChange(event.target.value)}
            className="h-11 w-11 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
        </label>
      </div>}
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-slate-600">굵기 · 더 많은 도구</summary>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
          <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm font-medium">
            <span>{tool === "eraser" ? "지우개" : "선"} 굵기</span>
            <span className="w-6 text-right tabular-nums text-indigo-700">{lineWidth}</span>
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded bg-slate-100"><span className="rounded-full" style={{ width: lineWidth, height: lineWidth, backgroundColor: tool === "eraser" ? "#64748b" : strokeColor }} /></span>
            <input type="range" min={1} max={30} value={lineWidth} disabled={disabled}
              onChange={(event) => onLineWidthChange(Number(event.target.value))}
              className="h-11 w-28 cursor-pointer accent-indigo-600 sm:w-32" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRedo} disabled={disabled || undoneStrokeCount === 0} className="icon-button" aria-label="다시 실행" title="다시 실행"><ToolIcon name="redo" /></button>
            <button type="button" onClick={onClear} disabled={disabled || (!strokeCount && !undoneStrokeCount)} className="button-secondary gap-2"><ToolIcon name="trash" />전체 지우기</button>
            {canDownload && <button type="button" onClick={onDownload} disabled={disabled || strokeCount === 0} className="button-secondary gap-2"><ToolIcon name="download" />PNG 저장</button>}
          </div>
        </div>
      </details>
    </div>
  );
}
