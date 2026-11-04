"use client";

import { useEffect, useRef, type RefObject } from "react";
import { markCommentRead } from "../lib/rooms/libraryActions";

/** Mark only the friend's version that was actually visible, never a newer edit. */
export function useCommentRead(roomId: string, updatedAt: string | undefined, message: RefObject<HTMLParagraphElement | null>) {
  const confirmed = useRef("");
  const unavailable = useRef(false);
  useEffect(() => {
    const element = message.current;
    if (!updatedAt || !element || unavailable.current || confirmed.current === updatedAt) return;
    let cancelled = false, pending = false;
    let retry = 0;
    async function check() {
      if (cancelled || pending || document.hidden || confirmed.current === updatedAt) return;
      const box = element!.getBoundingClientRect();
      if (box.height <= 0 || Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0) < box.height * .6) return;
      pending = true;
      try {
        const available = await markCommentRead(roomId, updatedAt!);
        if (!cancelled) { if (available) confirmed.current = updatedAt!; else unavailable.current = true; }
      } catch {
        if (!cancelled) retry = window.setTimeout(() => { void check(); }, 5000);
      } finally { pending = false; }
    }
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(() => { void check(); }, { threshold: .6 }) : null;
    observer?.observe(element);
    const initial = window.setTimeout(() => { void check(); }, 0);
    const onReturn = () => { void check(); };
    window.addEventListener("focus", onReturn); window.addEventListener("scroll", onReturn, { passive: true }); document.addEventListener("visibilitychange", onReturn);
    return () => { cancelled = true; observer?.disconnect(); window.clearTimeout(initial); window.clearTimeout(retry); window.removeEventListener("focus", onReturn); window.removeEventListener("scroll", onReturn); document.removeEventListener("visibilitychange", onReturn); };
  }, [roomId, updatedAt, message]);
}
