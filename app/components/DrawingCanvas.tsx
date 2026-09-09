"use client";

import {
    useRef,
    useState,
    type PointerEvent,
} from "react";

export function DrawingCanvas() {
    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    const isDrawingRef = useRef(false);

    const [lineWidth, setLineWidth] =
  useState(4);
  const [strokeColor, setStrokeColor] =
  useState("#111827");


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

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.lineTo(x, y);
        context.stroke();
    }

    function handlePointerUp() {
        isDrawingRef.current = false;
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
        </section>
    );
}