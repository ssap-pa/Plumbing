"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageExtract, type ExtractResult } from "@/components/ImageExtract";
import { QuoteItemsEditor } from "@/components/QuoteItemsEditor";
import { Button, Card, Empty, Field, Stat, inputCls } from "@/components/ui";
import type { AiPrediction } from "@/lib/claude";
import type { Prediction } from "@/lib/predict";
import { hours, pct, toNum, won } from "@/lib/format";
import type { QuoteItem, Site } from "@/lib/types";

type SiteRow = Site & { analysis: { quoteSupply: number } };

export default function PredictPage() {
  const [source, setSource] = useState<"image" | "site" | "manual">("image");
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [workType, setWorkType] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [supplyAmount, setSupplyAmount] = useState(0);
  const [useAI, setUseAI] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ stats: Prediction; ai: AiPrediction | null; aiError: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((j) => setSites(j.sites ?? [])).catch(() => {});
  }, []);

  const itemSum = items.reduce((a, b) => a + b.amount, 0);

  const onExtracted = (r: ExtractResult) => {
    setWorkType(r.workType || "");
    setBuildingType(r.buildingType || "");
    setItems(r.items);
    setSupplyAmount(r.supplyAmount || r.items.reduce((a, b) => a + b.amount, 0));
  };

  const loadSite = (id: string) => {
    setSiteId(id);
    const s = sites.find((x) => x.id === id);
    if (!s) return;
    setWorkType(s.workType);
    setBuildingType(s.buildingType);
    setItems(s.quotation.items);
    setSupplyAmount(s.analysis.quoteSupply);
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workType, buildingType, items, supplyAmount: supplyAmount || itemSum, useAI, excludeSiteId: source === "site" ? siteId : undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "예측 실패");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "예측 실패");
    } finally {
      setBusy(false);
    }
  };

  const ready = items.length > 0 || supplyAmount > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">견적 예측</h1>
        <p className="text-sm text-muted">
          새 견적서를 넣으면 지금까지 기록한 현장의 실제 자재비·시공시간·마진을 바탕으로 예상 마진(자재비 제외), 예상 시공시간, 권장 견적을 계산합니다. 기록이 쌓일수록 정확해집니다.
        </p>
      </div>

      <Card
        title="1. 견적서 입력"
        action={
          <div className="flex gap-1 text-xs">
            {(["image", "site", "manual"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setSource(k)} className={`rounded-md px-2 py-1 ${source === k ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-background"}`}>
                {k === "image" ? "이미지 업로드" : k === "site" ? "저장된 현장" : "직접 입력"}
              </button>
            ))}
          </div>
        }
      >
        {source === "image" && <ImageExtract onExtracted={onExtracted} />}
        {source === "site" && (
          <Field label="현장 선택">
            <select className={inputCls} value={siteId} onChange={(e) => loadSite(e.target.value)}>
              <option value="">선택…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {won(s.analysis.quoteSupply)}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="공종"><input className={inputCls} value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="예: 욕실 설비" /></Field>
          <Field label="건물 유형"><input className={inputCls} value={buildingType} onChange={(e) => setBuildingType(e.target.value)} placeholder="아파트 / 빌라 / 상가" /></Field>
          <Field label="공급가액"><input className={`${inputCls} num text-right`} value={supplyAmount} onChange={(e) => setSupplyAmount(toNum(e.target.value))} placeholder={String(itemSum)} /></Field>
        </div>
        <div className="mt-4">
          <QuoteItemsEditor items={items} onChange={setItems} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={!ready || busy}>{busy ? "계산 중…" : "예측 계산"}</Button>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} /> AI 분석 포함 (Claude, 수십 초 소요)
          </label>
        </div>
        {error && <div className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">{error}</div>}
      </Card>

      {result && <PredictResult stats={result.stats} ai={result.ai} aiError={result.aiError} />}
    </div>
  );
}

