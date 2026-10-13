"use client";

import { useState } from "react";
import { OverlayDialog } from "./OverlayDialog";
import { ToolIcon } from "./ToolIcon";
import type { DrawingTool } from "../types/drawing";

type DrawingToolbarProps = {
  penWidth: number; eraserWidth: number; strokeColor: string; tool: DrawingTool;
  onDownload: () => void; canDownload?: boolean; disabled?: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onPenWidthChange: (width: number) => void;
  onEraserWidthChange: (width: number) => void;
  onStrokeColorChange: (color: string) => void;
  strokeCount: number; undoneStrokeCount: number;
  onUndo: () => void; onRedo: () => void; onClear: () => void;
};

export function DrawingToolbar({
  penWidth, eraserWidth, strokeColor, tool, onToolChange, onPenWidthChange, onEraserWidthChange,
  onStrokeColorChange, strokeCount, undoneStrokeCount, onUndo, onRedo,
  onClear, onDownload, canDownload = true, disabled = false,
}: DrawingToolbarProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"width" | "color">("width");
  function showPanel(next: "width" | "color") { setPanel(next); setOpen(true); }
  function chooseColor(color: string) { onStrokeColorChange(color); setOpen(false); }
  return (
    <div className="panel flex flex-col gap-2 p-3" aria-label="그림 도구">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="그리기 도구 선택">
          {(["pen", "eraser"] as const).map((value) => (
            <button key={value} type="button" onClick={() => onToolChange(value)} aria-pressed={tool === value} disabled={disabled} className="tool-toggle">
              <ToolIcon name={value} />{value === "pen" ? "펜" : "지우개"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onUndo} disabled={disabled || strokeCount === 0} className="icon-button" aria-label="마지막 선 실행 취소" title="실행 취소"><ToolIcon name="undo" /></button>
        <button type="button" onClick={() => showPanel("color")} disabled={disabled || tool === "eraser"} aria-label="색상 팔레트" title="색상 팔레트"
          aria-expanded={open && panel === "color"} className="icon-button relative">
          <ToolIcon name="palette" /><span aria-hidden="true" className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: strokeColor }} />
        </button>
      </div>
      <button type="button" onClick={() => showPanel("width")} disabled={disabled} className="min-h-11 rounded-xl px-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50">굵기 · 더 많은 도구</button>
      <OverlayDialog open={open} setOpen={setOpen} title="그림 도구">
        <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="도구 설정 선택">
          <button type="button" aria-pressed={panel === "width"} onClick={() => setPanel("width")} className={panel === "width" ? "button-primary" : "button-secondary"}>굵기 · 작업</button>
          <button type="button" aria-pressed={panel === "color"} disabled={tool === "eraser"} onClick={() => setPanel("color")} className={panel === "color" ? "button-primary" : "button-secondary"}>색상</button>
        </div>
        {panel === "color" ? <>
          <p className="mb-3 text-sm font-semibold">그림 색상</p>
          <div className="grid grid-cols-3 justify-items-center gap-2" role="group" aria-label="빠른 색상 선택">
            {[["#111827", "검정"], ["#dc2626", "빨강"], ["#f59e0b", "노랑"], ["#16a34a", "초록"], ["#2563eb", "파랑"], ["#9333ea", "보라"]].map(([color, name]) => (
              <button key={color} type="button" aria-label={`${name} 선택`} title={name} aria-pressed={strokeColor === color} disabled={disabled}
                onClick={() => chooseColor(color)} className="color-swatch"><span className="h-7 w-7 rounded-full" style={{ backgroundColor: color }} /></button>
            ))}
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium">직접 고르기
            <input type="color" value={strokeColor} disabled={disabled} onChange={(event) => onStrokeColorChange(event.target.value)} className="h-11 w-11 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
          </label>
        </> : <>
          <div className="space-y-4">
            {[
              { label: "펜 굵기", value: penWidth, onChange: onPenWidthChange, color: strokeColor, presets: [2, 4, 12] },
              { label: "지우개 굵기", value: eraserWidth, onChange: onEraserWidthChange, color: "#64748b", presets: [8, 16, 30] },
            ].map(({ label, value, onChange, color, presets }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-sm font-semibold" htmlFor={label === "펜 굵기" ? "pen-width" : "eraser-width"}>{label}</label>
                  <span className="text-sm font-bold tabular-nums text-indigo-700">{value}</span>
                  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center"><span className="rounded-full" style={{ width: value, height: value, backgroundColor: color }} /></span>
                </div>
                <input id={label === "펜 굵기" ? "pen-width" : "eraser-width"} type="range" min={1} max={30} value={value} disabled={disabled} aria-label={label}
                  onChange={(event) => onChange(Number(event.target.value))} className="h-11 w-full cursor-pointer accent-indigo-600" />
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={`${label} 줄이기`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className="icon-button">−</button>
                  {presets.map((size, index) => <button key={size} type="button" aria-label={`${label} ${["얇게", "보통", "굵게"][index]}`} aria-pressed={value === size}
                    disabled={disabled} onClick={() => onChange(size)} className={`min-h-11 flex-1 rounded-xl border px-2 text-xs font-semibold ${value === size ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700"}`}>{["얇게", "보통", "굵게"][index]}</button>)}
                  <button type="button" aria-label={`${label} 늘리기`} disabled={disabled || value >= 30} onClick={() => onChange(value + 1)} className="icon-button">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onRedo} disabled={disabled || undoneStrokeCount === 0} className="icon-button" aria-label="다시 실행" title="다시 실행"><ToolIcon name="redo" /></button>
            <button type="button" onClick={onClear} disabled={disabled || (!strokeCount && !undoneStrokeCount)} className="button-secondary"><ToolIcon name="trash" />전체 지우기</button>
            {canDownload && <button type="button" onClick={onDownload} disabled={disabled || strokeCount === 0} className="button-secondary"><ToolIcon name="download" />PNG 저장</button>}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">펜과 지우개 굵기는 각각 기억해요. 설정을 닫아도 그림 크기는 유지돼요.</p>
        </>}
      </OverlayDialog>
    </div>
  );
}
