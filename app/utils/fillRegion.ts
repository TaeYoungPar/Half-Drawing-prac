import type { DrawingSide, Point, Stroke } from "../types/drawing";

/** Flood only the caller's half, matching visible RGB on the white canvas. */
export function createFillStrokes(image: Pick<ImageData, "width" | "height" | "data">, seed: Point, color: string, side: DrawingSide, fillId: string): Stroke[] {
  const { width, height, data } = image;
  const originX = side === "right" ? width : 0;
  const x = Math.max(0, Math.min(width - 1, Math.floor(seed.x - originX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(seed.y)));
  const rgb = (pixel: number, channel: number) => Math.round(255 + (data[pixel * 4 + channel] - 255) * data[pixel * 4 + 3] / 255);
  const first = y * width + x;
  const target = [rgb(first, 0), rgb(first, 1), rgb(first, 2)];
  const replacement = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
  if (target.every((value, channel) => value === replacement[channel])) return [];

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
      replacement.every((value, channel) => Math.abs(value - data[pixel * 4 + channel]) <= 2);
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

  // Compress exact pixels into squares. Large backgrounds stay small in JSON,
  // without raster uploads, antialiased pen caps, or recalculating fills on replay.
  const stride = width + 1;
  const sums = new Int32Array(stride * (height + 1));
  for (let row = 0; row < height; row++) {
    let total = 0;
    for (let column = 0; column < width; column++) {
      total += visited[row * width + column] === 2 ? 1 : 0;
      sums[(row + 1) * stride + column + 1] = sums[row * stride + column + 1] + total;
    }
  }
  const groups = new Map<number, Point[]>();
  function tile(left: number, top: number, size: number) {
    if (left >= width || top >= height) return;
    const right = Math.min(width, left + size), bottom = Math.min(height, top + size);
    const area = sums[bottom * stride + right] - sums[top * stride + right] - sums[bottom * stride + left] + sums[top * stride + left];
    if (!area) return;
    // The existing hint RPC filters point centers at x=376. Split tiles there
    // so it can return the exact 24px strip without SQL or hidden geometry.
    const crossesHint = side === "left" && left < 376 && left + size > 376;
    if (right - left === size && bottom - top === size && area === size * size && !crossesHint) {
      const points = groups.get(size) ?? [];
      points.push({ x: originX + left + size / 2, y: top + size / 2 });
      groups.set(size, points);
    } else {
      const half = size / 2;
      tile(left, top, half); tile(left + half, top, half);
      tile(left, top + half, half); tile(left + half, top + half, half);
    }
  }
  for (let top = 0; top < height; top += 16) {
    for (let left = 0; left < width; left += 16) tile(left, top, 16);
  }
  return [...groups].map(([lineWidth, points]) => ({ tool: "fill", lineWidth, points, color, fillId }));
}
