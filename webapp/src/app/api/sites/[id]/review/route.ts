import { NextResponse } from "next/server";
import { generateReview } from "@/lib/claude";
import { errorResponse } from "@/lib/http";
import { getSite, saveSite } from "@/lib/store";
import { analyzeSite } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const site = getSite(id);
    if (!site) return NextResponse.json({ error: "현장을 찾을 수 없습니다." }, { status: 404 });
    const analysis = analyzeSite(site);
    const gen = await generateReview(site, analysis);
    site.review = { ...site.review, generatedAt: new Date().toISOString(), summary: gen.summary, items: gen.items };
    saveSite(site);
    return NextResponse.json({ site, analysis });
  } catch (e) {
    return errorResponse(e, "보완점 생성에 실패했습니다.");
  }
}
