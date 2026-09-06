// 현장(공사 건) 단위 데이터 모델. 모든 금액은 원(KRW) 정수, 시간은 시간(h) 단위.

export type SiteStatus = "quoted" | "in_progress" | "done";

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  quoted: "견적",
  in_progress: "진행중",
  done: "완료",
};

export type QuoteCategory = "material" | "labor" | "expense" | "other";

export const QUOTE_CATEGORY_LABEL: Record<QuoteCategory, string> = {
  material: "자재",
  labor: "노무",
  expense: "경비",
  other: "기타",
};

export interface QuoteItem {
  id: string;
  name: string; // 품명
  spec: string; // 규격
  unit: string; // 단위
  qty: number; // 수량
  unitPrice: number; // 단가
  amount: number; // 금액
  category: QuoteCategory;
  note: string; // 비고
}

export interface Quotation {
  imageFile?: string; // data/uploads 에 저장된 파일명
  extractedAt?: string;
  items: QuoteItem[];
  supplyAmount: number; // 공급가액
  vat: number; // 부가세
  totalAmount: number; // 합계
  note: string;
}

export interface WorkLog {
  id: string;
  date: string; // YYYY-MM-DD
  content: string; // 작업 내용
  workers: number; // 투입 인원
  hours: number; // 작업 시간(h)
  note: string;
}

export interface Material {
  id: string;
  name: string;
  spec: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
  supplier: string; // 구입처
  quoteItemId?: string; // 대응되는 견적 항목
  note: string;
}

export type OtherCostCategory = "outsourcing" | "equipment" | "waste" | "transport" | "etc";

export const OTHER_COST_LABEL: Record<OtherCostCategory, string> = {
  outsourcing: "외주 인건비",
  equipment: "장비",
  waste: "폐기물",
  transport: "교통·운반",
  etc: "기타",
};

export interface OtherCost {
  id: string;
  category: OtherCostCategory;
  name: string;
  amount: number;
  note: string;
}

export interface ReviewItem {
  category: "quote" | "material" | "time" | "process" | "customer" | "other";
  title: string;
  detail: string;
}

export const REVIEW_CATEGORY_LABEL: Record<ReviewItem["category"], string> = {
  quote: "견적",
  material: "자재",
  time: "시공시간",
  process: "공정",
  customer: "고객 응대",
  other: "기타",
};

export interface Review {
  generatedAt?: string;
  summary: string;
  items: ReviewItem[];
  manualNotes: string; // 운영자가 직접 적는 메모
}

export interface Site {
  id: string;
  name: string; // 현장명
  address: string;
  customer: string;
  buildingType: string; // 아파트/빌라/상가 등
  workType: string; // 공종: 욕실 설비, 누수, 하수구 등
  status: SiteStatus;
  quoteDate: string;
  createdAt: string;
  updatedAt: string;
  quotation: Quotation;
  workLogs: WorkLog[];
  materials: Material[];
  otherCosts: OtherCost[];
  review: Review;
}

export interface Database {
  sites: Site[];
}

export function emptyQuotation(): Quotation {
  return { items: [], supplyAmount: 0, vat: 0, totalAmount: 0, note: "" };
}

export function emptyReview(): Review {
  return { summary: "", items: [], manualNotes: "" };
}

export function newId(prefix = ""): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rnd}`;
}
