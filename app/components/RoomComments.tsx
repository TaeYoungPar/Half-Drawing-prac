"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { COMMENT_LIMIT, commentDraft, commentLength, deleteRoomComment, getRoomComments, saveRoomComment, type RoomComment } from "../lib/rooms/comments";

export function RoomComments({ roomId, userId, hostId, guestId }: { roomId: string; userId: string; hostId: string; guestId: string }) {
  const [comments, setComments] = useState<RoomComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const mutation = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);
  const mine = comments.find(row => row.author_id === userId);
  const friendId = userId === hostId ? guestId : hostId;
  const friend = comments.find(row => row.author_id === friendId);

  useEffect(() => {
    mounted.current = true;
    let pending = false;
    let stopped = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending || stopped || mutation.current || document.hidden) return;
      pending = true;
      const requestedRevision = revision.current;
      try {
        const rows = await getRoomComments(roomId, controller.signal);
        if (!stopped && requestedRevision === revision.current) {
          if (rows === null) { stopped = true; setUnavailable(true); }
          else if (rows.some(row => row.author_id !== hostId && row.author_id !== guestId)) {
            throw new Error("한마디를 불러오지 못했어요. 다시 확인해주세요.");
          } else { setComments(rows); setLoadError(null); }
        }
      } catch (error) {
        if (!stopped && requestedRevision === revision.current) setLoadError(error instanceof Error ? error.message : "한마디를 불러오지 못했어요.");
      } finally {
        pending = false;
        if (!stopped || !controller.signal.aborted) setLoading(false);
      }
    }
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 7000);
    const onReturn = () => { void refresh(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      stopped = true; mounted.current = false; controller.abort();
      window.clearTimeout(initial); window.clearInterval(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [roomId, hostId, guestId, attempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.current || !draft.trim()) return;
    mutation.current = true; revision.current++; setBusy(true); setActionError(null); setNotice("");
    try {
      const saved = await saveRoomComment(roomId, userId, draft);
      if (mounted.current) {
        setComments(rows => [...rows.filter(row => row.author_id !== userId), saved]);
        setDraft(""); setEditing(false); setNotice("친구에게 한마디를 남겼어요.");
      }
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : "저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      mutation.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function remove() {
    if (mutation.current || !window.confirm("내 한마디를 삭제할까요?")) return;
    mutation.current = true; revision.current++; setBusy(true); setActionError(null); setNotice("");
    try {
      await deleteRoomComment(roomId, userId);
      if (mounted.current) { setComments(rows => rows.filter(row => row.author_id !== userId)); setDraft(""); setEditing(false); setNotice("내 한마디를 삭제했어요."); }
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : "삭제하지 못했어요. 다시 시도해주세요.");
    } finally {
      mutation.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (unavailable || (userId !== hostId && userId !== guestId)) return null;
  return <section aria-labelledby="comments-heading" className="panel my-4 p-4 sm:p-6" aria-busy={loading}>
    <p className="eyebrow">그림 뒤의 작은 이야기</p>
    <h2 id="comments-heading" className="mt-2 text-xl font-extrabold">서로에게 한마디</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">어떤 모습을 상상했나요? 함께 그린 친구에게 짧게 남겨보세요.</p>
    {loading ? <p role="status" className="mt-5 text-sm text-slate-500">두 사람의 한마디를 불러오는 중이에요.</p> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-[#c8b99b] bg-[#fff0bd] p-4" aria-label="내 한마디">
          <p className="text-xs font-bold text-slate-600">나 · {userId === hostId ? "왼쪽" : "오른쪽"}을 그렸어요</p>
          <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-7 ${mine ? "" : "text-slate-500"}`}>{mine?.body ?? (loadError ? "한마디를 다시 불러와주세요." : "우리 그림을 보고 든 생각을 남겨보세요.")}</p>
          {mine && !editing && <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy} className="button-secondary min-h-11 px-3 text-xs" onClick={() => { setDraft(mine.body); setEditing(true); setNotice(""); setActionError(null); window.requestAnimationFrame(() => input.current?.focus()); }}>수정</button><button type="button" disabled={busy} className="button-secondary min-h-11 px-3 text-xs" onClick={() => { void remove(); }}>삭제</button></div>}
        </div>
        <div className="min-w-0 rounded-2xl border border-[#c8b99b] bg-[#e5f0e1] p-4" aria-label="친구의 한마디">
          <p className="text-xs font-bold text-slate-600">친구 · {userId === hostId ? "오른쪽" : "왼쪽"}을 그렸어요</p>
          <p aria-live="polite" className={`mt-3 whitespace-pre-wrap break-words text-sm leading-7 ${friend ? "" : "text-slate-500"}`}>{friend?.body ?? (loadError ? "한마디를 다시 불러와주세요." : "친구는 어떤 생각으로 그렸을까요? 아직 한마디가 없어요.")}</p>
        </div>
      </div>
      {loadError && <div className="mt-4"><p role="alert" className="text-sm leading-6 text-red-700">{loadError}</p><button type="button" className="button-secondary mt-2" onClick={() => setAttempt(value => value + 1)}>한마디 다시 불러오기</button></div>}
      {(!mine || editing) && <form className="mt-5" onSubmit={save}>
        <label htmlFor="room-comment" className="text-sm font-bold">{editing ? "내 한마디 수정" : "친구에게 남길 한마디"}</label>
        <input ref={input} id="room-comment" value={draft} maxLength={COMMENT_LIMIT * 2} onChange={event => { setDraft(commentDraft(event.target.value)); setNotice(""); }} disabled={busy || Boolean(loadError)} placeholder="너도 고양이를 생각했어? 😆" aria-describedby="comment-help comment-count" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base disabled:opacity-60" />
        <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5 text-slate-500"><p id="comment-help">두 사람만 볼 수 있어요. 나중에 수정·삭제할 수 있어요.</p><p id="comment-count" className="shrink-0 tabular-nums">{commentLength(draft)}/{COMMENT_LIMIT}</p></div>
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="button-primary" disabled={busy || !draft.trim() || Boolean(loadError) || (editing && draft.trim() === mine?.body)}>{busy ? "저장 중…" : editing ? "수정 저장" : "한마디 남기기"}</button>{editing && <button type="button" disabled={busy} className="button-secondary" onClick={() => { setEditing(false); setDraft(""); setActionError(null); }}>수정 취소</button>}</div>
      </form>}
      {actionError && <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{actionError}</p>}
      <p role="status" className="mt-3 text-sm leading-6 text-slate-600">{notice}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">이 화면을 열어두면 친구의 한마디를 자동으로 확인해요. 저장한 그림이나 공유 카드에는 포함되지 않아요.</p>
    </>}
  </section>;
}
