"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import { DrawingCanvas } from "../../components/DrawingCanvas";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";

import {
  getRoom,
  type RoomDetail,
} from "../../lib/rooms/getRoom";

import { saveRightDrawing } from "../../lib/drawings/saveRightDrawing";

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
  } = useAnonymousAuth();

  const [room, setRoom] =
    useState<RoomDetail | null>(null);

  const [
    isRoomLoading,
    setIsRoomLoading,
  ] = useState(true);

  const [roomError, setRoomError] =
    useState<string | null>(null);

  async function handleSubmitRightDrawing(
    rightStrokes: Stroke[]
  ) {
    await saveRightDrawing(
      roomId,
      rightStrokes
    );

    const updatedRoom =
      await getRoom(roomId);

    setRoom(updatedRoom);
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

        if (!isCancelled) {
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

    loadRoom();

    return () => {
      isCancelled = true;
    };
  }, [
    roomId,
    userId,
    isAuthLoading,
  ]);

  if (authError) {
    return (
      <main className="p-6">
        <p
          role="alert"
          className="text-red-600"
        >
          로그인 오류: {authError}
        </p>
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

  if (roomError) {
    return (
      <main className="p-6">
        <p
          role="alert"
          className="text-red-600"
        >
          {roomError}
        </p>
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

  const leftDrawing =
    room.drawings.find(
      (drawing) =>
        drawing.role === "left"
    );

  if (!leftDrawing) {
    return (
      <main className="p-6">
        <p
          role="alert"
          className="text-red-600"
        >
          첫 번째 그림을 찾을 수
          없습니다.
        </p>
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
        방 상태: {room.status}
      </p>

      <p className="text-xs text-gray-500">
        방 ID: {roomId}
      </p>

      <DrawingCanvas
        drawingSide="right"
        backgroundStrokes={
          leftDrawing.strokes
        }
        onSubmitDrawing={
          handleSubmitRightDrawing
        }
      />
    </main>
  );
}