import english from "./en.json";

export type Locale = "ko" | "en";
const messages: Record<string, string> = english;
export function translate(source: string, locale: Locale, ...values: unknown[]): string {
  const message = locale === "en" ? messages[source] ?? source : source;
  return message.replace(/\{(\d+)\}/g, (token, index) => Number(index) < values.length ? String(values[Number(index)] ?? "") : token);
}

export const LANGUAGE_KEY = "half-drawing-language";
export function preferredLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === "ko" || saved === "en") return saved;
  return languages[0]?.toLowerCase().startsWith("ko") ? "ko" : "en";
}
