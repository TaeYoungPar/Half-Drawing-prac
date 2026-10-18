import type { DrawingSide, Point, Stroke } from "../types/drawing";

/** Flood only the caller's half, matching visible RGB on the white canvas. */
type FillPixels = Pick<ImageData, "width" | "height" | "data">;

export function createFillStrokes(image: FillPixels, seed: Point, color: string, side: DrawingSide, fillId: string, outline?: FillPixels): Stroke[] {
  const { width, height, data } = image;
  const originX = side === "right" ? width : 0;
  const x = Math.max(0, Math.min(width - 1, Math.floor(seed.x - originX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(seed.y)));
  const rgb = (pixel: number, channel: number) => Math.round(255 + (data[pixel * 4 + channel] - 255) * data[pixel * 4 + 3] / 255);
  const first = y * width + x;
  const target = [rgb(first, 0), rgb(first, 1), rgb(first, 2)];
  const replacement = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
  if (!outline && target.every((value, channel) => value === replacement[channel])) return [];

  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let count = 0;
  const visit = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const matchesTarget = target.every((value, channel) => Math.abs(value - rgb(pixel, channel)) <= 24);
    // Refill a partially erased edge with its original color without leaving a
    // pale ring. Opaque boundaries still stop the flood.
    const restoresErasedEdge = data[pixel * 4 + 3] > 0 && data[pixel * 4 + 3] < 255 &&
      replacement.every((value, channel) => Math.abs(value - data[pixel * 4 + channel]) <= 2) &&
      (!outline || outline.data[pixel * 4 + 3] === 0);
    if (!matchesTarget && !restoresErasedEdge) return;
    visited[pixel] = 2;
    stack[count++] = pixel;
  };
  visit(first);
  while (count) {
    const pixel = stack[--count];
    const column = pixel % width;
    if (column > 0) visit(pixel - 1);
    if (column + 1 < width) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel + width < width * height) visit(pixel + width);
  }

  const repairEdges = outline && outline.data[first * 4 + 3] === 0;
  if (repairEdges) {
    // Follow increasing pen coverage into the antialias band. Joins can span
    // more than one pixel, but decreasing coverage on the far side is excluded.
    for (let pixel = 0; pixel < visited.length; pixel++) if (visited[pixel] === 2) stack[count++] = pixel;
    while (count) {
      const current = stack[--count];
      const column = current % width, row = Math.floor(current / width);
      const coverage = outline.data[current * 4 + 3];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = column + dx, ny = row + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const pixel = ny * width + nx, alpha = outline.data[pixel * 4 + 3];
        if (visited[pixel] < 2 && alpha > 0 && alpha < 255 && alpha >= coverage) {
          visited[pixel] = 3;
          stack[count++] = pixel;
        }
      }
    }
  }

  // Store the final edge colors too, so replay/undo/hints need no new format.
  // Rebuild from the pen/eraser coverage rather than a previous fill's fringe;
  // recoloring a red region blue must not leave a red ring beside the outline.
  const colors = new Uint32Array(width * height);
  let changed = false;
  for (let pixel = 0; pixel < colors.length; pixel++) {
    if (visited[pixel] < 2) continue;
    const alpha = repairEdges ? outline.data[pixel * 4 + 3] / 255 : 0;
    let packed = 0;
    for (let channel = 0; channel < 3; channel++) {
      const value = alpha > 0 && alpha < 1
        ? Math.round(outline!.data[pixel * 4 + channel] * alpha + replacement[channel] * (1 - alpha))
        : replacement[channel];
      if (value !== data[pixel * 4 + channel]) changed = true;
      packed = packed * 256 + value;
    }
    if (data[pixel * 4 + 3] !== 255) changed = true;
    colors[pixel] = packed + 1;
  }
  if (!changed) return [];

  // Compress exact pixels into squares. Large backgrounds stay small in JSON,
  // without raster uploads, antialiased pen caps, or recalculating fills on replay.
  const stride = width + 1;
  const sums = new Int32Array(stride * (height + 1));
  for (let row = 0; row < height; row++) {
    let total = 0;
    for (let column = 0; column < width; column++) {
      total += colors[row * width + column] ? 1 : 0;
      sums[(row + 1) * stride + column + 1] = sums[row * stride + column + 1] + total;
    }
  }
  const groups = new Map<string, Stroke>();
  function tile(left: number, top: number, size: number) {
    if (left >= width || top >= height) return;
    const right = Math.min(width, left + size), bottom = Math.min(height, top + size);
    const area = sums[bottom * stride + right] - sums[top * stride + right] - sums[bottom * stride + left] + sums[top * stride + left];
    if (!area) return;
    // The existing hint RPC filters point centers at x=376. Split tiles there
    // so it can return the exact 24px strip without SQL or hidden geometry.
    const crossesHint = side === "left" && left < 376 && left + size > 376;
    const packed = colors[top * width + left];
    let uniform = right - left === size && bottom - top === size && area === size * size && !crossesHint;
    for (let row = top; uniform && row < bottom; row++) for (let column = left; column < right; column++) {
      if (colors[row * width + column] !== packed) { uniform = false; break; }
    }
    if (uniform) {
      const paint = `#${(packed - 1).toString(16).padStart(6, "0")}`;
      const key = `${size}:${paint}`;
      const stroke = groups.get(key) ?? { tool: "fill", lineWidth: size, points: [], color: paint, fillId };
      stroke.points.push({ x: originX + left + size / 2, y: top + size / 2 });
      groups.set(key, stroke);
    } else {
      const half = size / 2;
      tile(left, top, half); tile(left + half, top, half);
      tile(left, top + half, half); tile(left + half, top + half, half);
    }
  }
  for (let top = 0; top < height; top += 16) {
    for (let left = 0; left < width; left += 16) tile(left, top, 16);
  }
  return [...groups.values()];
}
