import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/claude";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ claudeConfigured: isConfigured() });
}
