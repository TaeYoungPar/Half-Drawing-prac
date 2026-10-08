"use client";

import {
  useEffect,
  useRef,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawHalfStrokes } from "../utils/drawHalfStrokes";
import Link from "next/link";
import { downloadCanvasImage } from "../utils/downloadCanvasImage";

type DrawingResultCanvasProps = {
  leftStrokes: Stroke[];
  rightStrokes: Stroke[];
};

export function DrawingResultCanvas({
  leftStrokes,
  rightStrokes,
}: DrawingResultCanvasProps) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    // The finished drawing is replayed in the same order as the two artists worked.
    drawHalfStrokes(context, leftStrokes, "left");
    drawHalfStrokes(context, rightStrokes, "right");
  }, [leftStrokes, rightStrokes]);

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        aria-label="두 사람이 함께 완성한 그림"
        className="block h-auto w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
      />
      <button
        type="button"
        onClick={() => downloadCanvasImage(canvasRef.current)}
        className="button-primary self-start"
      >
        완성 그림 PNG 저장
      </button>
      <p className="text-sm text-slate-500">이 그림은 참여한 두 사람만 볼 수 있어요. 잊기 전에 기기에 저장해주세요.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href="/draw" className="button-secondary">새 그림 시작하기</Link>
        <Link href="/" className="button-secondary">홈으로</Link>
      </div>
    </div>
  );
}
