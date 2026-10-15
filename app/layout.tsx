import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

export const metadata: Metadata = {
  title: "반쪽그림 | 함께 완성하는 그림",
  description: "그림의 절반을 그리고 참여 코드를 공유해, 두 사람이 한 장의 그림을 완성하세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-200/80 bg-white/90">
          <nav aria-label="주 메뉴" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 text-lg font-extrabold tracking-tight">
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xl text-white">◐</span>
              반쪽그림
            </Link>
            <Link href="/join" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">코드로 참여 ↗</Link>
          </nav>
        </header>
        {children}
        <footer className="mt-auto border-t border-slate-200 px-5 py-8 text-center text-xs leading-6 text-slate-500 sm:py-10">
          두 사람의 상상이 만나는 곳, 반쪽그림<br />
          참여 코드는 7일 동안 유효해요. 완성한 그림은 기기에 저장해주세요.
        </footer>
      </body>
    </html>
  );
}
