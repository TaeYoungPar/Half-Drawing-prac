"use client";

import Link from "next/link";
import { useState } from "react";
import { RoomThumbnail, type ThumbnailCache } from "./RoomThumbnail";
import { useMyRooms } from "../hooks/useMyRooms";
import { MY_ROOMS_PAGE_SIZE, type RoomScope } from "../lib/rooms/getMyRooms";
import { copyRoomCode } from "../utils/copyRoomCode";
import type { DrawingStatus } from "../types/drawing";
import { AdBanner } from "./AdBanner";

const STATUS: Record<DrawingStatus, { label: string; className: string; description: string }> = {
  waiting: { label: "참여 대기", className: "bg-slate-100 text-slate-700", description: "친구에게 참여 코드를 보내주세요." },
  guest_joined: { label: "친구 참여", className: "bg-amber-50 text-amber-800", description: "친구가 참여했어요. 완성하면 여기서 확인할 수 있어요." },
  completed: { label: "완성됨", className: "bg-emerald-50 text-emerald-800", description: "두 사람의 그림이 완성됐어요. 전체 그림을 열어보세요!" },
  expired: { label: "기간 만료", className: "bg-slate-100 text-slate-500", description: "참여 기한이 지난 방이에요." },
};

export function MyDrawings({ state }: { state: ReturnType<typeof useMyRooms> }) {
  const { rooms, total, page, scope, changeScope, isLoading, isRefreshing, error, refresh, changePage, hasNextPage } = state;
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [thumbnails] = useState<ThumbnailCache>(() => new Map());
  async function copyCode(code: string) {
    try { await copyRoomCode(code); setCopyMessage("참여 코드를 복사했어요. 친구에게 보내주세요."); }
    catch (reason) { setCopyMessage(reason instanceof Error ? reason.message : "복사하지 못했습니다."); }
  }

  return (
    <section id="my-drawings" aria-labelledby="my-drawings-heading" className="mt-6 scroll-mt-6 sm:mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="my-drawings-heading" className="section-heading">내 그림</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">시작하거나 참여한 그림을 다시 열고 완성 상태를 확인해요.</p>
        </div>
        <button type="button" onClick={refresh} disabled={isRefreshing} aria-busy={isRefreshing} className="button-secondary min-w-36">
          {isRefreshing ? "새로고침 중…" : "상태 새로고침"}
        </button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg" role="group" aria-label="내 그림 목록 선택">
        {([["all", "전체"], ["host", "시작한 그림"], ["guest", "참여한 그림"]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-label={value === "all" ? "전체" : value === "host" ? "내가 시작한 그림" : "내가 참여한 그림"} aria-pressed={scope === value} onClick={() => changeScope(value as RoomScope)}
            className={`${scope === value ? "button-primary" : "button-secondary"} min-w-0 px-2 text-xs sm:text-sm`}>{label}</button>
        ))}
      </div>
      <aside aria-label="보관함 이용 안내" className="mt-4 rounded-xl border border-slate-200 bg-[#fffdf3] px-4 py-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold">내 그림은 이 브라우저에서 다시 볼 수 있어요.</p>
        <p className="mt-1 text-xs leading-5">다른 기기·브라우저에서는 목록이 달라져요. 브라우저 데이터를 지우면 기존 보관함에 접근할 수 없어요. 소중한 그림은 PNG로 저장해주세요.</p>
      </aside>
      {copyMessage && <p role="status" className="mt-3 text-sm text-indigo-700">{copyMessage}</p>}
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p>{error} {rooms.length > 0 && "아래 목록은 마지막으로 확인한 상태예요."}</p>
        <button type="button" onClick={refresh} disabled={isRefreshing} className="button-secondary mt-3">다시 시도</button>
      </div>}
      {isLoading ? <p role="status" className="panel mt-5 p-6 text-sm text-slate-500">내 그림을 확인하는 중…</p>
        : !error && rooms.length === 0 ? <div className="panel mt-5 px-6 py-8 sm:px-8 sm:py-10">
          <p className="font-semibold">{scope === "guest" ? "아직 참여한 그림이 없어요." : scope === "host" ? "아직 시작한 그림이 없어요." : "아직 함께 그린 그림이 없어요."}</p>
          <p className="mt-2 text-sm text-slate-500">그림을 시작하거나 친구의 그림에 참여하면 여기에 표시돼요.</p>
          <Link href={scope === "guest" ? "/join" : "/draw"} className="button-secondary mt-4">{scope === "guest" ? "참여 코드 입력하기" : "그림 시작하기"}</Link>
        </div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const status = STATUS[room.status];
            return <article key={room.id} className="panel room-card flex flex-col items-start p-4 sm:p-5">
              <p className="mb-2 text-xs font-semibold text-slate-500">{room.participantRole === "host" ? "내가 시작한 그림" : "내가 참여한 그림"}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{room.status === "guest_joined" && room.participantRole === "guest" ? "이어 그릴 차례" : status.label}</span>
              {room.status === "completed" && <Link href={`/rooms/${room.id}`} aria-label={`${room.prompt} 완성 그림 열기`} className="block w-full rounded-xl"><RoomThumbnail roomId={room.id} prompt={room.prompt} cache={thumbnails} /></Link>}
              <div className="room-topic mt-4"><p className="text-xs font-semibold text-slate-600">그림 주제</p><h3 className="mt-2 break-words text-lg font-bold">{room.prompt}</h3></div>
              <time dateTime={room.created_at} className="mt-1 text-xs text-slate-500">
                {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(room.created_at))} 시작
              </time>
              <p className="mb-5 mt-3 text-sm leading-6 text-slate-600">{room.participantRole === "guest" && room.status === "guest_joined" ? "내 반쪽을 이어 그려 완성해주세요." : status.description}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/rooms/${room.id}`} className={room.status === "completed" ? "button-primary" : "button-secondary"}>
                  {room.status === "completed" ? "완성 그림 보기 →" : "방으로 이동"}
                </Link>
                {room.participantRole === "host" && (room.status === "waiting" || room.status === "guest_joined") &&
                  <button type="button" onClick={() => copyCode(room.code)} className="button-secondary">코드 복사</button>}
              </div>
            </article>;
          })}
        </div>}
      {total > MY_ROOMS_PAGE_SIZE && <nav aria-label="내 그림 목록 페이지" className="mt-5 flex items-center justify-center gap-4">
        <button type="button" onClick={() => changePage(page - 1)} disabled={page === 0 || isLoading || isRefreshing} className="button-secondary">이전</button>
        <span className="text-sm text-slate-500">{page + 1} / {Math.ceil(total / MY_ROOMS_PAGE_SIZE)}</span>
        <button type="button" onClick={() => changePage(page + 1)} disabled={!hasNextPage || isLoading || isRefreshing} className="button-secondary">다음</button>
      </nav>}
      {!isLoading && !error && rooms.length > 0 && <AdBanner placement="library" />}
    </section>
  );
}
