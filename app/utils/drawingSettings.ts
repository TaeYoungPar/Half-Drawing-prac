import type { DrawingTool } from "../types/drawing";

export const SETTINGS_KEY = "half-drawing:tool-settings";
export const DEFAULT_SETTINGS = { penWidth: 4, eraserWidth: 16, strokeColor: "#111827", tool: "pen" as DrawingTool, recentColors: [] as string[] };

const isColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
function parseRecentColors(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isColor).map((color) => color.toLowerCase()))].slice(0, 5) : [];
}

export function addRecentColor(colors: readonly string[], color: string): string[] {
  return parseRecentColors(isColor(color) ? [color, ...colors] : colors);
}

export function parseDrawingSettings(value: unknown): typeof DEFAULT_SETTINGS {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS, recentColors: [] };
  const settings = value as Partial<typeof DEFAULT_SETTINGS>;
  const validWidth = (width: unknown): width is number => typeof width === "number" && Number.isInteger(width) && width >= 1 && width <= 30;
  return {
    penWidth: validWidth(settings.penWidth) ? settings.penWidth : DEFAULT_SETTINGS.penWidth,
    eraserWidth: validWidth(settings.eraserWidth) ? settings.eraserWidth : DEFAULT_SETTINGS.eraserWidth,
    strokeColor: isColor(settings.strokeColor) ? settings.strokeColor : DEFAULT_SETTINGS.strokeColor,
    tool: settings.tool === "eraser" || settings.tool === "fill" ? settings.tool : "pen",
    recentColors: parseRecentColors(settings.recentColors),
  };
}
