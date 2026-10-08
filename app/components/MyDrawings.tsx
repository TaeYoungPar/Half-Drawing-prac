"use client";

import Link from "next/link";
import { useState } from "react";
import { useMyRooms } from "../hooks/useMyRooms";
import { MY_ROOMS_PAGE_SIZE } from "../lib/rooms/getMyRooms";
import { copyRoomCode } from "../utils/copyRoomCode";
import type { DrawingStatus } from "../types/drawing";

const STATUS: Record<DrawingStatus, { label: string; className: string; description: string }> = {
  waiting: { label: "참여 대기", className: "bg-slate-100 text-slate-700", description: "친구에게 참여 코드를 보내주세요." },
  guest_joined: { label: "그리는 중", className: "bg-amber-50 text-amber-800", description: "친구가 참여했어요. 완성하면 여기서 확인할 수 있어요." },
  completed: { label: "완성됨", className: "bg-emerald-50 text-emerald-800", description: "두 사람의 그림이 완성됐어요. 전체 그림을 열어보세요!" },
  expired: { label: "기간 만료", className: "bg-slate-100 text-slate-500", description: "참여 기한이 지난 방이에요." },
};

export function MyDrawings() {
  const { rooms, total, page, isLoading, isRefreshing, error, refresh, changePage, hasNextPage } = useMyRooms();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  async function copyCode(code: string) {
    try { await copyRoomCode(code); setCopyMessage("참여 코드를 복사했어요. 친구에게 보내주세요."); }
    catch (reason) { setCopyMessage(reason instanceof Error ? reason.message : "복사하지 못했습니다."); }
  }

  return (
    <section aria-labelledby="my-drawings-heading" className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="my-drawings-heading" className="text-2xl font-bold">내가 시작한 그림</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">홈으로 돌아와도 친구의 진행 상태를 확인할 수 있어요.</p>
        </div>
        <button type="button" onClick={refresh} disabled={isLoading || isRefreshing} className="button-secondary">
          {isRefreshing ? "확인 중…" : "상태 새로고침"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">같은 브라우저의 익명 계정으로 조회해요. 홈을 열어두면 약 10초마다 갱신돼요. 브라우저 데이터를 지우면 이전 방을 찾지 못할 수 있어요.</p>
      {copyMessage && <p role="status" className="mt-3 text-sm text-indigo-700">{copyMessage}</p>}
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p>{error} {rooms.length > 0 && "아래 목록은 마지막으로 확인한 상태예요."}</p>
        <button type="button" onClick={refresh} disabled={isRefreshing} className="button-secondary mt-3">다시 시도</button>
      </div>}
      {isLoading ? <p role="status" className="panel mt-5 p-6 text-sm text-slate-500">내 그림을 확인하는 중…</p>
        : !error && rooms.length === 0 ? <div className="panel mt-5 p-6">
          <p className="font-semibold">아직 시작한 그림이 없어요.</p>
          <p className="mt-2 text-sm text-slate-500">반쪽 그림을 등록하면 여기에 표시돼요.</p>
          <Link href="/draw" className="button-primary mt-4">첫 그림 시작하기</Link>
        </div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const status = STATUS[room.status];
            return <article key={room.id} className="panel flex flex-col items-start p-5">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
              <h3 className="mt-4 w-full break-words text-lg font-bold">{room.prompt}</h3>
              <time dateTime={room.created_at} className="mt-1 text-xs text-slate-500">
                {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(room.created_at))} 시작
              </time>
              <p className="mb-5 mt-3 text-sm leading-6 text-slate-600">{status.description}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/rooms/${room.id}`} className={room.status === "completed" ? "button-primary" : "button-secondary"}>
                  {room.status === "completed" ? "완성 그림 보기 →" : "방으로 이동"}
                </Link>
                {(room.status === "waiting" || room.status === "guest_joined") &&
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
    </section>
  );
}
