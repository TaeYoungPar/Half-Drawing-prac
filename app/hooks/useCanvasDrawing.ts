"use client";

import {
  useEffect,
  useRef,
  type PointerEvent,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawStroke } from "../utils/drawStroke";






type UseCanvasDrawingOptions = {
  strokes: Stroke[];
  lineWidth: number;
  strokeColor:string;
  onStrokeComplete: (stroke: Stroke) => void;
};