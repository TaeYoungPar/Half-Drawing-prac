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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">우리 그림, 이어서 확인해요</h1>
          <Link href="/draw" className="button-secondary">새 그림 시작하기</Link>
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
