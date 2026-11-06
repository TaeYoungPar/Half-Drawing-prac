"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isAdPage } from "../utils/adPages";
import { isolatePublicAdNavigation } from "../lib/publicAdNavigation";
import { loadAdSense } from "../lib/loadAdSense";

declare global {
  interface Window { adsbygoogle?: { push: (entry: Record<string, never>) => unknown } }
}
let scriptFailed = false;
type AdState = "idle" | "loading" | "requesting" | "filled" | "unfilled" | "script-error" | "request-error";
const isFailure = (state: AdState) => state === "unfilled" || state === "script-error" || state === "request-error";

export function PublicAdSlot({ client, slot }: { client: string; slot: string }) {
  const pathname = usePathname();
  return isAdPage(pathname) ? <Banner key={pathname} client={client} slot={slot} /> : null;
}

function Banner({ client, slot }: { client: string; slot: string }) {
  const container = useRef<HTMLElement>(null);
  const ins = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [near, setNear] = useState(false);
  const [adState, setAdState] = useState<AdState>(scriptFailed ? "script-error" : "idle");
  const [adError, setAdError] = useState<string | null>(scriptFailed ? "AdSense script failed to load" : null);
  const hidden = isFailure(adState);

  useEffect(() => {
    const element = container.current;
    if (!element || scriptFailed || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      isolatePublicAdNavigation();
      setAdState("loading");
      setNear(true);
      observer.disconnect();
    }, { rootMargin: "200px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ins.current;
    if (!element) return;
    const observer = new MutationObserver(() => {
      const status = element.dataset.adStatus;
      if (status === "filled" || status === "unfilled") {
        setAdState(current => isFailure(current) ? current : status);
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let active = true;
    void loadAdSense(client).then(() => {
      const element = ins.current;
      if (!active || !element || requested.current || element.dataset.adsbygoogleStatus) return;
      if (element.getBoundingClientRect().width <= 0) return;
      requested.current = true;
      setAdState("requesting");
      try {
        window.adsbygoogle ??= [] as Record<string, never>[];
        window.adsbygoogle.push({});
      } catch (error) {
        setAdError((error instanceof Error ? error.message : String(error)).slice(0, 500));
        setAdState("request-error");
      }
    }, () => {
      scriptFailed = true;
      if (!active) return;
      setAdError("AdSense script failed to load");
      setAdState("script-error");
    });
    return () => { active = false; };
  }, [client, near]);

  return <aside ref={container} hidden={hidden} aria-label="광고" aria-busy={near && adState !== "filled" && !hidden}
    data-ad-state={adState} data-ad-error={adError ?? undefined}
    style={{ borderColor: adState === "filled" ? undefined : "transparent" }}
    className="ad-banner mx-auto mt-12 w-full max-w-[728px] border-t border-[#d8ccb3] pt-4">
    <p aria-hidden={adState !== "filled"} style={{ visibility: adState === "filled" ? "visible" : "hidden" }} className="mb-2 text-center text-[11px] font-normal text-slate-500">광고</p>
    <ins ref={ins} className="adsbygoogle" style={{ display: "block", width: "100%", height: 100 }}
      data-ad-client={client} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="false" />
  </aside>;
}