function PredictResult({ stats, ai, aiError }: { stats: Prediction; ai: AiPrediction | null; aiError: string | null }) {
  return (
    <>
      <Card title={`2. 통계 기반 추정 (과거 현장 ${stats.sampleCount}건 참고)`}>
        {stats.sampleCount === 0 ? (
          <Empty>실행 데이터(자재·작업시간)가 기록된 현장이 아직 없습니다. 현장을 완료하고 기록을 남기면 예측이 가능해집니다.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Stat label="입력 견적 공급가액" value={won(stats.quoteSupply)} sub={`자재 항목 ${won(stats.quoteMaterial)}`} />
              <Stat label="예상 실제 자재비" value={won(stats.predictedMaterialCost)} />
              <Stat label="예상 경비" value={won(stats.predictedOtherCost)} />
              <Stat label="예상 마진(자재비 제외)" value={won(stats.predictedMargin)} tone={stats.predictedMargin >= 0 ? "positive" : "negative"} sub={pct(stats.predictedMarginRate)} />
              <Stat label="예상 시공시간" value={hours(stats.predictedHours)} sub={stats.predictedHours > 0 ? `시간당 ${won(stats.predictedMarginPerHour)}` : undefined} />
              <Stat
                label="권장 견적(공급가액)"
                value={won(stats.suggestedQuote)}
                tone="accent"
                sub={`입력 대비 ${stats.suggestedQuoteDiff >= 0 ? "+" : ""}${won(stats.suggestedQuoteDiff)}`}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              권장 견적 = 예상 자재비 + 예상 경비 + 예상 시공시간 × 과거 평균 시간당 마진({won(stats.historicalMarginPerHour)}). 유사도가 높은 현장의 비율을 더 크게 반영합니다.
            </p>
            <h3 className="mt-5 mb-2 text-sm font-semibold">참고한 유사 현장</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 text-left">현장</th>
                    <th className="py-2 text-left">공종</th>
                    <th className="py-2 text-right">유사도</th>
                    <th className="py-2 text-right">견적</th>
                    <th className="py-2 text-right">자재비</th>
                    <th className="py-2 text-right">마진</th>
                    <th className="py-2 text-right">시공시간</th>
                    <th className="py-2 text-right">시간당 마진</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.similar.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2"><Link href={`/sites/${s.id}`} className="text-accent hover:underline">{s.name}</Link></td>
                      <td className="py-2">{s.workType || "-"}</td>
                      <td className="num py-2 text-right">{(s.similarity * 100).toFixed(0)}%</td>
                      <td className="num py-2 text-right">{won(s.quoteSupply)}</td>
                      <td className="num py-2 text-right">{won(s.materialTotal)}</td>
                      <td className="num py-2 text-right">{won(s.margin)} ({pct(s.marginRate)})</td>
                      <td className="num py-2 text-right">{hours(s.totalHours)}</td>
                      <td className="num py-2 text-right">{s.totalHours > 0 ? won(s.marginPerHour) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="3. AI 분석 (Claude)">
        {aiError && <div className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">{aiError}</div>}
        {!ai ? (
          !aiError && <Empty>AI 분석을 포함하지 않았습니다.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="예상 시공시간" value={hours(ai.expectedHours)} />
              <Stat label="예상 실제 자재비" value={won(ai.expectedMaterialCost)} />
              <Stat label="예상 마진" value={won(ai.expectedMargin)} tone={ai.expectedMargin >= 0 ? "positive" : "negative"} />
              <Stat label="권장 견적" value={won(ai.suggestedQuote)} tone="accent" />
            </div>
            <p className="mt-4 rounded-md bg-background px-4 py-3 text-sm leading-relaxed">{ai.rationale}</p>
            {ai.risks.length > 0 && (
              <>
                <h3 className="mt-4 mb-1 text-sm font-semibold">실행비·시간이 늘어날 수 있는 요인</h3>
                <ul className="list-disc pl-5 text-sm leading-relaxed">
                  {ai.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}
