"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMyRooms } from "../hooks/useMyRooms";
import { MyDrawings } from "./MyDrawings";

export function HomeDashboard({ introduction }: { introduction: ReactNode }) {
  const state = useMyRooms();
  return (
    <>
      {state.hasHistory ? (
        <div className="flex items-center justify-between gap-4">
          <h1 className="min-w-0 flex-1 text-xl font-extrabold tracking-tight sm:text-3xl">우리 그림 보관함</h1>
          <Link href="/draw" className="button-secondary shrink-0 px-4" aria-label="새 그림 시작하기">새 그림 ↗</Link>
        </div>
      ) : introduction}
      <MyDrawings state={state} />
      {state.hasHistory && (
        <details className="mt-8">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-slate-600">반쪽그림 사용 방법 보기</summary>
          <div className="mt-3">{introduction}</div>
        </details>
      )}
    </>
  );
}
