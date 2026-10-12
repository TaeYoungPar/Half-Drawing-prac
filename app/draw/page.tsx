import Link from "next/link";
import { DrawingCanvas } from "../components/DrawingCanvas";

export default function DrawPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:gap-4 sm:p-6">
      <Link href="/" className="inline-flex min-h-11 self-start items-center rounded-xl px-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">← 홈으로</Link>

      <span className="eyebrow">STEP 1 · 내 반쪽 그리기</span>
      <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">어떤 상상을 시작해볼까요?</h1>

      <p className="text-sm leading-6 text-slate-600">왼쪽을 그리고 주제를 적으면, 친구에게 보낼 초대 링크가 생겨요.</p>

      <DrawingCanvas drawingSide="left" />
    </main>
  );
}
