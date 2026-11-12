"use client";

import { Localized, LanguageSwitcher, useI18n } from "../i18n/I18n";
import Link from "next/link";
import { SiteNavigation } from "./SiteNavigation";

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <Localized as="nav" aria-label="주 메뉴" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-5">
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:contents">
        <Link href="/" aria-label={t("Half Drawing 반쪽그림 홈으로")} className="site-brand flex min-h-11 items-center gap-2">
          <span aria-hidden="true" className="brand-full hidden text-2xl sm:inline text-[#d99152]">✦</span>
          <span className="brand-full brand-title whitespace-nowrap text-[24px] sm:text-[28px]">Half Drawing</span>
        </Link>
        <LanguageSwitcher />
        </div>
        <SiteNavigation />
      </Localized>
    </header>
  );
}
