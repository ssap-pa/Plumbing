"use client";

import { useEffect, useState } from "react";
import type { ExtractedQuotation } from "@/lib/claude";
import type { QuoteItem } from "@/lib/types";
import { Button } from "./ui";

export type ExtractResult = ExtractedQuotation & { items: QuoteItem[]; imageFile: string };

// 견적서 이미지를 고른 뒤 Claude로 추출하는 공통 블록
export function ImageExtract({ onExtracted }: { onExtracted: (r: ExtractResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j) => setConfigured(Boolean(j.claudeConfigured))).catch(() => setConfigured(false));
  }, []);

  // 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "추출 실패");
      onExtracted(json as ExtractResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추출 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {configured === false && (
        <div className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
          ANTHROPIC_API_KEY가 설정되지 않아 이미지 추출을 사용할 수 없습니다. 항목을 직접 입력하거나 <code>.env.local</code>에 키를 넣어 주세요.
        </div>
      )}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-4 py-8 text-center hover:bg-background">
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="견적서 미리보기" className="max-h-96 rounded-md object-contain" />
        ) : (
          <>
            <div className="text-sm font-medium">견적서 이미지 선택</div>
            <div className="mt-1 text-xs text-muted">엑셀 견적서를 캡처한 JPG · PNG · WEBP (20MB 이하)</div>
          </>
        )}
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={!file || busy || configured === false}>{busy ? "추출 중… (수십 초 걸릴 수 있음)" : "AI로 항목 추출"}</Button>
        {file && <span className="text-xs text-muted">{file.name}</span>}
      </div>
      {error && <div className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">{error}</div>}
    </div>
  );
}
