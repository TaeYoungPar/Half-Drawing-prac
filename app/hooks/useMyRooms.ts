"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMyRooms, MY_ROOMS_PAGE_SIZE, type MyRoom, type MyRoomsResult, type RoomScope } from "../lib/rooms/getMyRooms";
import { setRoomHidden } from "../lib/rooms/libraryActions";

export function useMyRooms() {
  const cache = useRef(new Map<string, MyRoomsResult>());
  const requests = useRef(new Map<string, Promise<MyRoomsResult>>());
  const generation = useRef(0);
  const mutation = useRef(false);
  const mounted = useRef(false);
  const [scope, setScope] = useState<RoomScope>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [extrasAvailable, setExtrasAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mutationCount, setMutationCount] = useState(0);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const keyFor = (targetPage: number, targetScope: RoomScope, hidden: boolean) => `${hidden}:${targetScope}:${targetPage}`;
  const requestRooms = useCallback((targetPage: number, targetScope: RoomScope, hidden: boolean) => {
    const key = keyFor(targetPage, targetScope, hidden);
    const existing = requests.current.get(key);
    if (existing) return existing;
    const currentGeneration = generation.current;
    const request: Promise<MyRoomsResult> = getMyRooms(targetPage, targetScope, hidden)
      .then(result => { if (currentGeneration === generation.current) cache.current.set(key, result); return result; })
      .finally(() => { if (requests.current.get(key) === request) requests.current.delete(key); });
    requests.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const targetScope of ["all", "host", "guest"] as const) {
        void requestRooms(0, targetScope, showHidden).catch(() => {});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestRooms, showHidden, mutationCount]);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    async function load() {
      if (pending || cancelled || mutation.current) return;
      pending = true;
      const requestedGeneration = generation.current;
      let changingPage = false;
      try {
        const result = await requestRooms(page, scope, showHidden);
        if (!cancelled && requestedGeneration === generation.current) {
          if (page > 0 && page * MY_ROOMS_PAGE_SIZE >= result.total) {
            changingPage = true; setIsLoading(true);
            setPage(Math.max(0, Math.ceil(result.total / MY_ROOMS_PAGE_SIZE) - 1));
            return;
          }
          setRooms(result.rooms); setTotal(result.total); setExtrasAvailable(result.extrasAvailable); setError(null);
        }
      } catch (reason) {
        if (!cancelled && requestedGeneration === generation.current) setError(reason instanceof Error ? reason.message : "목록을 불러오지 못했습니다.");
      } finally {
        pending = false;
        if (!cancelled && requestedGeneration === generation.current) { if (!changingPage) setIsLoading(false); setIsRefreshing(false); }
      }
    }
    const initial = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 10000);
    const onReturn = () => { if (!document.hidden) void load(); };
    window.addEventListener("focus", onReturn); document.addEventListener("visibilitychange", onReturn);
    return () => {
      cancelled = true; window.clearTimeout(initial); window.clearInterval(interval);
      window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn);
    };
  }, [page, scope, showHidden, attempt, requestRooms]);

  function showCachedSelection(nextScope: RoomScope, nextPage: number, hidden = showHidden) {
    const saved = cache.current.get(keyFor(nextPage, nextScope, hidden));
    setRooms(saved?.rooms ?? []); setTotal(saved?.total ?? 0); setIsLoading(!saved); setIsRefreshing(false); setError(null);
  }
  function changeScope(next: RoomScope) {
    if (next === scope || mutation.current) return;
    showCachedSelection(next, 0); setScope(next); setPage(0);
  }
  function changeVisibility() {
    if (mutation.current) return;
    showCachedSelection(scope, 0, !showHidden); setShowHidden(!showHidden); setPage(0);
  }
  function refresh() {
    if (isRefreshing || mutation.current) return;
    setIsRefreshing(true); setAttempt(value => value + 1);
  }
  function changePage(next: number) {
    if (next === page || next < 0 || next * MY_ROOMS_PAGE_SIZE >= total || mutation.current) return;
    showCachedSelection(scope, next); setPage(next);
  }
  async function setHidden(roomId: string, hidden: boolean): Promise<boolean> {
    if (mutation.current || !extrasAvailable) return false;
    mutation.current = true; setBusyRoomId(roomId); setActionError(null);
    try {
      await setRoomHidden(roomId, hidden);
      if (!mounted.current) return false;
      generation.current++; cache.current.clear(); requests.current.clear();
      if (hidden !== showHidden && rooms.some(room => room.id === roomId)) {
        setRooms(current => current.filter(room => room.id !== roomId));
        setTotal(value => Math.max(0, value - 1));
      }
      setIsRefreshing(true); setAttempt(value => value + 1); setMutationCount(value => value + 1);
      return true;
    } catch (reason) {
      if (mounted.current) setActionError(reason instanceof Error ? reason.message : "보관함을 정리하지 못했어요. 다시 시도해주세요.");
      return false;
    } finally {
      mutation.current = false; if (mounted.current) setBusyRoomId(null);
    }
  }
  return { rooms, total, page, scope, changeScope, isLoading, isRefreshing, error, refresh, changePage,
    hasNextPage: (page + 1) * MY_ROOMS_PAGE_SIZE < total, extrasAvailable, showHidden, changeVisibility, setHidden, busyRoomId, actionError };
}
