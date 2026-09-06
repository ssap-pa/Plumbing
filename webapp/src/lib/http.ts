import { NextResponse } from "next/server";
import { ClaudeNotConfiguredError } from "./claude";

export function errorResponse(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다.") {
  if (e instanceof ClaudeNotConfiguredError) {
    return NextResponse.json({ error: e.message, code: "not_configured" }, { status: 503 });
  }
  const message = e instanceof Error ? e.message : fallback;
  console.error(e);
  return NextResponse.json({ error: message }, { status: 500 });
}
