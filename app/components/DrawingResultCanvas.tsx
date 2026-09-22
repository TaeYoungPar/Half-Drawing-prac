"use client";

import {
  useEffect,
  useRef,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawStroke } from "../utils/drawStroke";

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

    for (const stroke of leftStrokes) {
      drawStroke(context, stroke);
    }

    for (const stroke of rightStrokes) {
      drawStroke(context, stroke);
    }
  }, [leftStrokes, rightStrokes]);

  return (
    <div className="w-full max-w-[800px]">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="block h-auto w-full border border-gray-400 bg-white"
      />
    </div>
  );
}