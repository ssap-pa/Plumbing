"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageExtract, type ExtractResult } from "@/components/ImageExtract";
import { QuoteItemsEditor } from "@/components/QuoteItemsEditor";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { today, toNum, won } from "@/lib/format";
import type { QuoteItem, Site } from "@/lib/types";

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "edit">("upload");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [info, setInfo] = useState({ name: "", address: "", customer: "", buildingType: "", workType: "", quoteDate: today() });
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [amounts, setAmounts] = useState({ supplyAmount: 0, vat: 0, totalAmount: 0 });

  const itemSum = items.reduce((a, b) => a + b.amount, 0);

  const onExtracted = (r: ExtractResult) => {
    setInfo({
      name: r.siteName || "",
      address: r.address || "",
      customer: r.customer || "",
      buildingType: r.buildingType || "",
      workType: r.workType || "",
      quoteDate: r.quoteDate || today(),
    });
    setItems(r.items);
    setAmounts({ supplyAmount: r.supplyAmount, vat: r.vat, totalAmount: r.totalAmount });
    setNote(r.note || "");
    setImageFile(r.imageFile);
    setStep("edit");
  };

  const fillFromItems = () => {
    const vat = Math.round(itemSum * 0.1);
    setAmounts({ supplyAmount: itemSum, vat, totalAmount: itemSum + vat });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Partial<Site> = {
        ...info,
        status: "quoted",
        quotation: { imageFile, extractedAt: imageFile ? new Date().toISOString() : undefined, items, ...amounts, note },
      };
      const res = await fetch("/api/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      router.push(`/sites/${json.site.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">견적서 업로드</h1>
        <p className="text-sm text-muted">견적서 이미지를 올리면 항목을 추출해 현장을 만듭니다. 추출 결과는 저장 전에 수정할 수 있습니다.</p>
      </div>

      {step === "upload" && (
        <Card title="1. 견적서 이미지" action={<Button variant="ghost" onClick={() => setStep("edit")}>이미지 없이 직접 입력 →</Button>}>
          <ImageExtract onExtracted={onExtracted} />
        </Card>
      )}

      {step === "edit" && (
        <>
          <Card title="2. 현장 정보">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="현장명 *"><input className={inputCls} value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="예: 고잔동 힐스테이트중앙 욕실" /></Field>
              <Field label="주소"><input className={inputCls} value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></Field>
              <Field label="고객"><input className={inputCls} value={info.customer} onChange={(e) => setInfo({ ...info, customer: e.target.value })} /></Field>
              <Field label="공종"><input className={inputCls} value={info.workType} onChange={(e) => setInfo({ ...info, workType: e.target.value })} placeholder="예: 욕실 설비, 누수 보수" /></Field>
              <Field label="건물 유형"><input className={inputCls} value={info.buildingType} onChange={(e) => setInfo({ ...info, buildingType: e.target.value })} placeholder="아파트 / 빌라 / 상가" /></Field>
              <Field label="견적일"><input type="date" className={inputCls} value={info.quoteDate} onChange={(e) => setInfo({ ...info, quoteDate: e.target.value })} /></Field>
            </div>
            {note && <div className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">추출 메모: {note}</div>}
          </Card>

          <Card title="3. 견적 항목">
            <QuoteItemsEditor items={items} onChange={setItems} />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="공급가액"><input className={`${inputCls} num text-right`} value={amounts.supplyAmount} onChange={(e) => setAmounts({ ...amounts, supplyAmount: toNum(e.target.value) })} /></Field>
              <Field label="부가세"><input className={`${inputCls} num text-right`} value={amounts.vat} onChange={(e) => setAmounts({ ...amounts, vat: toNum(e.target.value) })} /></Field>
              <Field label="합계"><input className={`${inputCls} num text-right`} value={amounts.totalAmount} onChange={(e) => setAmounts({ ...amounts, totalAmount: toNum(e.target.value) })} /></Field>
              <div className="flex items-end"><Button variant="secondary" onClick={fillFromItems}>항목 합({won(itemSum)})으로 채우기</Button></div>
            </div>
            {amounts.supplyAmount > 0 && Math.abs(amounts.supplyAmount - itemSum) > 1 && (
              <div className="mt-2 text-xs text-warn">항목 합계({won(itemSum)})와 공급가액({won(amounts.supplyAmount)})이 다릅니다. 추출 누락 여부를 확인하세요.</div>
            )}
          </Card>

          {error && <div className="rounded-md bg-negative-soft px-3 py-2 text-sm text-negative">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("upload")}>← 이미지 다시 선택</Button>
            <Button onClick={save} disabled={saving || !info.name.trim()}>{saving ? "저장 중…" : "현장 저장"}</Button>
          </div>
        </>
      )}
    </div>
  );
}
