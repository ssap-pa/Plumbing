"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuoteItemsEditor } from "@/components/QuoteItemsEditor";
import { Badge, Button, Card, CompareBars, DiffText, Empty, Field, Stat, inputCls } from "@/components/ui";
import { analyzeSite } from "@/lib/analysis";
import { hours, pct, today, toNum, won } from "@/lib/format";
import {
  OTHER_COST_LABEL,
  QUOTE_CATEGORY_LABEL,
  REVIEW_CATEGORY_LABEL,
  SITE_STATUS_LABEL,
  newId,
  type Material,
  type OtherCost,
  type OtherCostCategory,
  type QuoteCategory,
  type Site,
  type SiteStatus,
  type WorkLog,
} from "@/lib/types";

const TABS = [
  { key: "quote", label: "견적서" },
  { key: "work", label: "작업내용" },
  { key: "material", label: "사용자재·경비" },
  { key: "analysis", label: "견적 분석" },
  { key: "review", label: "보완·개선" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function SiteDetail({ initial }: { initial: Site }) {
  const router = useRouter();
  const [site, setSite] = useState<Site>(initial);
  const [tab, setTab] = useState<TabKey>("quote");
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const first = useRef(true);
  const a = useMemo(() => analyzeSite(site), [site]);

  // 변경 후 700ms 뒤 자동 저장
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/sites/${site.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(site) });
        if (!res.ok) throw new Error();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [site]);

  const patch = (p: Partial<Site>) => setSite((s) => ({ ...s, ...p }));

  const generateReview = async () => {
    setReviewBusy(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/sites/${site.id}/review`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "생성 실패");
      first.current = true; // 서버가 저장한 결과이므로 재저장하지 않음
      setSite(json.site);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setReviewBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`"${site.name}" 현장을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-xl font-bold focus:outline-none"
            value={site.name}
            onChange={(e) => patch({ name: e.target.value })}
            aria-label="현장명"
          />
          <div className="text-sm text-muted">{site.address || "주소 없음"} · 견적일 {site.quoteDate}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "저장됨" : saveState === "dirty" ? "변경됨" : saveState === "error" ? "저장 실패" : ""}
          </span>
          <select className={inputCls} value={site.status} onChange={(e) => patch({ status: e.target.value as SiteStatus })}>
            {(Object.keys(SITE_STATUS_LABEL) as SiteStatus[]).map((s) => (
              <option key={s} value={s}>{SITE_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <Button variant="danger" onClick={remove}>삭제</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="견적 공급가액" value={won(a.quoteSupply)} sub={`합계 ${won(a.quoteTotal)}`} />
        <Stat label="실행비" value={won(a.executionCost)} sub={`자재 ${won(a.materialTotal)} · 경비 ${won(a.otherTotal)}`} />
        <Stat label="마진(자재·경비 제외)" value={won(a.margin)} tone={a.margin >= 0 ? "positive" : "negative"} sub={`마진율 ${pct(a.marginRate)}`} />
        <Stat label="시공시간" value={hours(a.totalHours)} sub={`공수 ${hours(a.totalManHours)}`} />
        <Stat label="시간당 마진" value={a.totalHours > 0 ? won(a.marginPerHour) : "-"} tone="accent" />
        <Stat label="자재 견적 − 실제" value={won(a.quoteMaterialVsActual.diff)} tone={a.quoteMaterialVsActual.diff >= 0 ? "positive" : "negative"} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm ${tab === t.key ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quote" && <QuoteTab site={site} patch={patch} />}
      {tab === "work" && <WorkTab site={site} patch={patch} />}
      {tab === "material" && <MaterialTab site={site} patch={patch} />}
      {tab === "analysis" && <AnalysisTab site={site} />}
      {tab === "review" && (
        <ReviewTab site={site} patch={patch} busy={reviewBusy} error={reviewError} onGenerate={generateReview} />
      )}
    </div>
  );
}

type TabProps = { site: Site; patch: (p: Partial<Site>) => void };

function QuoteTab({ site, patch }: TabProps) {
  const q = site.quotation;
  const setQ = (p: Partial<Site["quotation"]>) => patch({ quotation: { ...q, ...p } });
  const itemSum = q.items.reduce((x, i) => x + i.amount, 0);
  return (
    <div className="flex flex-col gap-4">
      <Card title="현장 정보">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="주소"><input className={inputCls} value={site.address} onChange={(e) => patch({ address: e.target.value })} /></Field>
          <Field label="고객"><input className={inputCls} value={site.customer} onChange={(e) => patch({ customer: e.target.value })} /></Field>
          <Field label="견적일"><input type="date" className={inputCls} value={site.quoteDate} onChange={(e) => patch({ quoteDate: e.target.value })} /></Field>
          <Field label="공종"><input className={inputCls} value={site.workType} onChange={(e) => patch({ workType: e.target.value })} /></Field>
          <Field label="건물 유형"><input className={inputCls} value={site.buildingType} onChange={(e) => patch({ buildingType: e.target.value })} /></Field>
        </div>
      </Card>
      <div className={`grid grid-cols-1 gap-4 ${q.imageFile ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        <Card title="견적 항목">
          <QuoteItemsEditor items={q.items} onChange={(items) => setQ({ items })} />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="공급가액"><input className={`${inputCls} num text-right`} value={q.supplyAmount} onChange={(e) => setQ({ supplyAmount: toNum(e.target.value) })} /></Field>
            <Field label="부가세"><input className={`${inputCls} num text-right`} value={q.vat} onChange={(e) => setQ({ vat: toNum(e.target.value) })} /></Field>
            <Field label="합계"><input className={`${inputCls} num text-right`} value={q.totalAmount} onChange={(e) => setQ({ totalAmount: toNum(e.target.value) })} /></Field>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => setQ({ supplyAmount: itemSum, vat: Math.round(itemSum * 0.1), totalAmount: Math.round(itemSum * 1.1) })}>
                항목 합으로 채우기
              </Button>
            </div>
          </div>
          <Field label="메모" className="mt-3"><textarea className={`${inputCls} min-h-16`} value={q.note} onChange={(e) => setQ({ note: e.target.value })} /></Field>
        </Card>
        {q.imageFile && (
          <Card title="원본 견적서">
            <a href={`/api/files/${q.imageFile}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${q.imageFile}`} alt="견적서 원본" className="w-full rounded-md border border-border" />
            </a>
            {q.extractedAt && <div className="mt-2 text-xs text-muted">추출 {new Date(q.extractedAt).toLocaleString("ko-KR")}</div>}
          </Card>
        )}
      </div>
    </div>
  );
}

function WorkTab({ site, patch }: TabProps) {
  const logs = site.workLogs;
  const set = (next: WorkLog[]) => patch({ workLogs: next });
  const update = (id: string, p: Partial<WorkLog>) => set(logs.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const add = () => set([...logs, { id: newId("w"), date: today(), content: "", workers: 1, hours: 0, note: "" }]);
  const totalHours = logs.reduce((x, l) => x + l.hours, 0);
  const manHours = logs.reduce((x, l) => x + l.hours * (l.workers || 1), 0);
  return (
    <Card title="작업 기록" action={<span className="text-xs text-muted">총 {hours(totalHours)} · 공수 {hours(manHours)}</span>}>
      {logs.length === 0 ? (
        <Empty>작업 기록이 없습니다. 날짜별로 작업 내용과 소요 시간을 남기세요.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                <th className="w-36 px-1 py-2 text-left">날짜</th>
                <th className="w-20 px-1 py-2 text-right">인원</th>
                <th className="w-24 px-1 py-2 text-right">시간(h)</th>
                <th className="px-1 py-2 text-left">작업 내용</th>
                <th className="w-48 px-1 py-2 text-left">비고</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/60 align-top">
                  <td><input type="date" className="cell-input" value={l.date} onChange={(e) => update(l.id, { date: e.target.value })} /></td>
                  <td><input className="cell-input num text-right" value={l.workers} onChange={(e) => update(l.id, { workers: toNum(e.target.value) })} /></td>
                  <td><input className="cell-input num text-right" value={l.hours} onChange={(e) => update(l.id, { hours: toNum(e.target.value) })} /></td>
                  <td><textarea className="cell-input min-h-9" rows={1} value={l.content} onChange={(e) => update(l.id, { content: e.target.value })} placeholder="예: 매립수전 2개소 7cm 하향, PB 배관 재연결" /></td>
                  <td><input className="cell-input" value={l.note} onChange={(e) => update(l.id, { note: e.target.value })} /></td>
                  <td className="text-center"><button type="button" onClick={() => set(logs.filter((x) => x.id !== l.id))} className="text-muted hover:text-negative" aria-label="삭제">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3"><Button variant="secondary" onClick={add}>+ 작업 기록 추가</Button></div>
    </Card>
  );
}

function MaterialTab({ site, patch }: TabProps) {
  const mats = site.materials;
  const setM = (next: Material[]) => patch({ materials: next });
  const updateM = (id: string, p: Partial<Material>) =>
    setM(
      mats.map((m) => {
        if (m.id !== id) return m;
        const n = { ...m, ...p };
        if ("qty" in p || "unitPrice" in p) n.amount = Math.round(n.qty * n.unitPrice);
        return n;
      }),
    );
  const addM = () => setM([...mats, { id: newId("m"), name: "", spec: "", unit: "EA", qty: 1, unitPrice: 0, amount: 0, supplier: "", note: "" }]);
  const matTotal = mats.reduce((x, m) => x + m.amount, 0);

  const costs = site.otherCosts;
  const setC = (next: OtherCost[]) => patch({ otherCosts: next });
  const updateC = (id: string, p: Partial<OtherCost>) => setC(costs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const addC = () => setC([...costs, { id: newId("c"), category: "etc", name: "", amount: 0, note: "" }]);
  const costTotal = costs.reduce((x, c) => x + c.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card title="사용 자재" action={<span className="text-xs text-muted">자재비 합계 {won(matTotal)}</span>}>
        {mats.length === 0 ? (
          <Empty>사용한 자재를 기록하세요. 견적 항목과 연결하면 항목별 차액이 계산됩니다.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-1 py-2 text-left">품명</th>
                  <th className="px-1 py-2 text-left">규격</th>
                  <th className="w-16 px-1 py-2 text-left">단위</th>
                  <th className="w-20 px-1 py-2 text-right">수량</th>
                  <th className="w-28 px-1 py-2 text-right">단가</th>
                  <th className="w-28 px-1 py-2 text-right">금액</th>
                  <th className="w-28 px-1 py-2 text-left">구입처</th>
                  <th className="w-40 px-1 py-2 text-left">견적 항목 연결</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {mats.map((m) => (
                  <tr key={m.id} className="border-b border-border/60">
                    <td><input className="cell-input" value={m.name} onChange={(e) => updateM(m.id, { name: e.target.value })} /></td>
                    <td><input className="cell-input" value={m.spec} onChange={(e) => updateM(m.id, { spec: e.target.value })} /></td>
                    <td><input className="cell-input" value={m.unit} onChange={(e) => updateM(m.id, { unit: e.target.value })} /></td>
                    <td><input className="cell-input num text-right" value={m.qty} onChange={(e) => updateM(m.id, { qty: toNum(e.target.value) })} /></td>
                    <td><input className="cell-input num text-right" value={m.unitPrice} onChange={(e) => updateM(m.id, { unitPrice: toNum(e.target.value) })} /></td>
                    <td><input className="cell-input num text-right" value={m.amount} onChange={(e) => updateM(m.id, { amount: toNum(e.target.value) })} /></td>
                    <td><input className="cell-input" value={m.supplier} onChange={(e) => updateM(m.id, { supplier: e.target.value })} /></td>
                    <td>
                      <select className="cell-input" value={m.quoteItemId ?? ""} onChange={(e) => updateM(m.id, { quoteItemId: e.target.value || undefined })}>
                        <option value="">(연결 안 함)</option>
                        {site.quotation.items.map((q) => (
                          <option key={q.id} value={q.id}>{q.name || "(이름 없음)"}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-center"><button type="button" onClick={() => setM(mats.filter((x) => x.id !== m.id))} className="text-muted hover:text-negative" aria-label="삭제">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3"><Button variant="secondary" onClick={addM}>+ 자재 추가</Button></div>
      </Card>

      <Card title="기타 경비" action={<span className="text-xs text-muted">경비 합계 {won(costTotal)}</span>}>
        {costs.length === 0 ? (
          <Empty>외주 인건비, 장비 대여, 폐기물 처리, 교통비 등 자재 외 실행비를 기록하세요.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                <th className="w-36 px-1 py-2 text-left">구분</th>
                <th className="px-1 py-2 text-left">내용</th>
                <th className="w-32 px-1 py-2 text-right">금액</th>
                <th className="w-48 px-1 py-2 text-left">비고</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td>
                    <select className="cell-input" value={c.category} onChange={(e) => updateC(c.id, { category: e.target.value as OtherCostCategory })}>
                      {(Object.keys(OTHER_COST_LABEL) as OtherCostCategory[]).map((k) => (
                        <option key={k} value={k}>{OTHER_COST_LABEL[k]}</option>
                      ))}
                    </select>
                  </td>
                  <td><input className="cell-input" value={c.name} onChange={(e) => updateC(c.id, { name: e.target.value })} /></td>
                  <td><input className="cell-input num text-right" value={c.amount} onChange={(e) => updateC(c.id, { amount: toNum(e.target.value) })} /></td>
                  <td><input className="cell-input" value={c.note} onChange={(e) => updateC(c.id, { note: e.target.value })} /></td>
                  <td className="text-center"><button type="button" onClick={() => setC(costs.filter((x) => x.id !== c.id))} className="text-muted hover:text-negative" aria-label="삭제">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3"><Button variant="secondary" onClick={addC}>+ 경비 추가</Button></div>
      </Card>
    </div>
  );
}

function AnalysisTab({ site }: { site: Site }) {
  const a = analyzeSite(site);
  const cats = (Object.keys(QUOTE_CATEGORY_LABEL) as QuoteCategory[]).filter((c) => a.quoteByCategory[c] > 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="견적 vs 실행비">
          <CompareBars
            rows={[
              { label: "자재 (견적 자재 항목 vs 실제 자재비)", quote: a.quoteMaterialVsActual.quote, actual: a.quoteMaterialVsActual.actual },
              { label: "경비 (견적 경비 항목 vs 실제 경비)", quote: a.quoteByCategory.expense, actual: a.otherTotal },
              { label: "전체 (공급가액 vs 실행비)", quote: a.quoteSupply, actual: a.executionCost },
            ]}
          />
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">견적 공급가액</dt><dd className="num text-right">{won(a.quoteSupply)}</dd>
            <dt className="text-muted">− 실제 자재비</dt><dd className="num text-right">{won(a.materialTotal)}</dd>
            <dt className="text-muted">− 실제 경비</dt><dd className="num text-right">{won(a.otherTotal)}</dd>
            <dt className="font-semibold">= 마진(자재·경비 제외)</dt>
            <dd className={`num text-right font-semibold ${a.margin < 0 ? "text-negative" : "text-positive"}`}>{won(a.margin)} ({pct(a.marginRate)})</dd>
            <dt className="text-muted">시공시간</dt><dd className="num text-right">{hours(a.totalHours)}</dd>
            <dt className="text-muted">시간당 마진</dt><dd className="num text-right">{a.totalHours > 0 ? won(a.marginPerHour) : "작업 기록 없음"}</dd>
          </dl>
        </Card>
        <Card title="견적 구성">
          {cats.length === 0 ? (
            <Empty>견적 항목이 없습니다.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {cats.map((c) => (
                  <tr key={c} className="border-b border-border/60">
                    <td className="py-2">{QUOTE_CATEGORY_LABEL[c]}</td>
                    <td className="num py-2 text-right">{won(a.quoteByCategory[c])}</td>
                    <td className="num py-2 text-right text-muted">{pct(a.quoteSupply > 0 ? a.quoteByCategory[c] / a.quoteSupply : 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-semibold">합계</td>
                  <td className="num py-2 text-right font-semibold">{won(a.quoteSupply)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted">부가세 {won(site.quotation.vat)}는 마진 계산에서 제외했습니다.</p>
        </Card>
      </div>

      <Card title="항목별 차액 (견적 금액 − 연결된 실제 자재비)">
        {a.items.length === 0 ? (
          <Empty>견적 항목이 없습니다.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">견적 항목</th>
                  <th className="py-2 text-left">구분</th>
                  <th className="py-2 text-right">견적 금액</th>
                  <th className="py-2 text-right">실제 자재비</th>
                  <th className="py-2 text-right">차액</th>
                </tr>
              </thead>
              <tbody>
                {a.items.map((i) => (
                  <tr key={i.quoteItemId} className="border-b border-border/60">
                    <td className="py-2">{i.name || "(이름 없음)"}</td>
                    <td className="py-2"><Badge>{QUOTE_CATEGORY_LABEL[i.category]}</Badge></td>
                    <td className="num py-2 text-right">{won(i.quoteAmount)}</td>
                    <td className="num py-2 text-right">{i.actualAmount > 0 ? won(i.actualAmount) : <span className="text-muted">연결 없음</span>}</td>
                    <td className="py-2 text-right">{i.actualAmount > 0 ? <DiffText value={i.diff} /> : <span className="text-muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {a.unmappedMaterialTotal > 0 && (
          <p className="mt-3 text-xs text-warn">견적 항목에 연결되지 않은 자재비 {won(a.unmappedMaterialTotal)}가 있습니다. 사용자재 탭에서 연결하면 항목별 차액에 반영됩니다.</p>
        )}
      </Card>
    </div>
  );
}

function ReviewTab({ site, patch, busy, error, onGenerate }: TabProps & { busy: boolean; error: string | null; onGenerate: () => void }) {
  const r = site.review;
  return (
    <div className="flex flex-col gap-4">
      <Card
        title="보완점 · 개선사항"
        action={
          <div className="flex items-center gap-2">
            {r.generatedAt && <span className="text-xs text-muted">생성 {new Date(r.generatedAt).toLocaleString("ko-KR")}</span>}
            <Button onClick={onGenerate} disabled={busy}>{busy ? "생성 중…" : r.generatedAt ? "AI로 다시 생성" : "AI로 생성"}</Button>
          </div>
        }
      >
        {error && <div className="mb-3 rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">{error}</div>}
        {!r.summary && r.items.length === 0 ? (
          <Empty>견적·작업·자재 기록을 바탕으로 보완점을 정리합니다. 기록을 채운 뒤 생성하세요.</Empty>
        ) : (
          <>
            {r.summary && <p className="mb-4 rounded-md bg-background px-4 py-3 text-sm leading-relaxed">{r.summary}</p>}
            <ul className="flex flex-col gap-3">
              {r.items.map((it, idx) => (
                <li key={idx} className="rounded-lg border border-border px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="accent">{REVIEW_CATEGORY_LABEL[it.category] ?? it.category}</Badge>
                    <span className="font-semibold">{it.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{it.detail}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card title="운영자 메모">
        <textarea
          className={`${inputCls} min-h-32 w-full`}
          value={r.manualNotes}
          onChange={(e) => patch({ review: { ...r, manualNotes: e.target.value } })}
          placeholder="현장에서 느낀 점, 고객 요청, 다음에 챙길 것 등을 자유롭게 적으세요. AI 생성 시 함께 참고합니다."
        />
      </Card>
    </div>
  );
}
