import { Text } from "../i18n/I18n";
import type { Metadata } from "next";
import Link from "next/link";
import { DrawingLibrary } from "../components/DrawingLibrary";
import { publicBannerConfig } from "../lib/ads";

export const metadata: Metadata = { title: "내 보관함 | 반쪽그림" };

export default function LibraryPage() {
  return (
    <main className="workspace">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow"><Text>우리의 그림 노트</Text></span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl"><Text>내 보관함</Text></h1>
        </div>
        <Link href="/draw" className="button-primary"><Text>그림 시작하기</Text></Link>
      </div>
      <DrawingLibrary adConfig={publicBannerConfig()} />
    </main>
  );
}
