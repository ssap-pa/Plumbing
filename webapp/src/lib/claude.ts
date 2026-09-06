import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { SiteAnalysis } from "./analysis";
import type { Prediction, PredictInput } from "./predict";
import type { Site } from "./types";
import { won, hours, pct } from "./format";

const MODEL = "claude-opus-5";
// 안전 분류기가 요청을 거절하면 서버가 자동으로 대체 모델로 재실행한다.
const BETAS = ["server-side-fallback-2026-07-01"];

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY가 설정되지 않았습니다. webapp/.env.local 에 키를 넣어 주세요.");
    this.name = "ClaudeNotConfiguredError";
  }
}

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function client(): Anthropic {
  if (!isConfigured()) throw new ClaudeNotConfiguredError();
  return new Anthropic();
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// ---------- 1. 견적서 이미지 → 구조화 데이터 ----------

const ExtractedQuoteItem = z.object({
  name: z.string().describe("품명"),
  spec: z.string().describe("규격. 없으면 빈 문자열"),
  unit: z.string().describe("단위(EA, M, 식 등). 없으면 빈 문자열"),
  qty: z.number().describe("수량. 없으면 1"),
  unitPrice: z.number().describe("단가(원). 없으면 0"),
  amount: z.number().describe("금액(원). 없으면 수량×단가"),
  category: z.enum(["material", "labor", "expense", "other"]).describe("자재=material, 인건비·노무=labor, 경비=expense, 그 외=other"),
  note: z.string().describe("비고. 없으면 빈 문자열"),
});

export const ExtractedQuotationSchema = z.object({
  siteName: z.string().describe("현장명 또는 공사명. 없으면 빈 문자열"),
  address: z.string().describe("현장 주소. 없으면 빈 문자열"),
  customer: z.string().describe("수신처/고객명. 없으면 빈 문자열"),
  quoteDate: z.string().describe("견적일 YYYY-MM-DD. 없으면 빈 문자열"),
  workType: z.string().describe("공종을 한 단어~짧은 구로 요약. 예: 욕실 설비, 누수 보수, 하수구 세척"),
  buildingType: z.string().describe("건물 유형(아파트/빌라/상가/단독주택 등). 없으면 빈 문자열"),
  items: z.array(ExtractedQuoteItem),
  supplyAmount: z.number().describe("공급가액(원). 표기가 없으면 항목 금액 합"),
  vat: z.number().describe("부가세(원). 표기가 없으면 0"),
  totalAmount: z.number().describe("합계 금액(원). 표기가 없으면 공급가액+부가세"),
  note: z.string().describe("특이사항, 판독이 불확실한 부분을 한국어로 기록"),
});

export type ExtractedQuotation = z.infer<typeof ExtractedQuotationSchema>;

export async function extractQuotation(image: Buffer, mediaType: ImageMediaType): Promise<ExtractedQuotation> {
  const c = client();
  const res = await c.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(ExtractedQuotationSchema) },
    system:
      "당신은 배관·설비 시공업체의 견적서를 판독하는 담당자다. 엑셀로 만든 견적서 이미지에서 항목을 빠짐없이 옮겨 적는다. " +
      "숫자는 천단위 쉼표를 제거한 정수 원 단위로 쓴다. 합계·소계 행은 items에 넣지 않는다. " +
      "판독이 불확실한 숫자는 그대로 적되 note에 어느 항목이 불확실한지 남긴다.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image.toString("base64") } },
          { type: "text", text: "이 견적서 이미지를 구조화된 데이터로 추출해 주세요." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("모델이 요청을 처리하지 않았습니다(refusal).");
  if (!res.parsed_output) throw new Error("견적서 추출 결과를 해석하지 못했습니다.");
  return res.parsed_output;
}

// ---------- 2. 보완점·개선사항 생성 ----------

const ReviewSchema = z.object({
  summary: z.string().describe("이번 현장의 수익성과 시공 결과를 3~4문장으로 요약"),
  items: z
    .array(
      z.object({
        category: z.enum(["quote", "material", "time", "process", "customer", "other"]),
        title: z.string().describe("보완점 제목, 20자 이내"),
        detail: z.string().describe("근거 수치와 함께 2~3문장. 다음 현장에서 무엇을 바꿀지 구체적으로"),
      }),
    )
    .describe("보완점·개선사항 3~7개"),
});

export type GeneratedReview = z.infer<typeof ReviewSchema>;

function siteContext(site: Site, a: SiteAnalysis): string {
  const lines = [
    `현장명: ${site.name}`,
    `주소: ${site.address}`,
    `건물 유형: ${site.buildingType} / 공종: ${site.workType} / 상태: ${site.status}`,
    "",
    "[견적서 항목]",
    ...site.quotation.items.map(
      (i) => `- ${i.name} ${i.spec} ${i.qty}${i.unit} × ${won(i.unitPrice)} = ${won(i.amount)} (${i.category})`,
    ),
    `공급가액 ${won(a.quoteSupply)} / 부가세 ${won(site.quotation.vat)} / 합계 ${won(a.quoteTotal)}`,
    "",
    "[작업 기록]",
    ...site.workLogs.map((w) => `- ${w.date} ${w.workers}명 ${hours(w.hours)}: ${w.content} ${w.note}`),
    `총 작업시간 ${hours(a.totalHours)} / 총 공수 ${hours(a.totalManHours)}`,
    "",
    "[사용 자재]",
    ...site.materials.map((m) => `- ${m.name} ${m.spec} ${m.qty}${m.unit} × ${won(m.unitPrice)} = ${won(m.amount)} (${m.supplier})`),
    `자재비 합계 ${won(a.materialTotal)}`,
    "",
    "[기타 경비]",
    ...site.otherCosts.map((c) => `- ${c.category} ${c.name}: ${won(c.amount)} ${c.note}`),
    `경비 합계 ${won(a.otherTotal)}`,
    "",
    "[분석]",
    `실행비(자재+경비) ${won(a.executionCost)} / 마진 ${won(a.margin)} (${pct(a.marginRate)}) / 시간당 마진 ${won(a.marginPerHour)}`,
    `견적 자재 ${won(a.quoteMaterialVsActual.quote)} vs 실제 자재 ${won(a.quoteMaterialVsActual.actual)} (차액 ${won(a.quoteMaterialVsActual.diff)})`,
    ...a.items
      .filter((i) => i.actualAmount > 0)
      .map((i) => `- 항목 "${i.name}": 견적 ${won(i.quoteAmount)} / 실제 자재 ${won(i.actualAmount)} / 차액 ${won(i.diff)}`),
    site.review.manualNotes ? `\n[운영자 메모]\n${site.review.manualNotes}` : "",
  ];
  return lines.join("\n");
}

export async function generateReview(site: Site, a: SiteAnalysis): Promise<GeneratedReview> {
  const c = client();
  const res = await c.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(ReviewSchema) },
    system:
      "당신은 1인 배관·설비 시공업체의 운영 관리자다. 현장 기록을 근거로 다음 현장에 바로 적용할 수 있는 보완점과 개선사항을 정리한다. " +
      "기록에 있는 수치만 근거로 쓰고, 기록에 없는 사실은 추정하지 않는다. 한국어로 쓴다.",
    messages: [{ role: "user", content: siteContext(site, a) }],
  });
  if (res.stop_reason === "refusal") throw new Error("모델이 요청을 처리하지 않았습니다(refusal).");
  if (!res.parsed_output) throw new Error("보완점 생성 결과를 해석하지 못했습니다.");
  return res.parsed_output;
}

