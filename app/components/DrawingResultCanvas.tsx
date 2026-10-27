"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Stroke } from "../types/drawing";
import { OverlayDialog } from "./OverlayDialog";
import { CompletedShareOptions } from "./CompletedShareOptions";
import { drawHalfStrokes } from "../utils/drawHalfStrokes";
import Link from "next/link";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";

type DrawingResultCanvasProps = {
  prompt: string;
  leftStrokes: Stroke[];
  rightStrokes: Stroke[];
  children?: ReactNode;
};

export function DrawingResultCanvas({
  prompt,
  leftStrokes,
  rightStrokes,
  children,
}: DrawingResultCanvasProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    for (const canvas of [canvasRef.current, previewRef.current]) {
      const context = canvas?.getContext("2d");
      if (!canvas || !context) continue;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawHalfStrokes(context, leftStrokes, "left");
      drawHalfStrokes(context, rightStrokes, "right");
    }
  }, [leftStrokes, rightStrokes, previewOpen]);

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <button type="button" onClick={() => { setZoom(1); setPreviewOpen(true); }} aria-label="완성 그림 크게 보기" className="relative block w-full rounded-xl text-left">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        aria-label="두 사람이 함께 완성한 그림"
        className="block h-auto w-full rounded-xl border border-slate-300 bg-white"
      />
      <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">⤢ 크게 보기</span>
      </button>
      <OverlayDialog open={previewOpen} setOpen={setPreviewOpen} title="완성 그림 크게 보기" wide>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" aria-label="완성 그림 축소" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - .5))} className="icon-button">−</button>
          <span className="w-14 text-center text-sm font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="완성 그림 확대" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + .5))} className="icon-button">+</button>
          <button type="button" onClick={() => setZoom(1)} className="button-secondary">화면에 맞춤</button>
        </div>
        <div className="result-preview-scroll rounded-xl border border-slate-200 bg-slate-50" aria-label="확대 그림 이동 영역">
          <canvas ref={previewRef} width={800} height={500} aria-label="확대한 완성 그림" className="block bg-white" style={{ width: `${zoom * 100}%`, maxWidth: "none", height: "auto" }} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">확대한 뒤 손가락으로 움직여 세부를 확인하세요. 그림 파일 크기는 그대로예요.</p>
      </OverlayDialog>
      <CompletedShareOptions drawingRef={canvasRef} prompt={prompt} />
      <button
        type="button"
        onClick={() => downloadCanvasImage(canvasRef.current)}
        className="button-secondary self-start"
      >
        완성 그림 PNG 저장
      </button>
      <p className="text-sm text-slate-500">이 그림은 참여한 두 사람만 볼 수 있어요. 잊기 전에 기기에 저장해주세요.</p>
      {children}
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href="/draw" className="button-secondary">새 그림 시작하기</Link>
        <Link href="/library" className="button-secondary">내 보관함으로</Link>
        <Link href="/" className="button-secondary">홈으로</Link>
      </div>
    </div>
  );
}
