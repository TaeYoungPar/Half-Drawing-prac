import { Localized, Text, LanguageProvider } from "./i18n/I18n";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "./components/SiteHeader";
import { SiteAnalytics } from "./components/SiteAnalytics";
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
  verification: { google: "L2GlAepP6f4E9SEBD7CsBlv7i1U3EXMZ9zU7YVkO-Xg" },
  other: adPublisher ? { "google-adsense-account": adPublisher } : undefined,
  metadataBase: siteUrl,
  applicationName: "Half Drawing",
  title: "반쪽그림 Half Drawing | 친구와 반씩 그리는 그림 게임",
  description: "회원가입 없이 친구와 반쪽씩 그리는 온라인 그림 게임. 서로의 그림을 모른 채 경계 힌트만 보고 이어 그리고, 완성된 한 장을 함께 열어보세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "반쪽그림 · Half Drawing",
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
        <LanguageProvider>
        <SiteHeader />
        {children}
        <footer className="mt-auto border-t border-[#c8b99b] bg-[#fffbed]/90 px-5 py-8 text-center text-xs leading-6 text-slate-500 sm:py-10">
          <Localized as="nav" aria-label="서비스 안내" className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm font-bold text-slate-700"><Link className="inline-flex min-h-11 items-center" href="/guide"><Text>이용 가이드</Text></Link><Link className="inline-flex min-h-11 items-center" href="/examples"><Text>그리기 예시</Text></Link><Link className="inline-flex min-h-11 items-center" href="/about"><Text>소개·문의</Text></Link><Link className="inline-flex min-h-11 items-center" href="/privacy"><Text>개인정보·저장 안내</Text></Link></Localized>
          <Text>두 사람의 상상이 만나는 곳, 반쪽그림</Text><br />
          <Text>참여 코드는 7일 동안 유효해요. 완성한 그림은 기기에 저장해주세요.</Text> <p className="mt-2"><Text>운영 문의</Text> <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
        </footer>
        {process.env.VERCEL_ENV === "production" && <SiteAnalytics />}
        </LanguageProvider>
      </body>
    </html>
  );
}
