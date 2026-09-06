import { analyzeSite, sum } from "./analysis";
import type { QuoteItem, Site } from "./types";

export interface PredictInput {
  workType: string;
  buildingType?: string;
  items: QuoteItem[];
  supplyAmount: number;
}

export interface SimilarSite {
  id: string;
  name: string;
  workType: string;
  similarity: number; // 0~1
  quoteSupply: number;
  materialTotal: number;
  otherTotal: number;
  margin: number;
  marginRate: number;
  totalHours: number;
  marginPerHour: number;
}

export interface Prediction {
  sampleCount: number; // 통계에 사용된 과거 현장 수
  quoteSupply: number;
  quoteMaterial: number; // 입력 견적서의 자재 항목 합
  predictedMaterialCost: number;
  predictedOtherCost: number;
  predictedMargin: number; // 자재비·경비 제외 마진
  predictedMarginRate: number;
  predictedHours: number;
  predictedMarginPerHour: number;
  historicalMarginPerHour: number; // 과거 평균 시간당 마진
  suggestedQuote: number; // 과거 시간당 마진 기준 권장 공급가액
  suggestedQuoteDiff: number; // 권장 - 입력 견적
  similar: SimilarSite[];
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^0-9a-z가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function itemText(items: QuoteItem[]): string {
  return items.map((i) => `${i.name} ${i.spec}`).join(" ");
}

export function similarity(input: PredictInput, site: Site): number {
  const sameWork = input.workType && site.workType && input.workType.trim() === site.workType.trim() ? 1 : 0;
  const sameBuilding =
    input.buildingType && site.buildingType && input.buildingType.trim() === site.buildingType.trim() ? 1 : 0;
  const nameSim = jaccard(tokens(itemText(input.items)), tokens(itemText(site.quotation.items)));
  const workSim = jaccard(tokens(input.workType), tokens(site.workType));
  return 0.45 * Math.max(sameWork, workSim) + 0.1 * sameBuilding + 0.45 * nameSim;
}

function weightedAvg(pairs: Array<[number, number]>): number {
  const wsum = sum(pairs.map(([, w]) => w));
  if (wsum <= 0) return 0;
  return sum(pairs.map(([v, w]) => v * w)) / wsum;
}

export function predict(input: PredictInput, history: Site[]): Prediction {
  const quoteSupply = input.supplyAmount || sum(input.items.map((i) => i.amount));
  const quoteMaterial = sum(input.items.filter((i) => i.category === "material").map((i) => i.amount));

  // 실행 데이터가 있는 현장만 학습 표본으로 사용
  const usable = history
    .map((s) => ({ site: s, a: analyzeSite(s) }))
    .filter(({ a }) => a.quoteSupply > 0 && (a.materialTotal > 0 || a.totalHours > 0));

  type Scored = SimilarSite & { quoteMaterial: number };
  const similar: Scored[] = usable
    .map(({ site, a }) => ({
      id: site.id,
      name: site.name,
      workType: site.workType,
      similarity: similarity(input, site),
      quoteSupply: a.quoteSupply,
      materialTotal: a.materialTotal,
      otherTotal: a.otherTotal,
      margin: a.margin,
      marginRate: a.marginRate,
      totalHours: a.totalHours,
      marginPerHour: a.marginPerHour,
      quoteMaterial: a.quoteByCategory.material,
    }))
    .sort((x, y) => y.similarity - x.similarity);

  // 가중치 = 유사도 + 바닥값(전혀 다른 공종도 약하게 반영)
  const w = (s: { similarity: number }) => 0.05 + s.similarity;

  const matRatioPairs: Array<[number, number]> = similar.map((s) => [
    s.quoteMaterial > 0 ? s.materialTotal / s.quoteMaterial : s.materialTotal / s.quoteSupply,
    w(s),
  ]);
  const matOfSupplyPairs: Array<[number, number]> = similar.map((s) => [s.materialTotal / s.quoteSupply, w(s)]);
  const otherRatioPairs: Array<[number, number]> = similar.map((s) => [s.otherTotal / s.quoteSupply, w(s)]);
  const hoursPairs: Array<[number, number]> = similar
    .filter((s) => s.totalHours > 0)
    .map((s) => [s.totalHours / s.quoteSupply, w(s)]);
  const mphPairs: Array<[number, number]> = similar
    .filter((s) => s.totalHours > 0)
    .map((s) => [s.marginPerHour, w(s)]);

  const predictedMaterialCost =
    quoteMaterial > 0 ? quoteMaterial * weightedAvg(matRatioPairs) : quoteSupply * weightedAvg(matOfSupplyPairs);
  const predictedOtherCost = quoteSupply * weightedAvg(otherRatioPairs);
  const predictedHours = quoteSupply * weightedAvg(hoursPairs);
  const predictedMargin = quoteSupply - predictedMaterialCost - predictedOtherCost;
  const historicalMarginPerHour = weightedAvg(mphPairs);
  const suggestedQuote = predictedMaterialCost + predictedOtherCost + predictedHours * historicalMarginPerHour;

  return {
    sampleCount: similar.length,
    quoteSupply,
    quoteMaterial,
    predictedMaterialCost: Math.round(predictedMaterialCost),
    predictedOtherCost: Math.round(predictedOtherCost),
    predictedMargin: Math.round(predictedMargin),
    predictedMarginRate: quoteSupply > 0 ? predictedMargin / quoteSupply : 0,
    predictedHours: Number(predictedHours.toFixed(1)),
    predictedMarginPerHour: predictedHours > 0 ? Math.round(predictedMargin / predictedHours) : 0,
    historicalMarginPerHour: Math.round(historicalMarginPerHour),
    suggestedQuote: Math.round(suggestedQuote),
    suggestedQuoteDiff: Math.round(suggestedQuote - quoteSupply),
    similar: similar.slice(0, 5).map((s) => {
      const { quoteMaterial, ...rest } = s;
      void quoteMaterial;
      return rest;
    }),
  };
}
