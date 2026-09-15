"use client";

import { useState } from "react";

import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { DrawingToolbar } from "./DrawingToolbar";

export function DrawingCanvas() {
    const {
        strokes,
        undoneStrokes,
        addStroke,
        undo,
        redo,
        clear,
    } = useDrawingHistory();

    const [lineWidth, setLineWidth] = useState(4);

    const [strokeColor, setStrokeColor] =
        useState("#111827");

    const {
        canvasRef,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    } = useCanvasDrawing({
        strokes,
        lineWidth,
        strokeColor,
        onStrokeComplete: addStroke,
    });

    return (
        <section>
            <DrawingToolbar
                lineWidth={lineWidth}
                strokeColor={strokeColor}
                onLineWidthChange={setLineWidth}
                onStrokeColorChange={setStrokeColor}
                strokeCount={strokes.length}
                undoneStrokeCount={undoneStrokes.length}
                onUndo={undo}
                onRedo={redo}
                onClear={clear}
            />

            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                width={800}
                height={500}
                className="block h-auto w-full max-w-[800px] touch-none border border-gray-400 bg-white"
            />
        </section>
    );

}