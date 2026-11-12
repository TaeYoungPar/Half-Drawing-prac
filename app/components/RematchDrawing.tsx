"use client";

import { Text, useI18n } from "../i18n/I18n";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";
import { createRematch, getRematch, type Rematch } from "../lib/rooms/rematch";
import { DrawingCanvas } from "./DrawingCanvas";
import { LoadingPage } from "./LoadingState";

export function RematchDrawing({ parentId }: { parentId: string }) {
  const { t } = useI18n();
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
  if (errorMessage || error) return <main className="workspace"><h1 className="section-heading"><Text>다음 판을 확인해주세요</Text></h1><p role="alert" className="text-sm leading-7"><Text>{errorMessage || error}</Text></p><div className="flex flex-wrap gap-3"><button type="button" className="button-secondary" onClick={() => errorMessage ? retry() : setAttempt(value => value + 1)}><Text>다시 시도</Text></button><Link href={`/rooms/${parentId}`} className="button-secondary"><Text>이전 완성 그림으로</Text></Link></div></main>;
  if (isLoading || loading || !round) return <LoadingPage title={t("다음 판을 준비하고 있어요")} description="같은 친구와 역할을 바꿔 이어 그릴 준비를 해요." />;
  if (round.starter_id !== userId) return <main className="workspace"><h1 className="section-heading"><Text>이번엔 친구가 먼저 그릴 차례예요</Text></h1><p className="text-sm leading-7"><Text>친구가 반쪽을 등록하면 이전 그림에서 바로 이어 그릴 수 있어요.</Text></p><Link href={`/rooms/${parentId}`} className="button-secondary self-start"><Text>이전 완성 그림으로</Text></Link></main>;
  if (round.next_room_id && round.next_status !== "expired") return <main className="workspace"><h1 className="section-heading"><Text>다음 그림이 이미 준비됐어요</Text></h1><Link href={`/rooms/${round.next_room_id}`} className="button-primary self-start"><Text>다음 그림 열기 →</Text></Link></main>;
  return <main className="workspace drawing-workspace"><div className="space-y-2"><span className="eyebrow"><Text>역할 바꿔 한 판 더</Text></span><h1 className="text-xl font-extrabold sm:text-4xl"><Text>이번엔 내가 먼저!</Text></h1><p className="text-sm leading-6"><Text>왼쪽을 그려 등록하면 같은 친구가 오른쪽을 이어 그려요.</Text></p></div><DrawingCanvas drawingSide="left" draftId={`rematch:${parentId}`} initialPrompt={round.prompt} onCreateRoom={(prompt, strokes) => createRematch(parentId, prompt, strokes)} /></main>;
}
