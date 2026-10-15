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
    <div className="relative w-full max-w-[800px] overflow-hidden rounded-xl border border-slate-300" aria-label="내가 등록한 왼쪽 그림">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="block h-auto w-full bg-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #f7f0dc 0, #f7f0dc 8px, #dfd1b2 8px, #dfd1b2 16px)",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-slate-400" />
    </div>
  );
}
