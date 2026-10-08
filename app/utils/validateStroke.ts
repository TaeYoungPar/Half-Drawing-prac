import type { Stroke } from "../types/drawing";

// JSON and localStorage are untyped at runtime. Reject invalid radii and
// coordinates before Canvas arc() or result replay can throw.
export function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Partial<Stroke>;
  return Array.isArray(stroke.points) && stroke.points.length > 0 &&
    stroke.points.every((point) => point &&
      Number.isFinite(point.x) && point.x >= 0 && point.x <= 800 &&
      Number.isFinite(point.y) && point.y >= 0 && point.y <= 500) &&
    typeof stroke.color === "string" && /^#[0-9a-f]{6}$/i.test(stroke.color) &&
    typeof stroke.lineWidth === "number" && Number.isFinite(stroke.lineWidth) &&
    stroke.lineWidth >= 1 && stroke.lineWidth <= 30 &&
    (stroke.tool === "pen" || stroke.tool === "eraser");
}

export function isStrokeArray(value: unknown): value is Stroke[] {
  return Array.isArray(value) && value.every(isStroke);
}
