# 설비 현장 운영자 웹앱

배관·설비 시공업체의 운영자가 쓰는 웹앱입니다. 엑셀로 만든 견적서 이미지를 올리면 항목을 추출해 현장을 만들고, 현장별로 작업내용·사용자재·기타경비·시공시간을 기록한 뒤 견적과 실행비의 차액, 마진, 시간당 마진을 계산합니다. 기록이 쌓이면 새 견적서에 대해 예상 자재비·예상 시공시간·예상 마진·권장 견적을 계산합니다.

## 기능

| 화면 | 내용 |
|---|---|
| 대시보드 `/` | 현장 목록, 견적·실행비·마진 합계, 평균 마진율, 시간당 마진 |
| 견적서 업로드 `/sites/new` | 견적서 이미지(JPG/PNG/WEBP) → Claude 비전으로 항목 추출 → 수정 후 현장 저장. 이미지 없이 직접 입력도 가능 |
| 현장 상세 `/sites/[id]` | 탭 5개: 견적서 / 작업내용 / 사용자재·경비 / 견적 분석 / 보완·개선. 입력 후 0.7초 뒤 자동 저장 |
| 견적 예측 `/predict` | 새 견적서(이미지·저장된 현장·직접 입력) → 과거 현장 통계 기반 추정 + Claude 분석 |

### 계산 정의

- 실행비 = 실제 자재비 + 기타 경비(외주 인건비, 장비, 폐기물, 교통 등)
- 마진(자재비 제외) = 견적 공급가액 − 실행비. 부가세는 제외
- 시간당 마진 = 마진 ÷ 총 작업시간
- 항목별 차액 = 견적 항목 금액 − 그 항목에 연결된 실제 자재비 합 (사용자재 탭에서 연결)
- 예측: 과거 현장을 공종·건물 유형·견적 항목명 유사도로 가중 평균해 자재비 비율, 경비 비율, 공급가액당 시간, 시간당 마진을 구한 뒤 새 견적에 적용. 권장 견적 = 예상 자재비 + 예상 경비 + 예상 시간 × 과거 평균 시간당 마진

계산 로직은 `src/lib/analysis.ts`, `src/lib/predict.ts`에 있습니다.

## 실행

```bash
cd webapp
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
npm run seed                  # (선택) 샘플 현장 3건 추가
npm run dev                   # http://localhost:3000
```

- `ANTHROPIC_API_KEY`가 없으면 이미지 추출·보완점 생성·AI 예측 버튼은 동작하지 않고, 직접 입력과 통계 기반 예측만 동작합니다.
- 데이터는 `webapp/data/db.json`과 `webapp/data/uploads/`에 저장됩니다(git 제외). `DATA_DIR` 환경변수로 위치를 바꿀 수 있습니다.
- 운영 배포 시에는 `npm run build && npm start`. 파일 저장소를 쓰므로 디스크가 유지되는 서버(VM, Docker 볼륨 등)에서 실행해야 합니다. Vercel 같은 서버리스 환경에서는 저장소를 DB(Supabase 등)로 바꿔야 합니다.

## Claude API 사용

`src/lib/claude.ts`에서 `claude-opus-5` 모델을 구조화 출력(`output_config.format`)으로 호출합니다. 안전 분류기가 요청을 거절할 경우 서버가 자동으로 대체 모델로 재실행하도록 `fallbacks: "default"`를 켜 두었습니다.

| 호출 | 입력 | 출력 |
|---|---|---|
| `extractQuotation` | 견적서 이미지 | 현장명·주소·공종·항목(품명/규격/단위/수량/단가/금액/구분)·공급가액·부가세·합계 |
| `generateReview` | 현장 기록 전체 + 분석 수치 | 요약 + 보완점·개선사항 3~7개 |
| `predictWithAI` | 새 견적 + 통계 추정 + 유사 현장 실제 데이터 | 예상 시공시간·자재비·마진·권장 견적·근거·위험 요인 |

## 구조

```
src/app/            페이지·API 라우트
  api/extract       이미지 → 항목 추출
  api/sites         현장 CRUD (PATCH는 부분 갱신)
  api/sites/[id]/review  보완점 생성
  api/predict       견적 예측
  api/files/[name]  업로드 이미지 제공
src/lib/types.ts    데이터 모델
src/lib/store.ts    JSON 파일 저장소
src/lib/analysis.ts 견적 vs 실행비 분석
src/lib/predict.ts  과거 데이터 기반 예측
src/lib/claude.ts   Claude API 호출
scripts/seed.mjs    샘플 데이터
```
