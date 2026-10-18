import type { Stroke } from "../types/drawing";

export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke
) {
  const firstPoint = stroke.points[0];

  if (!firstPoint) {
    return;
  }

  context.globalCompositeOperation =
  stroke.tool === "eraser"
    ? "destination-out"
    : "source-over";

  if (stroke.tool === "fill") {
    context.fillStyle = stroke.color;
    for (const point of stroke.points) {
      context.fillRect(point.x - stroke.lineWidth / 2, point.y - stroke.lineWidth / 2, stroke.lineWidth, stroke.lineWidth);
    }
    return;
  }

  context.beginPath();
  context.lineWidth = stroke.lineWidth;
  context.strokeStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";

  // A tap produces one point, so stroke() alone would leave it invisible.
  if (stroke.points.length === 1) {
    context.beginPath();
    context.fillStyle = stroke.color;
    context.arc(firstPoint.x, firstPoint.y, stroke.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}
