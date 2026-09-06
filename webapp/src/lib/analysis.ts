import type { QuoteCategory, Site } from "./types";

export interface ItemComparison {
  quoteItemId: string;
  name: string;
  category: QuoteCategory;
  quoteAmount: number;
  actualAmount: number; // 대응된 사용 자재 금액 합
  diff: number; // 견적 - 실제 (양수면 견적이 더 큼)
}

export interface SiteAnalysis {
  quoteSupply: number; // 견적 공급가액(부가세 제외)
  quoteTotal: number; // 견적 합계(부가세 포함)
  quoteByCategory: Record<QuoteCategory, number>;
  materialTotal: number; // 실제 자재비
  otherTotal: number; // 실제 기타 경비(외주·장비·폐기물 등)
  executionCost: number; // 실행비 = 자재비 + 기타경비
  margin: number; // 자재비·경비 제외 마진 = 공급가액 - 실행비
  marginRate: number; // margin / quoteSupply (0~1)
  totalHours: number; // 총 작업 시간(h)
  totalManHours: number; // 총 공수 = 시간 × 인원
  marginPerHour: number; // 시간당 마진
  materialRatio: number; // 자재비 / 공급가액
  items: ItemComparison[];
  unmappedMaterialTotal: number; // 견적 항목에 대응되지 않은 자재비
  quoteMaterialVsActual: { quote: number; actual: number; diff: number };
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function analyzeSite(site: Site): SiteAnalysis {
  const q = site.quotation;
  const quoteSupply = q.supplyAmount || sum(q.items.map((i) => i.amount));
  const quoteTotal = q.totalAmount || Math.round(quoteSupply * 1.1);

  const quoteByCategory: Record<QuoteCategory, number> = {
    material: 0,
    labor: 0,
    expense: 0,
    other: 0,
  };
  for (const it of q.items) quoteByCategory[it.category] += it.amount;

  const materialTotal = sum(site.materials.map((m) => m.amount));
  const otherTotal = sum(site.otherCosts.map((c) => c.amount));
  const executionCost = materialTotal + otherTotal;
  const margin = quoteSupply - executionCost;
  const marginRate = quoteSupply > 0 ? margin / quoteSupply : 0;

  const totalHours = sum(site.workLogs.map((w) => w.hours));
  const totalManHours = sum(site.workLogs.map((w) => w.hours * (w.workers || 1)));
  const marginPerHour = totalHours > 0 ? margin / totalHours : 0;
  const materialRatio = quoteSupply > 0 ? materialTotal / quoteSupply : 0;

  const items: ItemComparison[] = q.items.map((it) => {
    const actual = sum(site.materials.filter((m) => m.quoteItemId === it.id).map((m) => m.amount));
    return {
      quoteItemId: it.id,
      name: it.name,
      category: it.category,
      quoteAmount: it.amount,
      actualAmount: actual,
      diff: it.amount - actual,
    };
  });
  const unmappedMaterialTotal = sum(
    site.materials.filter((m) => !m.quoteItemId || !q.items.some((i) => i.id === m.quoteItemId)).map((m) => m.amount),
  );

  return {
    quoteSupply,
    quoteTotal,
    quoteByCategory,
    materialTotal,
    otherTotal,
    executionCost,
    margin,
    marginRate,
    totalHours,
    totalManHours,
    marginPerHour,
    materialRatio,
    items,
    unmappedMaterialTotal,
    quoteMaterialVsActual: {
      quote: quoteByCategory.material,
      actual: materialTotal,
      diff: quoteByCategory.material - materialTotal,
    },
  };
}
