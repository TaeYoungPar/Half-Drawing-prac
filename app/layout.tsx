import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "./components/SiteHeader";
import { adsPublisherId } from "./lib/ads";
import Link from "next/link";
import { contactEmail, siteUrl } from "./lib/public-content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };
const adPublisher = adsPublisherId();

export const metadata: Metadata = {
  other: adPublisher ? { "google-adsense-account": adPublisher } : undefined,
  metadataBase: siteUrl,
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
        <SiteHeader />
        {children}
        <footer className="mt-auto border-t border-[#c8b99b] bg-[#fffbed]/90 px-5 py-8 text-center text-xs leading-6 text-slate-500 sm:py-10">
          <nav aria-label="서비스 안내" className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm font-bold text-slate-700"><Link className="inline-flex min-h-11 items-center" href="/guide">이용 가이드</Link><Link className="inline-flex min-h-11 items-center" href="/examples">그리기 예시</Link><Link className="inline-flex min-h-11 items-center" href="/about">소개·문의</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">개인정보·저장 안내</Link></nav>
          두 사람의 상상이 만나는 곳, 반쪽그림<br />
          참여 코드는 7일 동안 유효해요. 완성한 그림은 기기에 저장해주세요.
          <p className="mt-2">운영 문의 <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
        </footer>
      </body>
    </html>
  );
}
