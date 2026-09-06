import { NextResponse } from "next/server";
import { extractQuotation, type ImageMediaType } from "@/lib/claude";
import { errorResponse } from "@/lib/http";
import { saveUpload } from "@/lib/store";
import { newId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED: Record<string, ImageMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    const mediaType = ALLOWED[file.type];
    if (!mediaType) {
      return NextResponse.json({ error: `지원하지 않는 형식입니다(${file.type || "unknown"}). JPG, PNG, WEBP, GIF만 가능합니다.` }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "이미지가 20MB를 넘습니다." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const imageFile = saveUpload(file.name, buf);
    const extracted = await extractQuotation(buf, mediaType);
    const items = extracted.items.map((i) => ({
      id: newId("q"),
      name: i.name,
      spec: i.spec,
      unit: i.unit,
      qty: i.qty || 1,
      unitPrice: i.unitPrice,
      amount: i.amount || i.qty * i.unitPrice,
      category: i.category,
      note: i.note,
    }));
    return NextResponse.json({ ...extracted, items, imageFile });
  } catch (e) {
    return errorResponse(e, "견적서 추출에 실패했습니다.");
  }
}
