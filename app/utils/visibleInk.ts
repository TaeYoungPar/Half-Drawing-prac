import type { DrawingSide } from "../types/drawing";

/** Export uses a white background, so white and fully erased pixels are empty. */
export function pixelsHaveInk(pixels: ArrayLike<number>): boolean {
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] > 0 && (pixels[index] < 255 || pixels[index + 1] < 255 || pixels[index + 2] < 255)) return true;
  }
  return false;
}

export function hasCanvasInk(canvas: HTMLCanvasElement | null, side: DrawingSide): boolean {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return false;
  return pixelsHaveInk(context.getImageData(side === "left" ? 0 : canvas.width / 2, 0, canvas.width / 2, canvas.height).data);
}
