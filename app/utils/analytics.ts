import type { BeforeSendEvent } from "@vercel/analytics/next";

/** Keep invite codes, room IDs and URL fragments out of analytics page URLs. */
export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const pathname = url.pathname.startsWith("/rooms/") ? "/rooms/[id]" : url.pathname;
    return { ...event, url: `${url.origin}${pathname}` };
  } catch {
    return null;
  }
}
