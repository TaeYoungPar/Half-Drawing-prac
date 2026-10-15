"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2" aria-label="바로가기">
      {[
        { href: "/", label: "홈", color: "bg-[#ffdc8a]" },
        { href: "/library", label: "내 보관함", color: "bg-[#c9dfb6]" },
        { href: "/join", label: "코드 참여", color: "bg-[#f3b3bd]" },
      ].map(({ href, label, color }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          aria-label={href === "/join" ? "코드로 참여" : undefined} className={`nav-sticker ${color}`}>{label}</Link>
      ))}
    </div>
  );
}
