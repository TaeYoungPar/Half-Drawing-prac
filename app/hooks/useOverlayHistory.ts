"use client";

import { useEffect, useId, useRef, type Dispatch, type SetStateAction } from "react";

type OverlayEntry = { id: string; kind: string };
const STATE_KEY = "halfDrawingOverlays";

function entries(state: Record<string, unknown> | null): OverlayEntry[] {
  const value = state?.[STATE_KEY];
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.id === "string" && typeof entry.kind === "string") : [];
}

/** Keep Next.js history metadata; browser Back closes the top overlay first. */
export function useOverlayHistory(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>, kind: string, reopenOnHistory = true) {
  const id = useId();
  const opened = useRef(false);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const present = entries(event.state).some((entry) => entry.kind === kind);
      // A dismissed dialog is a transient history entry, not a page to reopen.
      // Return to the underlying view so its next Back still works normally.
      if (present && !reopenOnHistory && !opened.current) {
        window.history.back();
        return;
      }
      if (!present) opened.current = false;
      setOpen(present);
    };
    window.addEventListener("popstate", onPop);
    const frame = window.requestAnimationFrame(() => {
      if (reopenOnHistory && entries(window.history.state).some((entry) => entry.kind === kind)) setOpen(true);
    });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("popstate", onPop); };
  }, [kind, setOpen, reopenOnHistory]);

  useEffect(() => {
    const stack = entries(window.history.state);
    if (open) {
      opened.current = true;
      if (!stack.some((entry) => entry.kind === kind)) {
        window.history.pushState({ ...window.history.state, [STATE_KEY]: [...stack, { id, kind }] }, "", window.location.href);
      }
    } else if (opened.current && stack.at(-1)?.kind === kind) {
      opened.current = false;
      window.history.back();
    }
  }, [open, id, kind]);
}
