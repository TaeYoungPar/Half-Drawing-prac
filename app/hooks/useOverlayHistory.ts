"use client";

import { useEffect, useId, useRef, type Dispatch, type SetStateAction } from "react";

type OverlayEntry = { id: string; kind: string };
const STATE_KEY = "halfDrawingOverlays";

function entries(state: Record<string, unknown> | null): OverlayEntry[] {
  const value = state?.[STATE_KEY];
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.id === "string" && typeof entry.kind === "string") : [];
}

/** Keep Next.js history metadata; browser Back closes the top overlay first. */
export function useOverlayHistory(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>, kind: string) {
  const id = useId();
  const opened = useRef(false);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => setOpen(entries(event.state).some((entry) => entry.kind === kind));
    window.addEventListener("popstate", onPop);
    const frame = window.requestAnimationFrame(() => {
      if (entries(window.history.state).some((entry) => entry.kind === kind)) setOpen(true);
    });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("popstate", onPop); };
  }, [kind, setOpen]);

  useEffect(() => {
    const stack = entries(window.history.state);
    if (open) {
      opened.current = true;
      if (!stack.some((entry) => entry.kind === kind)) {
        window.history.pushState({ ...window.history.state, [STATE_KEY]: [...stack, { id, kind }] }, "", window.location.href);
      }
    } else if (opened.current && stack.at(-1)?.kind === kind) {
      window.history.back();
    }
  }, [open, id, kind]);
}
