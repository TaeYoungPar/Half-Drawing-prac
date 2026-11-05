"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isPublicAdPage } from "../utils/publicAdPages";
import { isolatePublicAdNavigation } from "../lib/publicAdNavigation";

declare global {
  interface Window { adsbygoogle?: { push: (entry: Record<string, never>) => unknown } }
}
let scriptFailed = false;

export function PublicAdSlot({ client, slot }: { client: string; slot: string }) {
  const pathname = usePathname();
  return isPublicAdPage(pathname) ? <Banner key={pathname} client={client} slot={slot} /> : null;
}

function Banner({ client, slot }: { client: string; slot: string }) {
  const container = useRef<HTMLElement>(null);
  const ins = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [near, setNear] = useState(false);
  const [hidden, setHidden] = useState(scriptFailed);

  useEffect(() => {
    const element = container.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      isolatePublicAdNavigation();
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
      if (element.dataset.adStatus === "unfilled") setHidden(true);
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, []);

  const requestAd = () => {
    const element = ins.current;
    if (!element || requested.current || element.dataset.adsbygoogleStatus) return;
    if (element.getBoundingClientRect().width <= 0) return;
    requested.current = true;
    try {
      window.adsbygoogle ??= [] as Record<string, never>[];
      window.adsbygoogle.push({});
    } catch {
      setHidden(true);
    }
  };

  return <aside ref={container} hidden={hidden} aria-label="광고" className="ad-banner mx-auto mt-12 w-full max-w-[728px] border-t border-[#d8ccb3] pt-4">
    <p className="mb-2 text-center text-[11px] font-normal text-slate-500">광고</p>
    <ins ref={ins} className="adsbygoogle" style={{ display: "block", width: "100%", height: 100 }}
      data-ad-client={client} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="false" />
    {near && !hidden && <Script id="public-adsense" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous" strategy="afterInteractive"
      onReady={requestAd} onError={() => { scriptFailed = true; setHidden(true); }} />}
  </aside>;
}
