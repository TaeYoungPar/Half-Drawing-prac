"use client";

import {
  useEffect,
  useRef,
  type PointerEvent,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawStroke } from "../utils/drawStroke";






type UseCanvasDrawingOptions = {
  strokes: Stroke[];
  lineWidth: number;
  strokeColor: string;
  onStrokeComplete: (stroke: Stroke) => void;
};

export function useCanvasDrawing({
  strokes,
  lineWidth,
  strokeColor,
  onStrokeComplete
}: UseCanvasDrawingOptions) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const currentStrokeRef =
    useRef<Stroke | null>(null);

  const isDrawingRef = useRef(false);

  useEffect(() => {
  const canvas = canvasRef.current;

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  for (const stroke of strokes) {
    drawStroke(context, stroke);
  }
}, [strokes]);

 function handlePointerDown(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }


        isDrawingRef.current = true;

        context.beginPath();
        context.lineWidth = lineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = strokeColor;
        context.moveTo(x, y);

        currentStrokeRef.current = {
            points: [{ x, y }],
            color: strokeColor,
            lineWidth: lineWidth,
        };
    }


       function handlePointerMove(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        if (!isDrawingRef.current) {
            return;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const currentStroke = currentStrokeRef.current;

        if (!currentStroke) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.lineTo(x, y);
        context.stroke();

        currentStroke.points.push({ x, y });
    }

   function handlePointerUp() {
  isDrawingRef.current = false;

  const completedStroke =
    currentStrokeRef.current;

  if (!completedStroke) {
    return;
  }

  onStrokeComplete(completedStroke);

  currentStrokeRef.current = null;
}

return {
 canvasRef,
handlePointerDown,
handlePointerMove,
handlePointerUp
};
}