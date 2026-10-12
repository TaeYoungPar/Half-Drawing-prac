"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawHalfStrokes } from "../utils/drawHalfStrokes";
import Link from "next/link";
import { downloadCanvasImage, shareCanvasImage } from "../utils/downloadCanvasImage";

type DrawingResultCanvasProps = {
  leftStrokes: Stroke[];
  rightStrokes: Stroke[];
};

export function DrawingResultCanvas({
  leftStrokes,
  rightStrokes,
}: DrawingResultCanvasProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  async function handleShare() {
    if (isSharing) return;
    setIsSharing(true);
    setShareMessage(null);
    try {
      setShareMessage(await shareCanvasImage(canvasRef.current));
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "이미지를 공유하지 못했습니다.");
    } finally {
      setIsSharing(false);
    }
  }
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
        className="block h-auto w-full rounded-xl border border-slate-300 bg-white"
      />
      <button type="button" onClick={handleShare} disabled={isSharing} className="button-primary self-start">{isSharing ? "이미지 준비 중…" : "완성 그림 공유"}</button>
      {shareMessage && <p role="status" className="text-sm text-slate-600">{shareMessage}</p>}
      <button
        type="button"
        onClick={() => downloadCanvasImage(canvasRef.current)}
        className="button-secondary self-start"
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
