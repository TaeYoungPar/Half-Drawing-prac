"use client";

import { useEffect, useState } from "react";
import { getMyRooms, MY_ROOMS_PAGE_SIZE, type MyRoom } from "../lib/rooms/getMyRooms";

export function useMyRooms() {
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    async function load() {
      if (pending || cancelled) return;
      pending = true;
      setIsRefreshing(true);
      try {
        const result = await getMyRooms(page);
        if (!cancelled) {
          // Room cleanup can remove the last page while this tab is open.
          if (page > 0 && page * MY_ROOMS_PAGE_SIZE >= result.total) {
            setPage(Math.max(0, Math.ceil(result.total / MY_ROOMS_PAGE_SIZE) - 1));
            return;
          }
          setRooms(result.rooms);
          setTotal(result.total);
          setError(null);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "목록을 불러오지 못했습니다.");
      } finally {
        pending = false;
        if (!cancelled) { setIsLoading(false); setIsRefreshing(false); }
      }
    }
    const initial = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    const onReturn = () => { if (!document.hidden) void load(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [page, attempt]);

  function refresh() { setAttempt((value) => value + 1); }
  function changePage(next: number) {
    if (next < 0 || next * MY_ROOMS_PAGE_SIZE >= total) return;
    setIsLoading(true);
    setPage(next);
  }
  return { rooms, total, page, isLoading, isRefreshing, error, refresh, changePage,
    hasNextPage: (page + 1) * MY_ROOMS_PAGE_SIZE < total };
}
