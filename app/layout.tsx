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
        <header className="site-header">
          <nav aria-label="주 메뉴" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-5">
            <Link href="/" aria-label="반쪽그림 홈으로" className="flex min-h-11 items-center gap-2">
              <span aria-hidden="true" className="text-2xl text-[#d99152]">✦</span>
              <span className="brand-title text-[24px] sm:text-[28px]">Half Drawing<br /><span className="ml-5">Practice</span></span>
            </Link>
            <div className="flex items-center gap-2" aria-label="바로가기">
              <Link href="/" className="nav-sticker bg-[#ffdc8a]">홈</Link>
              <Link href="/#my-drawings" className="nav-sticker bg-[#c9dfb6]">내 보관함</Link>
              <Link href="/join" className="nav-sticker bg-[#f3b3bd]" aria-label="코드로 참여">코드 참여</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="mt-auto border-t border-[#c8b99b] bg-[#fffbed]/90 px-5 py-8 text-center text-xs leading-6 text-slate-500 sm:py-10">
          두 사람의 상상이 만나는 곳, 반쪽그림<br />
          참여 코드는 7일 동안 유효해요. 완성한 그림은 기기에 저장해주세요.
        </footer>
      </body>
    </html>
  );
}
