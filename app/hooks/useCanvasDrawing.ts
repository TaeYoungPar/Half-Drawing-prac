"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { DrawingSide, DrawingTool, Point, Stroke } from "../types/drawing";
import { drawHalfStrokes } from "../utils/drawHalfStrokes";
import { createFillStrokes } from "../utils/fillRegion";

type UseCanvasDrawingOptions = {
  backgroundStrokes: Stroke[];
  strokes: Stroke[];
  lineWidth: number;
  strokeColor: string;
  tool: DrawingTool;
  drawingSide: DrawingSide;
  readOnly: boolean;
  onStrokeComplete: (stroke: Stroke) => void;
  onFillComplete: (strokes: Stroke[]) => void;
};

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  // Preserve fractional CSS dimensions in focused view; clientWidth rounds them.
  // The canvas has no border in the UI (legacy bordered canvases remain supported).
  const displayWidth = rect.width ? rect.width - canvas.clientLeft * 2 : canvas.clientWidth;
  const displayHeight = rect.height ? rect.height - canvas.clientTop * 2 : canvas.clientHeight;
  // Bitmap starts inside the border, not at the outside bounding rectangle.
  return {
    x: Math.max(0, Math.min(canvas.width,
      (event.clientX - rect.left - canvas.clientLeft) * canvas.width / displayWidth)),
    y: Math.max(0, Math.min(canvas.height,
      (event.clientY - rect.top - canvas.clientTop) * canvas.height / displayHeight)),
  };
}

export function useCanvasDrawing({ backgroundStrokes, strokes, lineWidth, strokeColor,
  tool, drawingSide, readOnly, onStrokeComplete, onFillComplete }: UseCanvasDrawingOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    drawHalfStrokes(context, backgroundStrokes, drawingSide === "left" ? "right" : "left");
    drawHalfStrokes(context, strokes, drawingSide);
  }, [backgroundStrokes, strokes, drawingSide]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (readOnly || activePointerRef.current !== null || event.button !== 0) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = getCanvasPoint(canvas, event);
    const middle = canvas.width / 2;
    if ((drawingSide === "left" && point.x > middle) ||
        (drawingSide === "right" && point.x < middle)) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    setIsDrawing(true);
    const stroke: Stroke = { points: [point], color: strokeColor, lineWidth, tool };
    currentStrokeRef.current = stroke;
    if (tool !== "fill") drawHalfStrokes(context, [stroke], drawingSide);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (readOnly || activePointerRef.current !== event.pointerId) return;
    const canvas = canvasRef.current;
    const stroke = currentStrokeRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !stroke || stroke.tool === "fill") return;
    const point = getCanvasPoint(canvas, event);
    // Capture keeps receiving movement outside the canvas; clamp to own half.
    point.x = Math.max(drawingSide === "left" ? 0 : canvas.width / 2,
      Math.min(drawingSide === "left" ? canvas.width / 2 : canvas.width, point.x));
    point.y = Math.max(0, Math.min(canvas.height, point.y));
    const previous = stroke.points[stroke.points.length - 1];
    if (previous.x === point.x && previous.y === point.y) return;
    drawHalfStrokes(context, [{ ...stroke, points: [previous, point] }], drawingSide);
    stroke.points.push(point);
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== event.pointerId) return;
    // The final pointerup may arrive without a preceding pointermove.
    // Cancellation/lost capture coordinates are not a valid drawing sample.
    if (event.type === "pointerup") handlePointerMove(event);
    const stroke = currentStrokeRef.current;
    // Clear before release, which may dispatch lostpointercapture again.
    activePointerRef.current = null;
    currentStrokeRef.current = null;
    setIsDrawing(false);
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    if (stroke?.tool === "fill") {
      if (event.type !== "pointerup") return;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const image = context.getImageData(drawingSide === "left" ? 0 : canvas.width / 2, 0, canvas.width / 2, canvas.height);
      const fill = createFillStrokes(image, stroke.points[0], stroke.color, drawingSide, crypto.randomUUID());
      if (fill.length) {
        drawHalfStrokes(context, fill, drawingSide);
        onFillComplete(fill);
      }
    } else if (stroke) onStrokeComplete(stroke);
  }

  return { canvasRef, handlePointerDown, handlePointerMove, handlePointerUp, isDrawing };
}
