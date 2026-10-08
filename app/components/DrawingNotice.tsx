"use client";

import { useEffect, useRef } from "react";

// Native modal supplies focus trapping, Escape and focus restoration.
export function DrawingNotice({ message, isError, onClose }: {
  message: string; isError: boolean; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={dialogRef} onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
      aria-label={isError ? "저장 오류" : "알림"}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border-0 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-900/30">
      <div role={isError ? "alert" : "status"}>
        <span className={isError ? "text-sm font-bold text-red-600" : "text-sm font-bold text-indigo-600"}>
          {isError ? "잠깐, 확인해주세요" : "완료했어요!"}
        </span>
        <p className="mt-3 pr-6 text-sm leading-6">{message}</p>
      </div>
      <button type="button" onClick={onClose} autoFocus aria-label="알림 닫기"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-2xl hover:bg-slate-100">×</button>
    </dialog>
  );
}
