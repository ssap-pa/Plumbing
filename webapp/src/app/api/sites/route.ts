import { NextResponse } from "next/server";
import { listSites, saveSite } from "@/lib/store";
import { emptyQuotation, emptyReview, newId, type Site } from "@/lib/types";
import { analyzeSite } from "@/lib/analysis";

export const runtime = "nodejs";

export async function GET() {
  const sites = listSites().map((s) => ({ ...s, analysis: analyzeSite(s) }));
  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Site>;
  const now = new Date().toISOString();
  const site: Site = {
    id: newId("s"),
    name: body.name?.trim() || "이름 없는 현장",
    address: body.address ?? "",
    customer: body.customer ?? "",
    buildingType: body.buildingType ?? "",
    workType: body.workType ?? "",
    status: body.status ?? "quoted",
    quoteDate: body.quoteDate || now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    quotation: body.quotation ?? emptyQuotation(),
    workLogs: body.workLogs ?? [],
    materials: body.materials ?? [],
    otherCosts: body.otherCosts ?? [],
    review: body.review ?? emptyReview(),
  };
  saveSite(site);
  return NextResponse.json({ site }, { status: 201 });
}
