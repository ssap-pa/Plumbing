import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "설비 현장 운영자",
  description: "견적서 분석 · 현장 기록 · 실행비 차액 · 개선사항 정리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
            <Link href="/" className="px-5 py-5 text-base font-bold tracking-tight">
              설비 현장 운영자
            </Link>
            <NavLinks />
            <div className="mt-auto px-5 py-4 text-xs text-muted">
              데이터는 <code>webapp/data</code> 폴더에 저장됩니다.
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
              <Link href="/" className="font-bold">설비 현장 운영자</Link>
              <NavLinks compact />
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