// ---------- 3. 과거 데이터 기반 견적 예측 보강 ----------

const AiPredictionSchema = z.object({
  expectedHours: z.number().describe("예상 시공시간(시간)"),
  expectedMaterialCost: z.number().describe("예상 실제 자재비(원)"),
  expectedMargin: z.number().describe("예상 마진(원) = 공급가액 - 자재비 - 경비"),
  suggestedQuote: z.number().describe("권장 견적 공급가액(원)"),
  rationale: z.string().describe("어떤 과거 현장을 근거로 어떻게 산출했는지 3~5문장"),
  risks: z.array(z.string()).describe("이 견적에서 실행비나 시간이 늘어날 수 있는 요인 2~4개"),
});

export type AiPrediction = z.infer<typeof AiPredictionSchema>;

export async function predictWithAI(input: PredictInput, stats: Prediction, history: Site[]): Promise<AiPrediction> {
  const c = client();
  const similarIds = new Set(stats.similar.map((s) => s.id));
  const refs = history.filter((s) => similarIds.has(s.id));
  const refText = refs
    .map((s) => {
      const sim = stats.similar.find((x) => x.id === s.id)!;
      return [
        `## ${s.name} (공종 ${s.workType}, 유사도 ${sim.similarity.toFixed(2)})`,
        `견적 공급가액 ${won(sim.quoteSupply)} / 실제 자재비 ${won(sim.materialTotal)} / 경비 ${won(sim.otherTotal)} / 마진 ${won(sim.margin)} (${pct(sim.marginRate)}) / 시공시간 ${hours(sim.totalHours)}`,
        "견적 항목: " + s.quotation.items.map((i) => `${i.name} ${won(i.amount)}`).join(", "),
        "작업 기록: " + s.workLogs.map((w) => `${w.date} ${hours(w.hours)} ${w.content}`).join(" / "),
      ].join("\n");
    })
    .join("\n\n");

  const inputText = [
    `공종: ${input.workType} / 건물 유형: ${input.buildingType ?? ""}`,
    "견적 항목:",
    ...input.items.map((i) => `- ${i.name} ${i.spec} ${i.qty}${i.unit} × ${won(i.unitPrice)} = ${won(i.amount)} (${i.category})`),
    `공급가액 ${won(stats.quoteSupply)}`,
    "",
    "[통계 기반 추정]",
    `표본 ${stats.sampleCount}건 / 예상 자재비 ${won(stats.predictedMaterialCost)} / 예상 경비 ${won(stats.predictedOtherCost)} / 예상 마진 ${won(stats.predictedMargin)} (${pct(stats.predictedMarginRate)}) / 예상 시공시간 ${hours(stats.predictedHours)} / 과거 평균 시간당 마진 ${won(stats.historicalMarginPerHour)} / 권장 견적 ${won(stats.suggestedQuote)}`,
  ].join("\n");

  const res = await c.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(AiPredictionSchema) },
    system:
      "당신은 배관·설비 시공업체의 견적 검토 담당자다. 새 견적서와 과거 유사 현장의 실제 실행 데이터를 비교해 예상 시공시간, 예상 자재비, 예상 마진, 권장 견적을 산출한다. " +
      "과거 데이터가 적으면 그 한계를 rationale에 명시한다. 과거 데이터에 없는 단가나 시간을 지어내지 않는다. 한국어로 쓴다.",
    messages: [
      {
        role: "user",
        content: `[새 견적서]\n${inputText}\n\n[과거 유사 현장 실제 데이터]\n${refText || "(없음)"}`,
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("모델이 요청을 처리하지 않았습니다(refusal).");
  if (!res.parsed_output) throw new Error("예측 결과를 해석하지 못했습니다.");
  return res.parsed_output;
}
