import type { Stroke } from "../types/drawing";

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke
) {
  const firstPoint = stroke.points[0];

  if (!firstPoint) {
    return;
  }

  context.beginPath();
  context.lineWidth = stroke.lineWidth;
  context.strokeStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}