"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import { joinRoom } from "../lib/rooms/joinRoom";

import { normalizeRoomCode } from "../utils/shareInvitation";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isInvited, setIsInvited] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { userId, isLoading, errorMessage, retry } = useAnonymousAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const timer = window.setTimeout(() => {
        const normalized = normalizeRoomCode(code);
        setRoomCode(normalized);
        setIsInvited(/^[A-Z0-9]{10}$/.test(normalized));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isJoining || !userId) return;
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      setJoinError("영문과 숫자로 된 10자리 참여 코드를 입력해주세요.");
      setShowCode(true);
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const room = await joinRoom(code);
      router.push(`/rooms/${room.room_id}`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "방에 참여하지 못했습니다.");
      setShowCode(true);
      setIsJoining(false);
    }
  }

  const codeField = <>
    <label htmlFor="room-code" className="text-sm font-semibold">참여 코드</label>
    <input id="room-code" type="text" maxLength={10} value={roomCode}
      disabled={isJoining} autoComplete="off" autoCapitalize="characters" spellCheck={false}
      aria-describedby="code-help" aria-invalid={Boolean(joinError)}
      onChange={(event) => {
        setRoomCode(normalizeRoomCode(event.target.value));
        setJoinError(null);
      }}
      placeholder="A1B2C3D4E5"
      className="min-h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-xl tracking-widest transition focus:border-slate-400 focus:bg-white" />
    <p id="code-help" className="text-xs leading-5 text-slate-500">영문·숫자 10자리 · 친구와 각자의 기기나 브라우저에서 참여해주세요.</p>
  </>;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-5 sm:px-5 sm:py-10">
      <div className="panel mt-2 p-5 sm:p-10">
        <span className="eyebrow">STEP 2 · 친구의 상상 이어가기</span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{isInvited ? "친구의 그림이 기다려요!" : "초대받으셨나요?"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{isInvited ? "초대 링크의 코드가 준비됐어요. 아래 버튼을 누르면 이어 그릴 수 있어요." : "친구에게 받은 참여 코드를 입력해주세요."}</p>
        <p className="mt-3 rounded-xl bg-[#e5efdb] p-3 text-sm leading-6 text-slate-800">친구 그림은 경계 힌트만 보여요. 오른쪽을 이어 그리면 둘의 그림이 함께 공개돼요.</p>
        <form onSubmit={handleJoin} className="mt-7 flex flex-col gap-3" aria-busy={isJoining}>
          {!isInvited && codeField}
          <button type="submit" disabled={isLoading || isJoining || !userId || !roomCode} className="button-primary mt-3">
            {isLoading ? "연결 중…" : isJoining ? "그림으로 이동 중…" : "이어 그리러 가기 →"}
          </button>
          {joinError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{joinError}</p>}
          {isInvited && <details open={showCode} onToggle={(event) => setShowCode(event.currentTarget.open)} className="text-sm text-slate-600">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">참여 코드 확인·변경</summary>
            <div className="flex flex-col gap-3 pt-2">{codeField}</div>
          </details>}
        </form>
        {errorMessage && <div role="alert" className="mt-4 text-sm text-red-700">
          <p>{errorMessage}</p>
          <button onClick={retry} className="button-secondary mt-3" type="button">연결 다시 시도</button>
        </div>}
      </div>
    </main>
  );
}
