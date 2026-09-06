import { NextResponse } from "next/server";
import { isConfigured, predictWithAI } from "@/lib/claude";
import { errorResponse } from "@/lib/http";
import { predict, type PredictInput } from "@/lib/predict";
import { listSites } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

// body: PredictInput & { useAI?: boolean; excludeSiteId?: string }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PredictInput & { useAI?: boolean; excludeSiteId?: string };
    // 저장된 현장으로 예측할 때는 그 현장 자신을 표본에서 제외한다.
    const history = listSites().filter((s) => s.id !== body.excludeSiteId);
    const stats = predict(body, history);
    let ai = null;
    let aiError: string | null = null;
    if (body.useAI) {
      if (!isConfigured()) aiError = "ANTHROPIC_API_KEY가 설정되지 않아 통계 추정만 표시합니다.";
      else {
        try {
          ai = await predictWithAI(body, stats, history);
        } catch (e) {
          aiError = e instanceof Error ? e.message : "AI 예측에 실패했습니다.";
        }
      }
    }
    return NextResponse.json({ stats, ai, aiError });
  } catch (e) {
    return errorResponse(e, "예측에 실패했습니다.");
  }
}
