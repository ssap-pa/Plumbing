// 샘플 현장 3건을 data/db.json 에 넣는다. 기존 데이터가 있으면 덮어쓰지 않고 뒤에 추가한다.
// 사용: npm run seed
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let n = 0;
const id = (p) => `${p}seed${(++n).toString(36).padStart(3, "0")}`;
const now = new Date().toISOString();
const qi = (name, spec, unit, qty, unitPrice, category, note = "") => ({ id: id("q"), name, spec, unit, qty, unitPrice, amount: qty * unitPrice, category, note });
const mat = (name, spec, unit, qty, unitPrice, supplier, quoteItemId, note = "") => ({ id: id("m"), name, spec, unit, qty, unitPrice, amount: qty * unitPrice, supplier, quoteItemId, note });
const log = (date, workers, hours, content, note = "") => ({ id: id("w"), date, workers, hours, content, note });
const cost = (category, name, amount, note = "") => ({ id: id("c"), category, name, amount, note });

function site(base, items, materialsFn, workLogs, otherCosts, review) {
  const supply = items.reduce((a, b) => a + b.amount, 0);
  return {
    ...base,
    createdAt: now,
    updatedAt: now,
    quotation: { items, supplyAmount: supply, vat: Math.round(supply * 0.1), totalAmount: Math.round(supply * 1.1), note: "샘플 데이터" },
    materials: materialsFn(items),
    workLogs,
    otherCosts,
    review: review ?? { summary: "", items: [], manualNotes: "" },
  };
}

const s1Items = [
  qi("매립수전 재설비", "2개소 7cm 하향", "식", 1, 250000, "labor"),
  qi("PB 파이프", "16mm", "M", 6, 3500, "material"),
  qi("스테인리스 주름관", "15A 300mm", "EA", 4, 6000, "material"),
  qi("엘보·부속", "PB 16mm", "EA", 8, 2500, "material"),
  qi("우레탄 폼·합판 보강목", "", "식", 1, 25000, "material"),
  qi("출장비", "", "식", 1, 30000, "expense"),
];
const s1 = site(
  { id: id("s"), name: "[샘플] 고잔동 힐스테이트중앙 욕실 매립수전 하향", address: "안산시 단원구 고잔동", customer: "인테리어 업체 A", buildingType: "아파트", workType: "욕실 설비", status: "done", quoteDate: "2026-08-28" },
  s1Items,
  (it) => [
    mat("PB 파이프", "16mm", "M", 6, 2800, "안산 설비자재", it[1].id),
    mat("스테인리스 주름관", "15A 300mm", "EA", 4, 5200, "안산 설비자재", it[2].id),
    mat("PB 엘보", "16mm", "EA", 10, 1800, "안산 설비자재", it[3].id),
    mat("우레탄 폼", "750ml", "EA", 2, 6500, "철물점", it[4].id),
    mat("합판 보강목", "12T", "장", 1, 9000, "철물점", it[4].id),
  ],
  [log("2026-09-01", 1, 4.5, "기존 매립수전 2개소 노출, 레이저 레벨 기준선 세팅, 7cm 하향 재설비 및 배관 재연결", "타일 전 단계")],
  [cost("transport", "유류비·주차", 12000)],
  {
    summary: "샘플 요약: 견적 공급가액 대비 자재비 비중이 낮고 4.5시간에 마무리되어 시간당 마진이 높은 현장이었습니다.",
    items: [{ category: "quote", title: "부속 수량 여유 반영", detail: "엘보 부속이 견적 8개보다 2개 더 들어갔습니다. 매립수전 이설 견적에는 부속 수량을 20% 여유 있게 잡는 편이 안전합니다." }],
    manualNotes: "",
  },
);

const s2Items = [
  qi("싱크대 하수관 고압세척", "", "식", 1, 150000, "labor"),
  qi("내시경 점검", "", "식", 1, 30000, "labor"),
  qi("50A PVC 이음관 교체", "", "EA", 2, 15000, "material"),
  qi("출장비", "", "식", 1, 20000, "expense"),
];
const s2 = site(
  { id: id("s"), name: "[샘플] 사동 상가 싱크대 하수관 막힘", address: "안산시 상록구 사동", customer: "이자카야 B", buildingType: "상가", workType: "하수구 막힘", status: "done", quoteDate: "2026-08-20" },
  s2Items,
  (it) => [mat("PVC 이음관", "50A", "EA", 2, 9000, "안산 설비자재", it[2].id), mat("PVC 본드", "", "EA", 1, 4000, "철물점")],
  [log("2026-08-21", 1, 2.5, "내시경으로 기름 축적 구간 확인 후 고압세척, 이음관 2개소 교체, 통수 확인")],
  [cost("equipment", "고압세척기 소모품", 8000)],
);

const s3Items = [
  qi("세면대·양변기 교체 설비", "", "식", 1, 180000, "labor"),
  qi("양변기", "대림 CC-231", "EA", 1, 190000, "material"),
  qi("세면대", "반다리형", "EA", 1, 120000, "material"),
  qi("앵글밸브·연결관", "", "식", 1, 25000, "material"),
  qi("실리콘·부자재", "", "식", 1, 15000, "material"),
  qi("폐기물 처리", "기존 도기", "식", 1, 30000, "expense"),
];
const s3 = site(
  { id: id("s"), name: "[샘플] 본오동 빌라 세면대·양변기 교체", address: "안산시 상록구 본오동", customer: "집주인 C", buildingType: "빌라", workType: "욕실 설비", status: "done", quoteDate: "2026-08-10" },
  s3Items,
  (it) => [
    mat("양변기", "대림 CC-231", "EA", 1, 165000, "온라인 도매", it[1].id),
    mat("세면대", "반다리형", "EA", 1, 98000, "온라인 도매", it[2].id),
    mat("앵글밸브", "", "EA", 3, 4500, "안산 설비자재", it[3].id),
    mat("연결관", "", "EA", 2, 3500, "안산 설비자재", it[3].id),
    mat("실리콘", "", "EA", 2, 4000, "철물점", it[4].id),
  ],
  [log("2026-08-12", 1, 5, "기존 도기 철거, 배수 위치 확인, 양변기·세면대 설치, 누수 점검", "철거 도기 반출 포함")],
  [cost("waste", "도기 폐기물 처리", 25000), cost("transport", "유류비", 10000)],
);

/** 샘플 현장 3건. 호출할 때마다 새 id를 만든다. */
export function buildSampleSites() {
  return [s1, s2, s3].map((s) => ({ ...s, id: id("s"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const DB = path.join(DATA_DIR, "db.json");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : { sites: [] };
  const existing = new Set(db.sites.map((s) => s.name));
  const add = buildSampleSites().filter((s) => !existing.has(s.name));
  db.sites.push(...add);
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
  console.log(`샘플 현장 ${add.length}건 추가 → ${DB}`);
}
