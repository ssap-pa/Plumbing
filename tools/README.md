# 네이버 블로그 자동 게시 도구

- `naverbot.py` : 프록시 환경에서 크롬 요청을 Node 네트워크로 중계하는 Playwright 래퍼. 로그인 쿠키는 스크립트와 같은 폴더의 `cookies.txt`에서 읽는다(저장소에 넣지 않음. `.gitignore` 참조).
- `make_spec.py [이미지폴더]` : 승인된 초안을 블록 JSON(`gojan_post.json`)으로 만든다. 이미지 폴더에는 `01.jpg`~`NN.jpg`.
- `post_builder.py spec.json [--publish]` : 스마트에디터에 제목 → 글 → 지도 → 구분선 → 사진(개별사진)+캡션 순서로 입력하고, 발행 창에서 카테고리·공개 설정·태그를 넣는다. `--publish` 없이 실행하면 발행 직전에 멈추고 스크린샷만 남긴다.

확인된 에디터 동작 (2026-09-06)
- 글쓰기 URL: `https://blog.naver.com/{blogId}/postwrite` (PC). `PostWriteForm.naver`는 재로그인 요구.
- 사진 업로드는 `blog.upphoto.naver.com`에 multipart POST. 브라우저 가로채기로는 파일 본문이 비어 전송되므로 `naverbot.py`가 로컬 파일로 본문을 재구성해 전송한다.
- 사진 2장 이상 첨부 시 "사진 첨부 방식" 팝업 → 개별사진 선택.
- 장소: 검색어 입력 → 검색 버튼 → 결과 항목에 마우스 올린 뒤 "추가" 버튼 → 확인.
- 발행 창: 카테고리 `label[for='{categoryNo}_{이름}']`, 비공개 `label[for='open_private']`, 태그 `#tag-input`, 최종 발행 `button.confirm_btn__WEaBq`.

## 발행 단계 제약 (2026-09-06 확인)
- 제목·본문·지도·구분선·사진(10장 업로드)·캡션·카테고리·비공개·태그 입력까지 자동화로 모두 성공.
- 최종 발행 요청 `RabbitWrite.naver`는 `ncpt.naver.com` 자동화 방지 토큰 검증을 요구하며, 자동화 브라우저 요청은 `{"isSuccess":false,"errorCode":"no privilege"}`로 거부됨. 임시저장(RabbitAutoSaveWrite)에는 이 검증이 없어 성공.
- 따라서 이 스크립트는 글 전체를 임시저장 상태까지 만들어 두고, 최종 "발행"은 사용자가 브라우저에서 직접 클릭한다. `--publish`는 검증을 통과하지 못하므로 사용하지 않는다.
- 이어쓰기: 네이버 블로그 글쓰기 진입 시 "작성 중이던 글이 있습니다" 안내에서 불러오면 제목·본문·사진·지도가 복원된다. 카테고리(설비)·공개설정(비공개)·태그는 발행 창에서 다시 지정 후 발행.
