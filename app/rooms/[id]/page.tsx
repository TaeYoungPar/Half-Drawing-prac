"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";
import Link from "next/link";

import { DrawingCanvas } from "../../components/DrawingCanvas";
import { DrawingPrompt } from "../../components/DrawingPrompt";
import { DrawingResultCanvas } from "../../components/DrawingResultCanvas";
import { DrawingWaitingCanvas } from "../../components/DrawingWaitingCanvas";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";

import {
  getRoom,
  type RoomDetail,
} from "../../lib/rooms/getRoom";

import { saveRightDrawing } from "../../lib/drawings/saveRightDrawing";
import { getLeftPreview } from "../../lib/rooms/getLeftPreview";
import { shareInvitation } from "../../utils/shareInvitation";
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

  async function handleShareInvitation() {
    if (!room) return;
    try {
      setCopyMessage(await shareInvitation(room.code));
    } catch {
      setCopyMessage("초대 링크를 공유하지 못했습니다. 참여 코드를 복사해주세요.");
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
      <main className="workspace">
        <span className="eyebrow">STEP 3 · 우리 그림 공개</span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">이런 그림이 될 줄 알았나요?</h1>
        <DrawingPrompt prompt={room.prompt} />
        <DrawingResultCanvas
          prompt={room.prompt}
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
      <main className="workspace">
        <span className="eyebrow">내 반쪽 등록 완료</span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">이제 친구의 차례예요.</h1>
        <DrawingPrompt prompt={room.prompt} />
        <section aria-labelledby="invite-heading" className="panel max-w-[800px] space-y-4 p-4 sm:p-6">
          <div>
            <h2 id="invite-heading" className="text-lg font-extrabold">친구 초대</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">링크를 보내면 친구의 참여 코드가 자동으로 입력돼요.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={handleShareInvitation} className="button-primary">친구에게 초대 링크 공유</button>
            <button type="button" onClick={handleCopyCode} className="button-secondary">참여 코드 복사</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600">참여 코드</p>
            <p className="mt-1 break-all font-mono text-2xl font-bold tracking-widest text-indigo-700">{room.code}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">초대 기한: <time dateTime={room.expires_at}>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(room.expires_at))}</time> (한국 시간)</p>
          </div>
          {copyMessage && <p role="status" className="text-sm font-semibold text-indigo-700">{copyMessage}</p>}
        </section>
        <section aria-labelledby="progress-heading" className="panel max-w-[800px] space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="progress-heading" className="text-lg font-extrabold">{room.guest_id ? "친구가 이어 그릴 차례예요" : "친구를 기다리고 있어요"}</h2>
            <button type="button" onClick={refreshRoom} disabled={isRefreshing} className="button-secondary">{isRefreshing ? "확인 중..." : "완성 여부 확인"}</button>
          </div>
          <p role="status" className="text-sm leading-6 text-slate-700">{room.guest_id ? "친구가 참여했어요. 완성하면 여기서 확인할 수 있어요." : "초대 링크를 보내고 잠시 기다려주세요."}</p>
          <p className="text-xs leading-5 text-slate-600">이 화면에서는 약 7초마다 자동 확인해요. 나중에는 내 보관함에서 다시 열 수 있어요.</p>
          {roomError && <p role="alert" className="text-sm text-red-700">{roomError}</p>}
        </section>
        <p className="max-w-[800px] text-xs leading-5 text-slate-600">그림을 시작한 브라우저로 돌아와 주세요. 브라우저 데이터를 지우면 기존 보관함에 접근할 수 없어요.</p>
        <DrawingWaitingCanvas strokes={leftDrawing.strokes} />
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
    <main className="workspace drawing-workspace">
      <h1 className="text-xl font-extrabold sm:text-2xl">
        이어 그리기
      </h1>

      <DrawingPrompt prompt={room.prompt} />

      <p className="text-sm leading-6 text-slate-600">
        경계 힌트만 보고 오른쪽을 그려요. 완성하면 전체가 공개돼요.
      </p>
      {roomError && <p role="alert" className="text-sm text-red-600">{roomError}</p>}

      <DrawingCanvas
        key={roomId}
        drawingSide="right"
        prompt={room.prompt}
        draftId={roomId}
        backgroundStrokes={previewStrokes}
        onSubmitDrawing={
          handleSubmitRightDrawing
        }
      />
    </main>
  );
}
