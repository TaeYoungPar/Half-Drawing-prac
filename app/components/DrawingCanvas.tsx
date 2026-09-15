"use client";

import { useState } from "react";


import { useDrawingHistory } from "../hooks/useDrawingHistory";
import { useCanvasDrawing } from "../hooks/useCanvasDrawing";
export function DrawingCanvas() {


    const {
        strokes,
        undoneStrokes,
        addStroke,
        undo,
        redo,
        clear,
    } = useDrawingHistory();




    const [lineWidth, setLineWidth] =
        useState(4);
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
                onClick={clear}
            >
                전체 지우기
            </button>

            <span>그린 선: {strokes.length}개</span>
            <button
                type="button"
                onClick={undo}
                disabled={strokes.length === 0}
            >
                실행 취소
            </button>

            <button
                type="button"
                onClick={redo}
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