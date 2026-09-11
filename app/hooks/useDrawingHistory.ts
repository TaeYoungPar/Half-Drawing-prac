"use client";

import { useReducer } from "react";
import type { Stroke } from "../types/drawing";

type DrawingHistory = {
    strokes: Stroke[];
    undoneStrokes: Stroke[];
};

type DrawingAction =
    | {
        type: "add";
        stroke: Stroke;
    }
    | {
        type: "undo";
    }
    | {
        type: "redo";
    }
    | {
        type: "clear";
    };

const initialHistory: DrawingHistory = {
    strokes: [],
    undoneStrokes: []
};

function historyReducer(
    state: DrawingHistory,
    action: DrawingAction
): DrawingHistory {
    switch (action.type) {
        case "add":
            return {
                strokes: [
                    ...state.strokes,
                    action.stroke,
                ],
                undoneStrokes: [],
            };

        case "clear":
            return {
                strokes: [],
                undoneStrokes: [],
            };

        case "undo": {
            const lastStroke =
                state.strokes[state.strokes.length - 1];

            if (!lastStroke) {
                return state
            }


            return {
                strokes: state.strokes.slice(0, -1),
                undoneStrokes: [
                    ...state.undoneStrokes,
                    lastStroke,
                ],
            };
        }

        case "redo": {
            const restoredStroke =
                state.undoneStrokes[
                state.undoneStrokes.length - 1
                ];

            if (!restoredStroke) {
                return state
            }

            return {
                strokes: [...state.strokes, restoredStroke],
                undoneStrokes: state.undoneStrokes.slice(0, -1),


            };
        }

        default:
            return state;
    }
}

export function useDrawingHistory() {
    const [history, dispatch] = useReducer(
        historyReducer, initialHistory

    );


    function addStroke(stroke: Stroke) {
        dispatch({
            type: "add",
            stroke: stroke,
        });
    }

    function undo() {
        dispatch({
            type: "undo",
        });
    }

    function redo() {
        dispatch({
            type: "redo",
        });
    }

    function clear() {
        dispatch({
            type: "clear",
        });
    }

    return {
        strokes: history.strokes,
        undoneStrokes: history.undoneStrokes,
        addStroke,
        undo,
        redo,
        clear,
    };


}


