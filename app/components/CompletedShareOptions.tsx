"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { drawShareCard, SHARE_CARD_FILENAME } from "../utils/shareCard";
import { downloadCanvasImage, shareCanvasImage } from "../utils/downloadCanvasImage";

export function CompletedShareOptions({ drawingRef, prompt }: { drawingRef: RefObject<HTMLCanvasElement | null>; prompt: string }) {
  const [format, setFormat] = useState<"original" | "card">("original");
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLCanvasElement>(null);
  const isCard = format === "card";

  useEffect(() => {
    if (format !== "card") return;
    let cancelled = false;
    async function prepare() {
      try {
        await document.fonts.ready;
        // Parent paint effects run before this asynchronous continuation.
        if (cancelled || !cardRef.current || !drawingRef.current) return;
        drawShareCard(cardRef.current, drawingRef.current, prompt, process.env.NEXT_PUBLIC_SITE_URL);
        setCardReady(true);
      } catch {
        if (!cancelled) setCardError("공유 카드를 준비하지 못했어요. 다시 시도하거나 원본 그림을 저장해주세요.");
      }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [format, prompt, drawingRef, attempt]);

  function changeFormat(next: "original" | "card") {
    if (next === format) return;
    setCardReady(false); setCardError(null); setMessage(null); setFormat(next);
  }
  async function share() {
    if (sharing || (isCard && !cardReady)) return;
    setSharing(true); setMessage(null);
    try {
      setMessage(await shareCanvasImage(isCard ? cardRef.current : drawingRef.current, isCard ? { filename: SHARE_CARD_FILENAME } : undefined));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 공유하지 못했습니다.");
    } finally { setSharing(false); }
  }

  return (
    <section aria-label="완성 그림 공유 형식" className="panel space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-extrabold">어떤 모습으로 공유할까요?</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">그림만 보내거나 주제를 담은 카드로 남겨보세요.</p>
      </div>
      <div className="tool-settings-tabs grid grid-cols-2 gap-2" role="group" aria-label="공유 이미지 선택">
        <button type="button" onClick={() => changeFormat("original")} aria-pressed={!isCard} disabled={sharing} className="tool-tab button-secondary">그림만</button>
        <button type="button" onClick={() => changeFormat("card")} aria-pressed={isCard} disabled={sharing} className="tool-tab button-secondary">공유 카드</button>
      </div>
      {isCard && <div>
        <canvas ref={cardRef} width={1200} height={1200} aria-label="완성 그림 공유 카드 미리보기" aria-busy={!cardReady && !cardError} className="block h-auto w-full rounded-xl border border-slate-200 bg-[#fffbed]" />
        {!cardReady && !cardError && <p role="status" className="mt-2 text-sm text-slate-600">공유 카드를 준비하는 중…</p>}
        {cardError && <div role="alert" className="mt-3 text-sm leading-6 text-red-700"><p>{cardError}</p><button type="button" onClick={() => { setCardReady(false); setCardError(null); setAttempt(value => value + 1); }} className="button-secondary mt-2">다시 준비</button></div>}
        <p className="mt-2 text-xs leading-5 text-slate-600">실제 완성 그림과 주제를 담아요. 방 주소나 참여 코드는 들어가지 않아요.</p>
      </div>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={share} disabled={sharing || (isCard && !cardReady)} className="button-primary">{sharing ? "이미지 준비 중…" : isCard ? "공유 카드 공유" : "완성 그림 공유"}</button>
        {isCard && <button type="button" disabled={!cardReady} onClick={() => downloadCanvasImage(cardRef.current, SHARE_CARD_FILENAME)} className="button-secondary">공유 카드 PNG 저장</button>}
      </div>
      {message && <p role="status" className="text-sm leading-6 text-slate-600">{message}</p>}
    </section>
  );
}
