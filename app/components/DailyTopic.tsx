"use client";

import { IntentLink } from "./IntentLink";
import { useEffect, useState } from "react";
import { dailyTopic } from "../utils/dailyTopic";

export function DailyTopic({ initial }: { initial: ReturnType<typeof dailyTopic> }) {
  const [today, setToday] = useState(initial);
  useEffect(() => {
    let timer = 0;
    function sync() {
      window.clearTimeout(timer);
      setToday(dailyTopic());
      const koreanNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      koreanNow.setUTCHours(24, 0, 0, 0);
      timer = window.setTimeout(sync, Math.max(50, koreanNow.getTime() - 9 * 60 * 60 * 1000 - Date.now() + 50));
    }
    const onReturn = () => { if (!document.hidden) sync(); };
    timer = window.setTimeout(sync, 0);
    window.addEventListener("focus", onReturn); document.addEventListener("visibilitychange", onReturn);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn); };
  }, []);
  return <section aria-labelledby="daily-topic-heading" className="panel mt-10 flex flex-col gap-5 bg-[#f9dce0]! p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
    <div><p className="eyebrow"><time dateTime={today.day}>{today.day.slice(5).replace("-", "월 ")}일</time> · 한국 시간 자정에 바뀌어요</p><h2 id="daily-topic-heading" className="mt-2 text-sm font-bold">오늘의 엉뚱한 주제</h2><p className="mt-2 text-2xl font-extrabold sm:text-3xl">{today.topic}</p><p className="mt-3 text-sm leading-6">같은 주제를 두 사람이 어떻게 다르게 그릴까요?</p></div>
    <IntentLink href={`/draw?daily=${today.day}`} className="button-primary shrink-0">오늘의 주제로 그리기 ↗</IntentLink>
  </section>;
}
