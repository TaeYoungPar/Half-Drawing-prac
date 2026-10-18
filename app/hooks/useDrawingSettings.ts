"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SETTINGS_KEY, addRecentColor, parseDrawingSettings } from "../utils/drawingSettings";
import type { DrawingTool } from "../types/drawing";

export function useDrawingSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSettings(parseDrawingSettings(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null"))); }
      catch { /* Drawing remains available when storage is blocked. */ }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch { /* Tool preferences are optional; draft errors are handled separately. */ }
  }, [settings, restored]);
  return {
    ...settings, restored,
    setPenWidth: (penWidth: number) => setSettings((previous) => ({ ...previous, penWidth })),
    setEraserWidth: (eraserWidth: number) => setSettings((previous) => ({ ...previous, eraserWidth })),
    setStrokeColor: (strokeColor: string) => setSettings((previous) => ({ ...previous, strokeColor })),
    setTool: (tool: DrawingTool) => setSettings((previous) => ({ ...previous, tool })),
    rememberStrokeColor: (color: string) => setSettings((previous) => {
      const recentColors = addRecentColor(previous.recentColors, color);
      return recentColors.length === previous.recentColors.length && recentColors.every((item, index) => item === previous.recentColors[index])
        ? previous : { ...previous, recentColors };
    }),
  };
}
