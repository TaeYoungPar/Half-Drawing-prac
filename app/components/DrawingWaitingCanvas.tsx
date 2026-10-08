"use client";

import { useEffect, useRef } from "react";
import type { Stroke } from "../types/drawing";
import { drawHalfStrokes } from "../utils/drawHalfStrokes";

/** Shows the saved first half while the second artist is working. */
export function DrawingWaitingCanvas({ strokes }: { strokes: Stroke[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawHalfStrokes(context, strokes, "left");
  }, [strokes]);

  return (
    <div className="relative w-full max-w-[800px]" aria-label="내가 등록한 왼쪽 그림">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="block h-auto w-full border border-gray-400 bg-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #f3f4f6 0, #f3f4f6 8px, #d1d5db 8px, #d1d5db 16px)",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-gray-400" />
    </div>
  );
}
