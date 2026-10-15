import type { Metadata } from "next";
import Link from "next/link";
import { DrawingLibrary } from "../components/DrawingLibrary";

export const metadata: Metadata = { title: "내 보관함 | 반쪽그림" };

export default function LibraryPage() {
  return (
    <main className="workspace">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">우리의 그림 노트</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">내 보관함</h1>
        </div>
        <Link href="/draw" className="button-primary">그림 시작하기</Link>
      </div>
      <DrawingLibrary />
    </main>
  );
}
