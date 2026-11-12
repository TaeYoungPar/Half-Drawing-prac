"use client";

import { Text, useI18n } from "../i18n/I18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IntentLink } from "./IntentLink";

export function SiteNavigation() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto" aria-label={t("바로가기")}>
      {[
        { href: "/", label: "홈", color: "bg-[#ffdc8a]" },
        { href: "/library", label: "내 보관함", color: "bg-[#c9dfb6]" },
        { href: "/join", label: "코드 참여", color: "bg-[#f3b3bd]" },
      ].map(({ href, label, color }) => {
        const NavigationLink = pathname === "/" && href !== "/" ? IntentLink : Link;
        return <NavigationLink key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          className={`nav-sticker ${color}`}><Text>{label}</Text></NavigationLink>;
      })}
    </div>
  );
}
