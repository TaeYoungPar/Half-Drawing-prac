"use client";

import { useState } from "react";
import { OverlayDialog } from "./OverlayDialog";
import { suggestTopics } from "../utils/topicSuggestions";

export function TopicSuggestions({ value, onChange, disabled }: { value: string; onChange: (topic: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  function show() {
    setDraft(value);
    setChoices(suggestTopics([value]));
    setOpen(true);
  }
  return (
    <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#fff1c9] pl-3 pr-1">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-600">그림 주제</p>
        <p className="truncate text-sm font-bold" title={value || undefined}>{value || "뭘 그릴지 고민되나요?"}</p>
      </div>
      <button type="button" disabled={disabled} onClick={show} className="button-secondary shrink-0 px-3 shadow-none"><span aria-hidden="true">🎲</span>주제 추천</button>
      <OverlayDialog open={open} setOpen={setOpen} title="그림 주제 추천">
        <p className="mb-4 text-sm leading-6 text-slate-600">간단한 모양에 표정이나 특징 하나만 더해봐요. 얼굴만 그려도, 내 식대로 바꿔도 좋아요.</p>
        <div role="group" aria-label="추천 주제" className="grid gap-3">
          {choices.map((topic) => <button type="button" key={topic} aria-pressed={draft === topic} onClick={() => setDraft(topic)} className={`button-secondary justify-start text-left ${draft === topic ? "bg-[#ffc798]!" : "bg-[#fffdf3]!"}`}>{topic}</button>)}
        </div>
        <button type="button" onClick={() => setChoices(suggestTopics([value, draft, ...choices]))} className="button-secondary mt-4 w-full"><span aria-hidden="true">🎲</span>다른 주제 추천</button>
        <label htmlFor="suggested-topic" className="mb-2 mt-5 block text-sm font-bold">추천 주제 직접 수정</label>
        <input id="suggested-topic" maxLength={80} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="나만의 주제로 바꿔도 좋아요" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" />
        <p className="mt-1 text-right text-xs text-slate-500">{draft.length}/80</p>
        <button type="button" disabled={!draft.trim() || disabled} onClick={() => { onChange(draft.trim()); setOpen(false); }} className="button-primary mt-4 w-full">이 주제로 그리기</button>
      </OverlayDialog>
    </div>
  );
}
