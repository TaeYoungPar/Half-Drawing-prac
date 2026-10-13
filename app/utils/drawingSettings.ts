import type { DrawingTool } from "../types/drawing";

export const SETTINGS_KEY = "half-drawing:tool-settings";
export const DEFAULT_SETTINGS = { penWidth: 4, eraserWidth: 16, strokeColor: "#111827", tool: "pen" as DrawingTool };

export function parseDrawingSettings(value: unknown): typeof DEFAULT_SETTINGS {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const settings = value as Partial<typeof DEFAULT_SETTINGS>;
  const validWidth = (width: unknown): width is number => typeof width === "number" && Number.isInteger(width) && width >= 1 && width <= 30;
  return {
    penWidth: validWidth(settings.penWidth) ? settings.penWidth : DEFAULT_SETTINGS.penWidth,
    eraserWidth: validWidth(settings.eraserWidth) ? settings.eraserWidth : DEFAULT_SETTINGS.eraserWidth,
    strokeColor: typeof settings.strokeColor === "string" && /^#[0-9a-f]{6}$/i.test(settings.strokeColor) ? settings.strokeColor : DEFAULT_SETTINGS.strokeColor,
    tool: settings.tool === "eraser" ? "eraser" : "pen",
  };
}
