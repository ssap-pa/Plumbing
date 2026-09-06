import { NextResponse } from "next/server";
import { deleteSite, getSite, saveSite } from "@/lib/store";
import type { Site } from "@/lib/types";
import { analyzeSite } from "@/lib/analysis";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const site = getSite(id);
  if (!site) return NextResponse.json({ error: "현장을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ site, analysis: analyzeSite(site) });
}

// 부분 갱신: 보낸 필드만 덮어쓴다(id, createdAt 제외).
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const site = getSite(id);
  if (!site) return NextResponse.json({ error: "현장을 찾을 수 없습니다." }, { status: 404 });
  const patch = (await req.json()) as Partial<Site>;
  const merged: Site = { ...site, ...patch, id: site.id, createdAt: site.createdAt };
  saveSite(merged);
  return NextResponse.json({ site: merged, analysis: analyzeSite(merged) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = deleteSite(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
