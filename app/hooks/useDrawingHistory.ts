"use client";

import { useEffect, useReducer, useState } from "react";
import type { Stroke } from "../types/drawing";
import { isStroke } from "../utils/validateStroke";

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
    }
    | {
        type: "restore";
        history: DrawingHistory;
    };

const initialHistory: DrawingHistory = {
    strokes: [],
    undoneStrokes: []
};

export function historyReducer(
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

        case "restore":
            return action.history;

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

export function useDrawingHistory(storageKey: string) {
    const [history, dispatch] = useReducer(
        historyReducer, initialHistory
    );
    const [restoredKey, setRestoredKey] = useState<string | null>(null);
    const isRestoring = restoredKey !== storageKey;
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [draftError, setDraftError] = useState<string | null>(null);
    const [shouldPersist, setShouldPersist] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            dispatch({ type: "restore", history: initialHistory });
            setShouldPersist(true);
            setRestoreError(null);
            try {
                const saved = window.localStorage.getItem(storageKey);
                if (saved) {
                    const value: unknown = JSON.parse(saved);
                    if (
                        value && typeof value === "object" &&
                        Array.isArray((value as DrawingHistory).strokes) &&
                        Array.isArray((value as DrawingHistory).undoneStrokes) &&
                        (value as DrawingHistory).strokes.every(isStroke) &&
                        (value as DrawingHistory).undoneStrokes.every(isStroke)
                    ) {
                        dispatch({ type: "restore", history: value as DrawingHistory });
                    } else {
                        setRestoreError("저장된 임시 그림을 복원하지 못했습니다.");
                    }
                }
            } catch {
                setRestoreError("임시 그림을 읽지 못했습니다. 브라우저 저장소를 확인해주세요.");
            } finally {
                setRestoredKey(storageKey);
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [storageKey]);

    useEffect(() => {
        // Skip the initial empty history until restoration has finished.
        if (isRestoring || !shouldPersist) return;
        let nextError: string | null = null;
        try {
            if (history.strokes.length === 0 && history.undoneStrokes.length === 0) {
                window.localStorage.removeItem(storageKey);
            } else {
                window.localStorage.setItem(storageKey, JSON.stringify(history));
            }
        } catch {
            nextError = "임시 저장에 실패했습니다. 새로고침하면 그림이 사라질 수 있습니다.";
        }
        const timer = window.setTimeout(() => setDraftError(nextError), 0);
        return () => window.clearTimeout(timer);
    }, [history, isRestoring, shouldPersist, storageKey]);

    function discardDraft() {
        setShouldPersist(false);
        try {
            window.localStorage.removeItem(storageKey);
        } catch {
            // A restricted browser may deny local storage even after submission.
        }
    }


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
        discardDraft,
        isRestoring,
        draftError: draftError ?? restoreError,
    };


}
