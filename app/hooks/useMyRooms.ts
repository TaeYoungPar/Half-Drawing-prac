"use client";

import { useEffect, useRef, useState } from "react";
import { getMyRooms, MY_ROOMS_PAGE_SIZE, type MyRoom, type RoomScope } from "../lib/rooms/getMyRooms";

export function useMyRooms() {
  const cache = useRef(new Map<string, { rooms: MyRoom[]; total: number }>());
  const [scope, setScope] = useState<RoomScope>("all");
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
      let changingPage = false;
      try {
        const result = await getMyRooms(page, scope);
        if (!cancelled) {
          // Room cleanup can remove the last page while this tab is open.
          if (page > 0 && page * MY_ROOMS_PAGE_SIZE >= result.total) {
            changingPage = true;
            setIsLoading(true);
            setPage(Math.max(0, Math.ceil(result.total / MY_ROOMS_PAGE_SIZE) - 1));
            return;
          }
          cache.current.set(`${scope}:${page}`, result);
          setRooms(result.rooms);
          setTotal(result.total);
          setError(null);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "목록을 불러오지 못했습니다.");
      } finally {
        pending = false;
        if (!cancelled) { if (!changingPage) setIsLoading(false); setIsRefreshing(false); }
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
  }, [page, scope, attempt]);

  function showCachedSelection(nextScope: RoomScope, nextPage: number) {
    const saved = cache.current.get(`${nextScope}:${nextPage}`);
    setRooms(saved?.rooms ?? []);
    setTotal(saved?.total ?? 0);
    setIsLoading(!saved);
    setIsRefreshing(false);
    setError(null);
  }

  function changeScope(next: RoomScope) {
    if (next === scope) return;
    showCachedSelection(next, 0);
    setScope(next); setPage(0);
  }
  function refresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setAttempt((value) => value + 1);
  }
  function changePage(next: number) {
    if (next === page || next < 0 || next * MY_ROOMS_PAGE_SIZE >= total) return;
    showCachedSelection(scope, next);
    setPage(next);
  }
  return { rooms, total, page, scope, changeScope, isLoading, isRefreshing, error, refresh, changePage,
    hasNextPage: (page + 1) * MY_ROOMS_PAGE_SIZE < total };
}
