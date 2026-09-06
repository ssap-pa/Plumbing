import Link from "next/link";
import { listSites } from "@/lib/store";
import { analyzeSite } from "@/lib/analysis";
import { SITE_STATUS_LABEL } from "@/lib/types";
import { hours, pct, won } from "@/lib/format";
import { Badge, Button, Card, Empty, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const sites = listSites();
  const rows = sites.map((s) => ({ site: s, a: analyzeSite(s) }));
  const done = rows.filter((r) => r.site.status === "done");
  const quoteSum = rows.reduce((x, r) => x + r.a.quoteSupply, 0);
  const execSum = rows.reduce((x, r) => x + r.a.executionCost, 0);
  const marginSum = rows.reduce((x, r) => x + r.a.margin, 0);
  const hoursSum = rows.reduce((x, r) => x + r.a.totalHours, 0);
  const doneMargin = done.reduce((x, r) => x + r.a.margin, 0);
  const doneHours = done.reduce((x, r) => x + r.a.totalHours, 0);
  const doneQuote = done.reduce((x, r) => x + r.a.quoteSupply, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">대시보드</h1>
          <p className="text-sm text-muted">현장 {sites.length}건 · 완료 {done.length}건</p>
        </div>
        <div className="flex gap-2">
          <Link href="/predict"><Button variant="secondary">견적 예측</Button></Link>
          <Link href="/sites/new"><Button>+ 견적서 업로드</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="견적 공급가액 합계" value={won(quoteSum)} />
        <Stat label="실행비 합계" value={won(execSum)} sub="자재비 + 경비" />
        <Stat label="마진 합계" value={won(marginSum)} tone={marginSum >= 0 ? "positive" : "negative"} sub="공급가액 − 실행비" />
        <Stat label="평균 마진율(완료)" value={pct(doneQuote > 0 ? doneMargin / doneQuote : 0)} tone="accent" />
        <Stat label="총 시공시간" value={hours(hoursSum)} />
        <Stat label="시간당 마진(완료)" value={won(doneHours > 0 ? doneMargin / doneHours : 0)} tone="accent" />
      </div>

      <Card title="현장 목록">
        {rows.length === 0 ? (
          <Empty>
            아직 등록된 현장이 없습니다. <Link href="/sites/new" className="text-accent underline">견적서를 업로드</Link>해 첫 현장을 만드세요.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">현장</th>
                  <th className="py-2 text-left">공종</th>
                  <th className="py-2 text-left">상태</th>
                  <th className="py-2 text-right">견적(공급가)</th>
                  <th className="py-2 text-right">실행비</th>
                  <th className="py-2 text-right">마진</th>
                  <th className="py-2 text-right">마진율</th>
                  <th className="py-2 text-right">시공시간</th>
                  <th className="py-2 text-right">시간당 마진</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ site, a }) => (
                  <tr key={site.id} className="border-b border-border/60 hover:bg-background">
                    <td className="py-2">
                      <Link href={`/sites/${site.id}`} className="font-medium text-accent hover:underline">{site.name}</Link>
                      <div className="text-xs text-muted">{site.address || "주소 없음"} · {site.quoteDate}</div>
                    </td>
                    <td className="py-2">{site.workType || "-"}</td>
                    <td className="py-2">
                      <Badge tone={site.status === "done" ? "positive" : site.status === "in_progress" ? "accent" : "neutral"}>{SITE_STATUS_LABEL[site.status]}</Badge>
                    </td>
                    <td className="num py-2 text-right">{won(a.quoteSupply)}</td>
                    <td className="num py-2 text-right">{won(a.executionCost)}</td>
                    <td className={`num py-2 text-right font-medium ${a.margin < 0 ? "text-negative" : ""}`}>{won(a.margin)}</td>
                    <td className="num py-2 text-right">{pct(a.marginRate)}</td>
                    <td className="num py-2 text-right">{hours(a.totalHours)}</td>
                    <td className="num py-2 text-right">{a.totalHours > 0 ? won(a.marginPerHour) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
