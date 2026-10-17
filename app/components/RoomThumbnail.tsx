"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getCompletedThumbnail } from "../lib/rooms/getCompletedThumbnail";

export type ThumbnailCache = Map<string, { request: Promise<string>; url?: string }>;

function loadThumbnail(cache: ThumbnailCache, roomId: string) {
  const existing = cache.get(roomId);
  if (existing) return existing.request;
  const entry: { request: Promise<string>; url?: string } = {
    request: getCompletedThumbnail(roomId).then((url) => {
      entry.url = url;
      return url;
    }).catch((error) => {
      if (cache.get(roomId) === entry) cache.delete(roomId);
      throw error;
    }),
  };
  cache.set(roomId, entry);
  // Bound memory even when browsing many pages. A revisit can reload an evicted image.
  if (cache.size > 24) cache.delete(cache.keys().next().value!);
  return entry.request;
}

export function RoomThumbnail({ roomId, prompt, cache }: { roomId: string; prompt: string; cache: ThumbnailCache }) {
  const container = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(() => cache.get(roomId)?.url ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) return;
    let cancelled = false;
    const load = () => {
      void loadThumbnail(cache, roomId).then((image) => {
        if (!cancelled) setUrl(image);
      }).catch(() => { if (!cancelled) setFailed(true); });
    };
    if (!("IntersectionObserver" in window)) {
      load();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "120px" });
    if (container.current) observer.observe(container.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, [cache, roomId, url]);

  return (
    <div ref={container} className="relative mt-4 flex aspect-[8/5] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      {url ? <Image src={url} width={320} height={200} unoptimized alt={`${prompt} 완성 그림 미리보기`} className="h-full w-full object-contain" />
        : <p className="px-4 text-center text-xs leading-5 text-slate-600">{failed ? "미리보기 대신 아래 버튼으로 그림을 열어주세요." : "완성 그림 미리보기"}</p>}
    </div>
  );
}
