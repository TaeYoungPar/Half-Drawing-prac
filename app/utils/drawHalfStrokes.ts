import type { DrawingSide, Stroke } from "../types/drawing";
import { drawStroke } from "./drawStroke";

// Clip pixels too: a thick pen or eraser must not affect the other half.
export function drawHalfStrokes(context: CanvasRenderingContext2D, strokes: Stroke[], side: DrawingSide) {
  const { width, height } = context.canvas;
  context.save();
  context.beginPath();
  context.rect(side === "left" ? 0 : width / 2, 0, width / 2, height);
  context.clip();
  for (const stroke of strokes) drawStroke(context, stroke);
  context.restore();
}
