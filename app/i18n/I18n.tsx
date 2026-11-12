"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";
import { LANGUAGE_KEY, preferredLocale, translate, type Locale } from "./translate";

let memoryChoice: Locale | null = null;
const changed = "half-drawing-language-change";
export function currentLocale(): Locale {
  let saved: string | null = memoryChoice;
  try { saved = localStorage.getItem(LANGUAGE_KEY) ?? saved; } catch { /* Session choice still works when storage is blocked. */ }
  return preferredLocale(saved, navigator.languages.length ? navigator.languages : [navigator.language]);
}
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === LANGUAGE_KEY || event.key === null) notify(); };
  window.addEventListener(changed, notify);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(changed, notify); window.removeEventListener("storage", storage); };
}
function setLocale(locale: Locale) {
  memoryChoice = locale;
  try { localStorage.setItem(LANGUAGE_KEY, locale); } catch { /* Keep the choice for this document. */ }
  window.dispatchEvent(new Event(changed));
}
const I18nContext = createContext({ locale: "ko" as Locale, t: (source: string, ...values: unknown[]) => translate(source, "ko", ...values), setLocale });

export function LanguageProvider({ children }: { children: ReactNode }) {
  // A stable Korean server snapshot preserves the existing static HTML and hydration.
  const locale = useSyncExternalStore(subscribe, currentLocale, () => "ko" as const);
  const t = useCallback((source: string, ...values: unknown[]) => translate(source, locale, ...values), [locale]);
  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Explicit UI text only. Never wrap user-entered topics or notes in this component. */
export function Text({ children, values = [] }: { children: ReactNode; values?: unknown[] }) {
  const { t } = useI18n();
  if (typeof children !== "string") return children;
  const message = t(children, ...values);
  return /[↗→←⤢]/.test(message) ? message.split(/([↗→←⤢])/).map((part, index) => /[↗→←⤢]/.test(part) ? <span key={index} className="direction-symbol">{part}</span> : part) : message;
}

/** Translatable accessible attributes for static Server Component markup. */
export function Localized({ as, children, label, labelValues = [], ...props }: { as: string; children?: ReactNode; label?: string; labelValues?: string[]; [key: string]: unknown }) {
  const { t } = useI18n();
  const attributes = { ...props };
  for (const key of ["aria-label", "title", "alt", "placeholder"]) {
    if (typeof attributes[key] === "string") attributes[key] = t(attributes[key]);
  }
  if (label) attributes["aria-label"] = t(label, ...labelValues.map(value => t(value)));
  return createElement(as, attributes, children);
}

export function LocalizedImage({ alt, ...props }: ImageProps) {
  const { t } = useI18n();
  return <Image {...props} alt={t(alt)} />;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return <div role="group" aria-label={locale === "ko" ? "언어 선택" : "Choose language"} className="language-switcher flex shrink-0 items-center gap-1 rounded-xl border-2 border-[#493127] bg-[#fffdf3] p-1">
    <button type="button" lang="ko" aria-label="한국어" aria-pressed={locale === "ko"} onClick={() => setLocale("ko")} className={`min-h-11 rounded-lg px-2 text-xs font-bold transition-colors hover:bg-[#ffedb7] focus-visible:outline-2 focus-visible:outline-offset-2 ${locale === "ko" ? "bg-[#ffdc8a]" : ""}`}>한국어</button>
    <button type="button" lang="en" aria-label="English" aria-pressed={locale === "en"} onClick={() => setLocale("en")} className={`min-h-11 rounded-lg px-2 text-xs font-bold transition-colors hover:bg-[#ffedb7] focus-visible:outline-2 focus-visible:outline-offset-2 ${locale === "en" ? "bg-[#ffdc8a]" : ""}`}>EN</button>
  </div>;
}
