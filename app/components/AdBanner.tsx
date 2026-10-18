"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { adSettings, type AdPlacement } from "../lib/ads";

declare global {
  interface Window {
    adsbygoogle?: { push: (request: Record<string, never>) => unknown };
  }
}

export function AdBanner({ placement }: { placement: AdPlacement }) {
  const settings = adSettings(placement);
  return settings ? <ConfiguredBanner key={`${placement}:${settings.slot}`} {...settings} placement={placement} /> : null;
}

function ConfiguredBanner({ client, slot, testMode, placement }: NonNullable<ReturnType<typeof adSettings>> & { placement: AdPlacement }) {
  const container = useRef<HTMLElement>(null);
  const unit = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [nearby, setNearby] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hidden) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setHidden(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearby(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [hidden]);

  useEffect(() => {
    if (!nearby || hidden) return;
    const ad = unit.current;
    if (!ad) return;
    // Ad blockers and stalled scripts must not leave an empty box indefinitely.
    const timeout = window.setTimeout(() => {
      if (ad.dataset.adStatus !== "filled") setHidden(true);
    }, 20000);
    const checkFill = () => {
      if (ad.dataset.adStatus === "filled") window.clearTimeout(timeout);
      if (ad.dataset.adStatus === "unfilled") setHidden(true);
    };
    const observer = new MutationObserver(checkFill);
    observer.observe(ad, { attributes: true, attributeFilter: ["data-ad-status"] });
    // Wait for layout before asking AdSense to measure the available width.
    const frame = window.requestAnimationFrame(() => {
      checkFill();
      if (scriptReady && !requested.current) {
        requested.current = true;
        try {
          window.adsbygoogle ??= [] as Record<string, never>[];
          window.adsbygoogle.push({});
        } catch {
          setHidden(true);
        }
      }
    });
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timeout); observer.disconnect(); };
  }, [nearby, scriptReady, hidden]);

  if (hidden) return null;
  return (
    <aside ref={container} aria-label="광고" data-ad-placement={placement} className="ad-banner">
      <p className="mb-2 text-center text-xs text-slate-500">광고</p>
      <ins ref={unit} className="adsbygoogle ad-banner-unit" data-ad-client={client} data-ad-slot={slot} data-adtest={testMode ? "on" : undefined} data-full-width-responsive="false" />
      {nearby && <Script
        id="adsense-manual-banners"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setHidden(true)}
      />}
    </aside>
  );
}
