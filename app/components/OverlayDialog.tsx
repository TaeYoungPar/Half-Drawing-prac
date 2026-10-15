"use client";

import { useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useOverlayHistory } from "../hooks/useOverlayHistory";
import { lockBodyScroll } from "../utils/bodyScrollLock";

export function OverlayDialog({ open, setOpen, title, children, wide = false }: {
  open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; title: string; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useOverlayHistory(open, setOpen, title);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const unlock = lockBodyScroll();
    dialog?.showModal();
    return () => { dialog?.close(); unlock(); };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <dialog ref={ref} aria-label={title} onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); setOpen(false); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false);
      }}
      className={`overlay-dialog m-auto w-[calc(100%-1rem)] rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40 ${wide ? "max-w-5xl" : "max-w-lg"}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-[#493127] bg-[#fff0bd] px-4 py-2">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <button type="button" onClick={() => setOpen(false)} className="button-secondary" autoFocus aria-label={`${title} 닫기`}>닫기</button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>, document.body,
  );
}
