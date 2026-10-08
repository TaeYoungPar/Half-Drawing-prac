import type { Metadata } from "next";
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
        <header className="border-b border-slate-200/70 bg-white">
          <nav aria-label="주 메뉴" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">◐</span>
              반쪽그림
            </Link>
            <Link href="/join" className="text-sm font-semibold text-indigo-700">코드로 참여 ↗</Link>
          </nav>
        </header>
        {children}
        <footer className="mt-auto border-t border-slate-200/70 px-5 py-6 text-center text-xs leading-6 text-slate-500">
          두 사람의 상상이 만나는 곳, 반쪽그림<br />
          참여 코드는 7일 동안 유효해요. 완성한 그림은 기기에 저장해주세요.
        </footer>
      </body>
    </html>
  );
}
