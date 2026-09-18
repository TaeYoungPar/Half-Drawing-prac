"use client";

import {
  useEffect,
  useRef,
  type PointerEvent,
} from "react";

import type {
  DrawingSide,
  DrawingTool,
  Point,
  Stroke,
} from "../types/drawing";

import { drawStroke } from "../utils/drawStroke";





type UseCanvasDrawingOptions = {
  backgroundStrokes: Stroke[];
  strokes: Stroke[];
  lineWidth: number;
  strokeColor: string;
  tool: DrawingTool;
  drawingSide: DrawingSide;
  onStrokeComplete: (stroke: Stroke) => void;
};





function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent<HTMLCanvasElement>
): Point {
  const rect = canvas.getBoundingClientRect();

  const scaleX =
    canvas.width / rect.width;

  const scaleY =
    canvas.height / rect.height;

  return {
    x: (
      event.clientX - rect.left
    ) * scaleX,

    y: (
      event.clientY - rect.top
    ) * scaleY,
  };
}

export function useCanvasDrawing({
  backgroundStrokes,
  strokes,
  lineWidth,
  strokeColor,
  tool,
  drawingSide,
  onStrokeComplete,
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

    for (const stroke of backgroundStrokes) {
  drawStroke(context, stroke);
}

for (const stroke of strokes) {
  drawStroke(context, stroke);
}
}, [backgroundStrokes, strokes]);

  function handlePointerDown(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }



    const {
      x,
      y,
    } = getCanvasPoint(
      canvas,
      event
    );

    const middleX = canvas.width / 2;

    if (
      drawingSide === "left" &&
      x > middleX
    ) {
      return;
    }

    if (
      drawingSide === "right" &&
      x < middleX
    ) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }


    isDrawingRef.current = true;

    context.globalCompositeOperation =
      tool === "eraser"
        ? "destination-out" :
        "source-over"

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
      tool,
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

    const { x, y } = getCanvasPoint(
      canvas,
      event
    );

    const middleX = canvas.width / 2;

    if (
      drawingSide === "left" &&
      x > middleX
    ) {
      return;
    }

    if (
      drawingSide === "right" &&
      x < middleX
    ) {
      return;
    }

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