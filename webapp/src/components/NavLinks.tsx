"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "대시보드" },
  { href: "/sites/new", label: "견적서 업로드" },
  { href: "/predict", label: "견적 예측" },
];

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const path = usePathname();
  return (
    <nav className={compact ? "flex gap-1 overflow-x-auto" : "flex flex-col gap-0.5 px-3"}>
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-accent-soft font-semibold text-accent" : "text-foreground hover:bg-background"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
