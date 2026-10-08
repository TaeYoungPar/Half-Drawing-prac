"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import { joinRoom } from "../lib/rooms/joinRoom";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const { userId, isLoading, errorMessage, retry } = useAnonymousAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isJoining || !userId) return;
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      setJoinError("영문과 숫자로 된 10자리 참여 코드를 입력해주세요.");
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const room = await joinRoom(code);
      router.push(`/rooms/${room.room_id}`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "방에 참여하지 못했습니다.");
      setIsJoining(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-12 sm:py-20">
      <Link href="/" className="text-sm font-medium text-slate-500">← 홈으로</Link>
      <div className="panel mt-6 p-6 sm:p-8">
        <span className="eyebrow">STEP 2 · 친구의 상상 이어가기</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">초대받으셨나요?</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">친구에게 받은 코드를 입력해주세요. 친구의 그림은 경계 부분만 보이고, 완성하면 전체를 볼 수 있어요.</p>
        <form onSubmit={handleJoin} className="mt-7 flex flex-col gap-3" aria-busy={isJoining}>
          <label htmlFor="room-code" className="text-sm font-semibold">참여 코드</label>
          <input id="room-code" type="text" maxLength={10} value={roomCode}
            disabled={isJoining} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            aria-describedby="code-help" aria-invalid={Boolean(joinError)}
            onChange={(event) => {
              setRoomCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
              setJoinError(null);
            }}
            placeholder="A1B2C3D4E5"
            className="min-h-14 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono text-xl tracking-widest" />
          <p id="code-help" className="text-xs leading-5 text-slate-500">영문·숫자 10자리 · 방을 만든 기기와 다른 기기 또는 브라우저에서 참여해주세요.</p>
          <button type="submit" disabled={isLoading || isJoining || !userId || !roomCode} className="button-primary mt-3">
            {isLoading ? "연결 중…" : isJoining ? "그림으로 이동 중…" : "이어 그리러 가기 →"}
          </button>
          {joinError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{joinError}</p>}
        </form>
        {errorMessage && <div role="alert" className="mt-4 text-sm text-red-700">
          <p>{errorMessage}</p>
          <button onClick={retry} className="button-secondary mt-3" type="button">연결 다시 시도</button>
        </div>}
      </div>
    </main>
  );
}
