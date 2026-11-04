import { DRAWING_TOPICS } from "./topicSuggestions";

const DAY = 86_400_000;
/** The date switches at Korean midnight for every visitor, regardless of device zone. */
export function koreanDay(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function topicForDay(day: string): { day: string; topic: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== day) return null;
  const index = ((Math.floor(time / DAY) * 13 + 7) % DRAWING_TOPICS.length + DRAWING_TOPICS.length) % DRAWING_TOPICS.length;
  return { day, topic: DRAWING_TOPICS[index] };
}
export function dailyTopic(now: Date = new Date()) {
  return topicForDay(koreanDay(now))!;
}
