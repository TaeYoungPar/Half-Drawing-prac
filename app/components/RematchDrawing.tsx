"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import { createRematch, getRematch, type Rematch } from "../lib/rooms/rematch";
import { DrawingCanvas } from "./DrawingCanvas";
import { LoadingPage } from "./LoadingState";

export function RematchDrawing({ parentId }: { parentId: string }) {
  const { userId, isLoading, errorMessage, retry } = useAnonymousAuth();
  const [round, setRound] = useState<Rematch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!userId || isLoading) return;
    let cancelled = false;
    const controller = new AbortController();
    getRematch(parentId, controller.signal).then(result => {
      if (!cancelled) { setRound(result); setError(result ? null : "다음 판을 아직 열 수 없어요. 이전 그림에서 다시 확인해주세요."); }
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "다음 판을 불러오지 못했어요."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [parentId, userId, isLoading, attempt]);
  if (errorMessage || error) return <main className="workspace"><h1 className="section-heading">다음 판을 확인해주세요</h1><p role="alert" className="text-sm leading-7">{errorMessage || error}</p><div className="flex flex-wrap gap-3"><button type="button" className="button-secondary" onClick={() => errorMessage ? retry() : setAttempt(value => value + 1)}>다시 시도</button><Link href={`/rooms/${parentId}`} className="button-secondary">이전 완성 그림으로</Link></div></main>;
  if (isLoading || loading || !round) return <LoadingPage title="다음 판을 준비하고 있어요" description="같은 친구와 역할을 바꿔 이어 그릴 준비를 해요." />;
  if (round.starter_id !== userId) return <main className="workspace"><h1 className="section-heading">이번엔 친구가 먼저 그릴 차례예요</h1><p className="text-sm leading-7">친구가 반쪽을 등록하면 이전 그림에서 바로 이어 그릴 수 있어요.</p><Link href={`/rooms/${parentId}`} className="button-secondary self-start">이전 완성 그림으로</Link></main>;
  if (round.next_room_id && round.next_status !== "expired") return <main className="workspace"><h1 className="section-heading">다음 그림이 이미 준비됐어요</h1><Link href={`/rooms/${round.next_room_id}`} className="button-primary self-start">다음 그림 열기 →</Link></main>;
  return <main className="workspace drawing-workspace"><div className="space-y-2"><span className="eyebrow">역할 바꿔 한 판 더</span><h1 className="text-xl font-extrabold sm:text-4xl">이번엔 내가 먼저!</h1><p className="text-sm leading-6">왼쪽을 그려 등록하면 같은 친구가 오른쪽을 이어 그려요.</p></div><DrawingCanvas drawingSide="left" draftId={`rematch:${parentId}`} initialPrompt={round.prompt} onCreateRoom={(prompt, strokes) => createRematch(parentId, prompt, strokes)} /></main>;
}
