"use client";

import {
    useEffect,
    useRef,
    useState,
    type PointerEvent,
} from "react";

import type { Stroke } from "../types/drawing";
import { drawStroke } from "../utils/drawStroke";


export function DrawingCanvas() {
    const canvasRef =
        useRef<HTMLCanvasElement>(null);
    const currentStrokeRef =
        useRef<Stroke | null>(null);
    const [strokes, setStrokes] =
        useState<Stroke[]>([]);
    const isDrawingRef = useRef(false);
    const [undoneStrokes, setUndoneStrokes] =
        useState<Stroke[]>([]);

    const [lineWidth, setLineWidth] =
        useState(4);
    const [strokeColor, setStrokeColor] =
        useState("#111827");



    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height);

        for (const stroke of strokes) {
            drawStroke(
                context,
                stroke
            );
        }
    }, [strokes]);


    function handlePointerDown(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }


        isDrawingRef.current = true;

        context.beginPath();
        context.lineWidth = lineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = strokeColor;
        context.moveTo(x, y);

        currentStrokeRef.current = {
            points: [{ x, y }],
            color: strokeColor,
            lineWidth: lineWidth,
        };
    }

    function handlePointerMove(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        if (!isDrawingRef.current) {
            return;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const currentStroke = currentStrokeRef.current;

        if (!currentStroke) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.lineTo(x, y);
        context.stroke();

        currentStroke.points.push({ x, y });
    }

    function handlePointerUp() {
        isDrawingRef.current = false;

        const completedStroke =
            currentStrokeRef.current;

        if (!completedStroke) {
            return;
        }

        setStrokes((previousStrokes) => [
            ...previousStrokes,
            completedStroke,
        ]);

        setUndoneStrokes([]);

        currentStrokeRef.current = null;
    }

    function handleClear() {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
        setStrokes([]);
        setUndoneStrokes([]);
    }

function handleUndo() {
  const lastStroke =
    strokes[strokes.length - 1];

  if (!lastStroke) {
    return;
  }

  setStrokes((previousStrokes) =>
    previousStrokes.slice(0, -1)
  );

  setUndoneStrokes((previousUndoneStrokes) => [
    ...previousUndoneStrokes,
lastStroke
  ]);
}

function handleRedo() {
  const restoredStroke =
    undoneStrokes[
      undoneStrokes.length - 1
    ];

  if (!restoredStroke) {
    return;
  }

  setStrokes((previousStrokes) => [
    ...previousStrokes,
restoredStroke
  ]);

  setUndoneStrokes((previousUndoneStrokes) =>
    previousUndoneStrokes.slice(0, -1)
  );
}



    return (
        <section>
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                width={800}
                height={500}
                className="border border-gray-400"
            />


            <label>
                선 굵기: {lineWidth}

                <input
                    type="range"
                    min={1}
                    max={30}
                    value={lineWidth}
                    onChange={(event) => {
                        setLineWidth(Number(event.target.value));
                    }}
                />
            </label>
            <label>
                선 색상

                <input
                    type="color"
                    value={strokeColor}
                    onChange={(event) => {
                        setStrokeColor(event.target.value);
                    }}
                />
            </label>
            <button
                type="button"
                onClick={handleClear}
            >
                전체 지우기
            </button>

            <span>그린 선: {strokes.length}개</span>
            <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0}
            >
                실행 취소
            </button>

            <button
  type="button"
  onClick={handleRedo}
  disabled={undoneStrokes.length === 0}
>
  다시 실행
</button>
<span>
  취소된 선: {undoneStrokes.length}개
</span>
        </section>
        
    );
}