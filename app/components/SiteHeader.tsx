import Link from "next/link";
import { SiteNavigation } from "./SiteNavigation";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav aria-label="주 메뉴" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-5">
        <Link href="/" aria-label="반쪽그림 홈으로" className="site-brand flex min-h-11 items-center gap-2">
          <span aria-hidden="true" className="brand-full text-2xl text-[#d99152]">✦</span>
          <span className="brand-full brand-title text-[24px] sm:text-[28px]">Half Drawing<br /><span className="ml-5">Practice</span></span>
        </Link>
        <SiteNavigation />
      </nav>
    </header>
  );
}
