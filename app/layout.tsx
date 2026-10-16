import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { SiteNavigation } from "./components/SiteNavigation";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://half-drawing-prac.vercel.app")),
  title: "반쪽그림 | 내 반쪽에 네 상상을 더해!",
  description: "나는 왼쪽, 너는 오른쪽. 작은 힌트만 보고 이어 그리고, 완성된 둘의 그림을 함께 열어봐요. 회원가입 없이 친구와 즐기는 반쪽그림!",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "반쪽그림",
    title: "반쪽만 보고, 이어 그릴 수 있어? 🎨",
    description: "나는 왼쪽, 너는 오른쪽. 힌트만 보고 이어 그린 뒤, 둘의 상상이 만나는 순간을 함께 열어봐!",
  },
  twitter: {
    card: "summary_large_image",
    title: "반쪽만 보고, 이어 그릴 수 있어? 🎨",
    description: "친구의 힌트에 네 상상을 더해봐. 완성되면 함께 열어보는 반쪽그림!",
    images: [{ url: "/opengraph-image.png", alt: "반쪽그림의 살구색·민트색 고양이와 ‘반쪽만 보고, 이어 그릴 수 있어?’ 초대 카드" }],
  },
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
            <SiteNavigation />
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
