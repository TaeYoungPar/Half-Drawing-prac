"use client";

import { useState } from "react";
import { OverlayDialog } from "./OverlayDialog";
import { ToolIcon } from "./ToolIcon";
import type { DrawingTool } from "../types/drawing";

type DrawingToolbarProps = {
  penWidth: number; eraserWidth: number; strokeColor: string; tool: DrawingTool;
  recentColors: string[];
  onDownload: () => void; canDownload?: boolean; disabled?: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onPenWidthChange: (width: number) => void;
  onEraserWidthChange: (width: number) => void;
  onStrokeColorChange: (color: string) => void;
  strokeCount: number; undoneStrokeCount: number;
  onUndo: () => void; onRedo: () => void; onClear: () => void;
};

export function DrawingToolbar({
  penWidth, eraserWidth, strokeColor, tool, recentColors, onToolChange, onPenWidthChange, onEraserWidthChange,
  onStrokeColorChange, strokeCount, undoneStrokeCount, onUndo, onRedo,
  onClear, onDownload, canDownload = true, disabled = false,
}: DrawingToolbarProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"width" | "color">("width");
  const widthSettings = tool === "pen"
    ? { label: "펜 굵기", value: penWidth, onChange: onPenWidthChange, color: strokeColor, presets: [2, 4, 12] }
    : { label: "지우개 굵기", value: eraserWidth, onChange: onEraserWidthChange, color: "#64748b", presets: [8, 16, 30] };
  function showPanel(next: "width" | "color") { setPanel(next); setOpen(true); }
  function chooseColor(color: string) { onStrokeColorChange(color); }
  return (
    <div className="panel drawing-toolbar flex flex-wrap items-center gap-1 p-2 sm:gap-2 sm:p-3" aria-label="그림 도구">
        <div className="flex gap-0 rounded-xl bg-[#f1e5c8] sm:gap-1 sm:p-1" role="group" aria-label="그리기 도구 선택">
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
      <button type="button" onClick={() => showPanel("width")} disabled={disabled} aria-label="굵기 · 더 많은 도구" title="굵기 · 더 많은 도구" aria-expanded={open && panel === "width"} className="toolbar-settings icon-button sm:w-auto sm:gap-2 sm:px-3"><ToolIcon name="settings" /><span className="toolbar-settings-label sr-only sm:not-sr-only">굵기 · 더 많은 도구</span></button>
      <OverlayDialog open={open} setOpen={setOpen} title="그림 도구" className="tool-settings-dialog" bodyClassName="tool-settings-body">
        <div className="tool-settings-tabs mb-4 grid grid-cols-2 gap-2" role="group" aria-label="도구 설정 선택">
          <button type="button" aria-pressed={panel === "color"} disabled={tool === "eraser"} onClick={() => setPanel("color")} className="tool-tab button-secondary">색상</button>
          <button type="button" aria-pressed={panel === "width"} onClick={() => setPanel("width")} className="tool-tab button-secondary">굵기 · 작업</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        {panel === "color" ? <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">기본색 · 파스텔색</p>
            <label className="flex min-h-11 items-center gap-2 text-xs font-semibold">직접 고르기
              <input type="color" value={strokeColor} disabled={disabled} onChange={(event) => onStrokeColorChange(event.target.value)} className="h-11 w-11 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
            </label>
          </div>
          <div className="grid grid-cols-4 justify-items-center gap-1 sm:grid-cols-6" role="group" aria-label="빠른 색상 선택">
            {[["#111827", "검정"], ["#dc2626", "빨강"], ["#f59e0b", "노랑"], ["#16a34a", "초록"], ["#2563eb", "파랑"], ["#9333ea", "보라"], ["#ffc798", "살구"], ["#f3b3bd", "분홍"], ["#ffedb7", "연노랑"], ["#a8d5ba", "민트"], ["#9fc9df", "하늘"], ["#c4b5df", "라벤더"]].map(([color, name]) => (
              <button key={color} type="button" aria-label={`${name} 선택`} title={name} aria-pressed={strokeColor === color} disabled={disabled}
                onClick={() => chooseColor(color)} className="color-swatch"><span className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: color }} /></button>
            ))}
          </div>
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">최근 사용한 색</p>
            <div role="group" aria-label="최근 사용한 색" className="grid min-h-11 grid-cols-5 gap-1">
              {recentColors.length ? recentColors.map((color) => <button key={color} type="button" aria-label={`최근 색 ${color} 선택`} title={color} aria-pressed={strokeColor.toLowerCase() === color} disabled={disabled} onClick={() => chooseColor(color)} className="color-swatch w-full"><span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color }} /></button>)
                : <p className="col-span-5 flex items-center text-xs leading-5 text-slate-600">선으로 그린 색이 여기에 모여요.</p>}
            </div>
          </div>
        </> : <>
          <div className="mb-3 grid grid-cols-2 gap-2" role="group" aria-label="굵기를 조절할 도구">
            {(["pen", "eraser"] as const).map((value) => <button key={value} type="button" aria-label={value === "pen" ? "펜 굵기 선택" : "지우개 굵기 선택"} aria-pressed={tool === value} disabled={disabled} onClick={() => onToolChange(value)} className="tool-toggle w-full! border border-slate-200"><ToolIcon name={value} />{value === "pen" ? "펜" : "지우개"}</button>)}
          </div>
            {[widthSettings].map(({ label, value, onChange, color, presets }) => (
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
          <div className={`mt-4 grid gap-2 ${canDownload ? "grid-cols-3" : "grid-cols-2"}`}>
            <button type="button" onClick={onRedo} disabled={disabled || undoneStrokeCount === 0} className="button-secondary px-2 text-xs">다시 실행</button>
            <button type="button" onClick={onClear} disabled={disabled || (!strokeCount && !undoneStrokeCount)} className="button-secondary px-2 text-xs">전체 지우기</button>
            {canDownload && <button type="button" onClick={onDownload} disabled={disabled || strokeCount === 0} className="button-secondary px-2 text-xs">PNG 저장</button>}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">선택한 도구의 굵기만 조절해요. 펜과 지우개 설정은 따로 기억해요.</p>
        </>}
        </div>
        {panel === "color" && <div className="color-preview-footer mt-2 grid shrink-0 gap-2 border-t border-slate-200 pt-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-xs"><p className="font-semibold text-slate-700">선 미리보기</p><span className="font-mono text-slate-600">{strokeColor.toUpperCase()} · {penWidth}</span></div>
            <svg role="img" aria-label={`${strokeColor} 색상, 펜 굵기 ${penWidth} 선 미리보기`} viewBox="0 0 240 40" className="mt-1 h-8 w-full" data-color={strokeColor} data-pen-width={penWidth}>
              <path d="M16 25 C48 4 72 36 104 20 S160 7 188 22 S216 27 224 15" fill="none" stroke={strokeColor} strokeWidth={penWidth} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <button type="button" onClick={() => setOpen(false)} disabled={disabled} className="button-primary w-full">이 색으로 그리기</button>
        </div>}
      </OverlayDialog>
    </div>
  );
}
