"use client";

import { useState } from "react";
import type { ExampleKind } from "../lib/public-content";
import { ExampleArtwork, type ExampleMode } from "./ExampleArtwork";

const views: { mode: ExampleMode; label: string; description: string }[] = [
  { mode: "left", label: "내 반쪽", description: "시작하는 사람은 왼쪽에 그려요. 점선에 닿는 선이 친구에게 이어 그릴 단서가 돼요." },
  { mode: "hint", label: "친구의 화면", description: "친구에게는 경계 바로 옆의 좁은 힌트만 보여요. 왼쪽 전체를 보지 않고 빈 오른쪽을 채워요." },
  { mode: "full", label: "완성 예시", description: "두 사람이 제출하면 전체 그림을 함께 볼 수 있어요. 색과 표정이 달라도 하나의 그림으로 이어져요." },
];
export function ExamplePreview({ kind }: { kind: ExampleKind }) {
  const [mode, setMode] = useState<ExampleMode>("left");
  return <figure className="panel overflow-hidden p-3 sm:p-5">
    <div className="mb-4 grid grid-cols-3 gap-2" role="group" aria-label="예시 화면 선택">
      {views.map(view => <button key={view.mode} type="button" className="example-switch" aria-pressed={mode === view.mode} onClick={() => setMode(view.mode)}>{view.label}</button>)}
    </div>
    <div className="overflow-hidden rounded-xl border border-[#c8b99b]"><ExampleArtwork kind={kind} mode={mode} /></div>
    <figcaption className="mt-4"><p className="min-h-28 text-sm leading-7 sm:min-h-20" aria-live="polite">{views.find(view => view.mode === mode)?.description}</p><p className="mt-2 text-xs leading-6 text-slate-500">이용 방법을 설명하기 위해 제작한 가이드용 그림이에요. 사용자 작품이 아니에요.</p></figcaption>
  </figure>;
}
