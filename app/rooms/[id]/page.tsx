"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";
import Link from "next/link";

import { DrawingCanvas } from "../../components/DrawingCanvas";
import { DrawingResultCanvas } from "../../components/DrawingResultCanvas";
import { DrawingWaitingCanvas } from "../../components/DrawingWaitingCanvas";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";

import {
  getRoom,
  type RoomDetail,
} from "../../lib/rooms/getRoom";

import { saveRightDrawing } from "../../lib/drawings/saveRightDrawing";
import { getLeftPreview } from "../../lib/rooms/getLeftPreview";
import { copyRoomCode } from "../../utils/copyRoomCode";

import type { Stroke } from "../../types/drawing";

export default function RoomPage() {
  const params = useParams<{
    id: string;
  }>();

  const roomId = params.id;

  const {
    userId,
    isLoading: isAuthLoading,
    errorMessage: authError,
    retry: retryAuth,
  } = useAnonymousAuth();

  const [room, setRoom] =
    useState<RoomDetail | null>(null);
  const [previewStrokes, setPreviewStrokes] = useState<Stroke[]>([]);

  const [
    isRoomLoading,
    setIsRoomLoading,
  ] = useState(true);

  const [roomError, setRoomError] =
    useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const hostId = room?.host_id;
  const roomStatus = room?.status;

  async function handleCopyCode() {
    if (!room) return;
    try {
      await copyRoomCode(room.code);
      setCopyMessage("참여 코드를 복사했습니다.");
    } catch (error) {
      setCopyMessage(error instanceof Error ? error.message : "코드를 복사하지 못했습니다.");
    }
  }

  async function refreshRoom() {
    setIsRefreshing(true);
    setRoomError(null);
    try {
      const latestRoom = await getRoom(roomId);
      setRoom(latestRoom);
    } catch (error) {
      setRoomError(
        error instanceof Error
          ? error.message
          : "방 정보를 불러오지 못했습니다."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmitRightDrawing(
    rightStrokes: Stroke[]
  ) {
    await saveRightDrawing(
      roomId,
      rightStrokes
    );

    // The SELECT policy reveals both originals only after the DB trigger
    // marks the room completed. A successful save must not be retried.
    try {
      setRoom(await getRoom(roomId));
    } catch {
      setRoomError("그림은 저장되었습니다. 새로고침해 완성된 그림을 확인해주세요.");
    }
  }

  useEffect(() => {
    if (isAuthLoading || !userId) {
      return;
    }

    let isCancelled = false;

    async function loadRoom() {
      try {
        const roomData =
          await getRoom(roomId);

        const preview =
          roomData.guest_id === userId &&
          roomData.status === "guest_joined"
            ? await getLeftPreview(roomId)
            : [];

        if (!isCancelled) {
          setPreviewStrokes(preview);
          setRoom(roomData);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error) {
          setRoomError(error.message);
        } else {
          setRoomError(
            "방 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsRoomLoading(false);
        }
      }
    }

    // Reset between room URLs, so the previous room cannot appear under a
    // new URL while its request is still loading.
    const loadTimer = window.setTimeout(() => {
      setIsRoomLoading(true);
      setRoomError(null);
      setRoom(null);
      setPreviewStrokes([]);
      void loadRoom();
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [
    roomId,
    userId,
    isAuthLoading,
    loadAttempt,
  ]);

  useEffect(() => {
    if (!hostId || hostId !== userId || roomStatus === "completed" || roomStatus === "expired") {
      return;
    }

    let cancelled = false;
    let pending = false;
    const timer = window.setInterval(async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const latestRoom = await getRoom(roomId);
        if (!cancelled) setRoom(latestRoom);
      } catch {
        // A temporary network error should not erase the current room view.
      } finally {
        pending = false;
      }
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId, hostId, roomStatus, userId]);

  if (authError) {
    return (
      <main className="p-6">
        <p
          role="alert"
          className="text-red-600"
        >
          로그인 오류: {authError}
        </p>
        <button type="button" onClick={retryAuth} className="button-secondary mt-4">연결 다시 시도</button>
      </main>
    );
  }

  if (isAuthLoading) {
    return (
      <main className="p-6">
        사용자 연결 중...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="p-6">
        사용자 정보를 확인할 수
        없습니다.
      </main>
    );
  }

  if (isRoomLoading) {
    return (
      <main className="p-6">
        방 정보를 불러오는 중...
      </main>
    );
  }

  if (roomError && !room) {
    return (
      <main className="p-6">
        <p
          role="alert"
          className="text-red-600"
        >
          {roomError}
        </p>
        <button type="button" onClick={() => { setIsRoomLoading(true); setRoomError(null); setLoadAttempt((value) => value + 1); }} className="button-secondary mt-4">다시 불러오기</button>
        <Link href="/join" className="button-secondary ml-3">다른 코드로 참여</Link>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="p-6">
        방을 찾을 수 없습니다.
      </main>
    );
  }

  if (room.status === "expired") {
    return (
      <main className="p-6">
        <p role="alert">사용 기한이 지난 방입니다.</p>
        <Link href="/draw" className="button-primary mt-4">새 그림 시작하기</Link>
      </main>
    );
  }

  const leftDrawing = room.drawings.find(
    (drawing) => drawing.role === "left"
  );
  const rightDrawing = room.drawings.find(
    (drawing) => drawing.role === "right"
  );

  // Completed rooms are read-only for both artists, including after a reload.
  if (room.status === "completed") {
    if (!leftDrawing || !rightDrawing) {
      return (
        <main className="p-6">
          <p role="alert">완성된 그림을 불러오지 못했습니다.</p>
        </main>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
        <span className="eyebrow">STEP 3 · 우리 그림 공개</span>
        <h1 className="text-3xl font-bold tracking-tight">이런 그림이 될 줄 알았나요?</h1>
        <p>그림 주제: {room.prompt}</p>
        <DrawingResultCanvas
          leftStrokes={leftDrawing.strokes}
          rightStrokes={rightDrawing.strokes}
        />
      </main>
    );
  }

  // The creator should be able to return later to see the result, but cannot
  // submit the guest's half or reveal it before the guest has finished.
  if (room.host_id === userId) {
    if (!leftDrawing) {
      return (
        <main className="p-6">
          <p role="alert">첫 번째 그림을 찾을 수 없습니다.</p>
        </main>
      );
    }
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
        <span className="eyebrow">내 반쪽 등록 완료</span>
        <h1 className="text-3xl font-bold tracking-tight">이제 친구의 차례예요.</h1>
        <p>그림 주제: {room.prompt}</p>
        <div className="panel max-w-[800px] p-5">
          <p className="text-sm text-slate-500">친구에게 전달할 참여 코드</p>
          <p className="mt-2 break-all font-mono text-3xl font-bold tracking-widest text-indigo-700">{room.code}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">친구에게 이 사이트 주소와 코드를 함께 보내주세요. 다른 기기나 브라우저에서 참여할 수 있어요.</p>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="button-secondary self-start"
        >
          참여 코드 복사
        </button>
        {copyMessage && <p role="status" className="text-sm text-gray-700">{copyMessage}</p>}
        <p className="text-sm text-gray-600">
          {room.guest_id ? "참여자가 그림을 그리고 있습니다." : "참여 코드를 친구에게 전달해주세요."}
        </p>
        <p className="text-xs text-gray-500">완성 여부는 약 7초마다 자동으로 확인합니다. 이 방 주소를 북마크하면 나중에 다시 볼 수 있어요.</p>
        <p className="text-xs text-slate-500">브라우저 데이터를 지우면 익명 계정이 사라져 방에 돌아오지 못할 수 있어요.</p>
        <DrawingWaitingCanvas strokes={leftDrawing.strokes} />
        {roomError && (
          <p role="alert" className="text-sm text-red-600">{roomError}</p>
        )}
        <button
          type="button"
          onClick={refreshRoom}
          disabled={isRefreshing}
          className="self-start rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-40"
        >
          {isRefreshing ? "확인 중..." : "완성 여부 확인"}
        </button>
      </main>
    );
  }

  if (room.guest_id !== userId || room.status !== "guest_joined") {
    return (
      <main className="p-6">
        <p role="alert">이 방에서 그림을 그릴 수 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">
        이어 그리기
      </h1>

      <p>
        그림 주제: {room.prompt}
      </p>

      <p className="text-sm text-gray-600">
        왼쪽 그림은 경계 부분만 보입니다. 오른쪽을 이어 그린 뒤 완료하면 전체 그림을 볼 수 있어요.
      </p>
      {roomError && <p role="alert" className="text-sm text-red-600">{roomError}</p>}

      <DrawingCanvas
        key={roomId}
        drawingSide="right"
        draftId={roomId}
        backgroundStrokes={previewStrokes}
        onSubmitDrawing={
          handleSubmitRightDrawing
        }
      />
    </main>
  );
}
