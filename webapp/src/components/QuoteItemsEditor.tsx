"use client";

import { QUOTE_CATEGORY_LABEL, newId, type QuoteCategory, type QuoteItem } from "@/lib/types";
import { toNum, won } from "@/lib/format";
import { Button, Empty } from "./ui";

export function QuoteItemsEditor({ items, onChange }: { items: QuoteItem[]; onChange: (items: QuoteItem[]) => void }) {
  const update = (id: string, patch: Partial<QuoteItem>) =>
    onChange(
      items.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        if ("qty" in patch || "unitPrice" in patch) next.amount = Math.round(next.qty * next.unitPrice);
        return next;
      }),
    );
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const add = () =>
    onChange([...items, { id: newId("q"), name: "", spec: "", unit: "EA", qty: 1, unitPrice: 0, amount: 0, category: "material", note: "" }]);
  const total = items.reduce((a, b) => a + b.amount, 0);

  return (
    <div>
      {items.length === 0 ? (
        <Empty>견적 항목이 없습니다. 아래 버튼으로 추가하세요.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                <th className="px-1 py-2 text-left">품명</th>
                <th className="px-1 py-2 text-left">규격</th>
                <th className="w-16 px-1 py-2 text-left">단위</th>
                <th className="w-20 px-1 py-2 text-right">수량</th>
                <th className="w-28 px-1 py-2 text-right">단가</th>
                <th className="w-28 px-1 py-2 text-right">금액</th>
                <th className="w-24 px-1 py-2 text-left">구분</th>
                <th className="px-1 py-2 text-left">비고</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border/60">
                  <td><input className="cell-input" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} /></td>
                  <td><input className="cell-input" value={it.spec} onChange={(e) => update(it.id, { spec: e.target.value })} /></td>
                  <td><input className="cell-input" value={it.unit} onChange={(e) => update(it.id, { unit: e.target.value })} /></td>
                  <td><input className="cell-input num text-right" value={it.qty} onChange={(e) => update(it.id, { qty: toNum(e.target.value) })} /></td>
                  <td><input className="cell-input num text-right" value={it.unitPrice} onChange={(e) => update(it.id, { unitPrice: toNum(e.target.value) })} /></td>
                  <td><input className="cell-input num text-right" value={it.amount} onChange={(e) => update(it.id, { amount: toNum(e.target.value) })} /></td>
                  <td>
                    <select className="cell-input" value={it.category} onChange={(e) => update(it.id, { category: e.target.value as QuoteCategory })}>
                      {(Object.keys(QUOTE_CATEGORY_LABEL) as QuoteCategory[]).map((c) => (
                        <option key={c} value={c}>{QUOTE_CATEGORY_LABEL[c]}</option>
                      ))}
                    </select>
                  </td>
                  <td><input className="cell-input" value={it.note} onChange={(e) => update(it.id, { note: e.target.value })} /></td>
                  <td className="text-center"><button type="button" onClick={() => remove(it.id)} className="text-muted hover:text-negative" aria-label="삭제">✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-2 py-2 text-right text-xs text-muted">항목 합계</td>
                <td className="num px-2 py-2 text-right font-semibold">{won(total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-3"><Button variant="secondary" onClick={add}>+ 항목 추가</Button></div>
    </div>
  );
}
