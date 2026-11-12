"use client";

import { useI18n } from "../i18n/I18n";

export function DayLabel({ day, topic = false }: { day: string; topic?: boolean }) {
  const { locale } = useI18n();
  const date = locale === "ko" ? `${day.slice(5).replace("-", "월 ")}일` : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(`${day}T00:00:00+09:00`));
  return topic ? locale === "ko" ? `${date}의 주제` : `Topic for ${date}` : date;
}
