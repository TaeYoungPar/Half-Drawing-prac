import Link from "next/link";
import { DrawingCanvas } from "../components/DrawingCanvas";

export default function DrawPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:gap-4 sm:p-6">
      <Link href="/" className="text-sm font-medium text-slate-500">← 홈으로</Link>

      <span className="eyebrow">STEP 1 · 내 반쪽 그리기</span>
      <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">어떤 상상을 시작해볼까요?</h1>

      <p>왼쪽 절반을 그린 뒤 주제와 함께 등록하고 참여 코드를 공유하세요.</p>

      <DrawingCanvas drawingSide="left" />
    </main>
  );
}
