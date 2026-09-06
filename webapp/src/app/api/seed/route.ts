import { NextResponse } from "next/server";
import { buildSampleSites } from "../../../../scripts/seed.mjs";
import { readDb, writeDb } from "@/lib/store";
import type { Site } from "@/lib/types";

export const runtime = "nodejs";

// 샘플 현장 3건을 추가한다(같은 이름이 이미 있으면 건너뜀).
export async function POST() {
  const db = readDb();
  const existing = new Set(db.sites.map((s) => s.name));
  const add = (buildSampleSites() as Site[]).filter((s) => !existing.has(s.name));
  db.sites.push(...add);
  writeDb(db);
  return NextResponse.json({ added: add.length });
}
