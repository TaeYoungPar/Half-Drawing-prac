"use client";

import { useState } from "react";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import { joinRoom } from "../lib/rooms/joinRoom";

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState("");

  const { userId, isLoading, errorMessage } = useAnonymousAuth();

  const [isJoining, setIsJoining] = useState(false);

  const [joinError, setJoinError] = useState<string | null>(null);


  async function handleJoin() {
  const trimmedCode =
    roomCode.trim().toUpperCase();

  if (!userId) {
    setJoinError(
      "사용자 연결이 완료되지 않았습니다."
    );
    return;
  }

  if (!trimmedCode) {
    setJoinError(
      "참여 코드를 입력해주세요."
    );
    return;
  }

  setIsJoining(true);
  setJoinError(null);

  try {
    const room = await joinRoom(trimmedCode)

    console.log("참여 성공:", room);
  } catch (error) {
    if (error instanceof Error) {
      setJoinError(error.message);
    } else {
      setJoinError(
        "방에 참여하지 못했습니다."
      );
    }
  } finally {
    setIsJoining(false);
  }
}

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">그림 이어 그리기</h1>

      <p className="text-sm text-gray-600">전달받은 참여 코드를 입력하세요.</p>

      <label htmlFor="room-code">참여 코드</label>

      <input
        id="room-code"
        type="text"
        maxLength={10}
        value={roomCode}
        onChange={(event) => {
          setRoomCode(event.target.value);
        }}
        placeholder="예: A1B2C3D4E5"
        className="rounded-lg border border-gray-300 px-3 py-2 uppercase"
      />

      {/* 버튼 시작 */}
<button
  type="button"
  onClick={handleJoin}
  disabled={
    isLoading ||
    isJoining ||
    !userId
  }
  className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
>
  {isJoining
    ? "참여 중..."
    : "방 참여하기"}
</button>
{/* 버튼 끝 */}

{/* 버튼 바깥의 로그인 오류 */}
{errorMessage && (
  <p
    role="alert"
    className="text-sm text-red-600"
  >
    로그인 오류: {errorMessage}
  </p>
)}

{/* 버튼 바깥의 참여 오류 */}
{joinError && (
  <p
    role="alert"
    className="text-sm text-red-600"
  >
    참여 오류: {joinError}
  </p>
)}
    </main>
  );
}
