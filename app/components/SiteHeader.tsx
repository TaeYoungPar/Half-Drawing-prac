"use client";

import { Localized, LanguageSwitcher, useI18n } from "../i18n/I18n";
import Link from "next/link";
import { SiteNavigation } from "./SiteNavigation";

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <Localized as="nav" aria-label="주 메뉴" className="site-header-inner">
        <Link href="/" aria-label={t("Half Drawing 반쪽그림 홈으로")} className="site-brand flex min-h-11 items-center gap-2">
          <span aria-hidden="true" className="brand-full hidden text-2xl sm:inline text-[#d99152]">✦</span>
          <span className="brand-full brand-title whitespace-nowrap text-[24px] sm:text-[28px]">Half Drawing</span>
        </Link>
        <LanguageSwitcher />
        <SiteNavigation />
      </Localized>
    </header>
  );
}
