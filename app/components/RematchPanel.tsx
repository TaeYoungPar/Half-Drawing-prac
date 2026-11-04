"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getRematch, requestRematch, type Rematch } from "../lib/rooms/rematch";
import { joinRoom } from "../lib/rooms/joinRoom";

export function RematchPanel({ roomId, userId }: { roomId: string; userId: string }) {
  const router = useRouter();
  const [round, setRound] = useState<Rematch | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mutation = useRef(false);
  const version = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    let cancelled = false, pending = false;
    mounted.current = true;
    const controller = new AbortController();
    async function load() {
      if (cancelled || pending || mutation.current || document.hidden) return;
      pending = true;
      const currentVersion = version.current;
      try {
        const result = await getRematch(roomId, controller.signal);
        if (!cancelled && currentVersion === version.current) {
          if (result === null) { setUnavailable(true); cancelled = true; }
          else { setRound(result); setError(null); }
        }
      } catch (reason) {
        if (!cancelled && currentVersion === version.current) setError(reason instanceof Error ? reason.message : "다음 판을 확인하지 못했어요.");
      } finally { pending = false; }
    }
    const initial = window.setTimeout(() => { void load(); }, 0);
    const timer = window.setInterval(() => { void load(); }, 5000);
    const onReturn = () => { void load(); };
    window.addEventListener("focus", onReturn); document.addEventListener("visibilitychange", onReturn);
    return () => {
      cancelled = true; mounted.current = false; controller.abort(); window.clearTimeout(initial); window.clearInterval(timer);
      window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn);
    };
  }, [roomId, attempt]);

  async function playAgain() {
    if (mutation.current || !round) return;
    mutation.current = true; version.current++; setBusy(true); setError(null);
    try {
      const updated = await requestRematch(roomId);
      if (!mounted.current) return;
      setRound(updated);
      if (userId === updated.starter_id) {
        router.push(updated.next_room_id && updated.next_status !== "expired" ? `/rooms/${updated.next_room_id}` : `/draw?rematch=${roomId}`);
      }
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : "한 판 더 신청하지 못했어요.");
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }
  async function continueDrawing() {
    if (mutation.current || !round?.next_code) return;
    mutation.current = true; version.current++; setBusy(true); setError(null);
    try {
      const joined = await joinRoom(round.next_code);
      if (mounted.current) router.push(`/rooms/${joined.room_id}`);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : "다음 그림에 참여하지 못했어요.");
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }

  if (unavailable || (!round && !error)) return null;
  const starter = round?.starter_id === userId;
  const ready = round?.next_room_id && round.next_status !== "expired";
  return <section aria-labelledby="rematch-heading" className="panel my-4 bg-[#dcedd5]! p-5 sm:p-6">
    <p className="eyebrow">이번엔 순서를 바꿔서</p><h2 id="rematch-heading" className="mt-2 text-xl font-extrabold">역할 바꿔 한 판 더</h2>
    <p className="mt-3 text-sm leading-7" role="status">{ready ? starter ? "내 반쪽이 준비됐어요. 친구가 같은 방에서 이어 그릴 수 있어요." : "친구의 반쪽이 준비됐어요! 이번에는 내가 오른쪽을 이어 그릴 차례예요." : starter ? round?.requested_by === round?.partner_id ? "친구가 한 판 더 신청했어요! 이번에는 내가 왼쪽부터 그려요." : "이번에는 내가 왼쪽을 먼저 그리고, 같은 친구가 오른쪽을 이어 그려요." : round?.requested_by ? round.requested_by === userId ? "다음 판을 신청했어요. 친구가 먼저 그려 등록하면 여기서 바로 이어 그릴 수 있어요." : "친구가 한 판 더 시작했어요! 반쪽을 등록하면 여기서 바로 이어 그릴 수 있어요." : "이번에는 친구가 먼저 그리고 내가 이어 그려요. 코드를 다시 보낼 필요 없어요."}</p>
    {round && <div className="mt-4 flex flex-wrap gap-3">
      {ready ? starter || round.next_status !== "waiting" ? <Link href={`/rooms/${round.next_room_id}`} className="button-primary">다음 그림 열기 →</Link> : <button type="button" disabled={busy} onClick={() => { void continueDrawing(); }} className="button-primary">{busy ? "참여 중…" : "친구의 반쪽 이어 그리기 →"}</button>
        : <button type="button" disabled={busy || (!starter && Boolean(round.requested_by) && round.next_status !== "expired")} onClick={() => { void playAgain(); }} className="button-primary">{busy ? "준비 중…" : starter ? "역할 바꿔 먼저 그리기 →" : round.requested_by && round.next_status !== "expired" ? "친구가 먼저 그릴 차례예요" : "친구에게 한 판 더 신청"}</button>}
    </div>}
    {error && <div className="mt-3"><p role="alert" className="text-sm leading-6 text-red-700">{error}</p>{!round && <button type="button" className="button-secondary mt-2" onClick={() => setAttempt(value => value + 1)}>다음 판 다시 확인</button>}</div>}
  </section>;
}
