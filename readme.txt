================================================================================
CoachMAP — 로컬 인수인계용 readme.txt
================================================================================
(GitHub README.md 아님. 다른 PC로 폴더 통째로 복사 후 이 파일을 먼저 읽을 것.)

프로젝트 경로 예: C:\Users\john9\Coding\work\coachmap

================================================================================
1. 프로젝트 개요
================================================================================

CoSy AP를 대체하는 로컬 Procedure 탐색 도구.
Module / Part / Machine 조합별 CSV + Tree 데이터를 preload하고,
HW MAP / Support MAP에서 keyword를 선택하면 해당 Procedure 목록을 표시한다.

스택:
  - Backend : Python 3 + FastAPI (backend/)
  - Frontend: React + TypeScript + Vite (frontend/)
  - 배포    : frontend/dist 를 FastAPI가 정적 서빙

================================================================================
2. 실행 방법
================================================================================

[최초 1회]
  pip install -r requirements.txt
  cd frontend
  npm install
  npm run build
  cd ..

[실행]
  python -m uvicorn backend.main:app --reload
  브라우저: http://127.0.0.1:8000

[프론트 수정 후 반영]
  cd frontend
  npm run build
  (서버 reload 또는 브라우저 새로고침)

[샘플 데이터 재생성]
  python scripts/generate_sample_data.py
  → data/csv/, data/trees/ 전체 재작성
  → 서버 재시작 필요 (startup 시 preload)

[포트 8000 충돌 시 (Windows)]
  netstat -ano | findstr ":8000"
  Stop-Process -Id <PID> -Force

================================================================================
3. 설정 (config.json)
================================================================================

  modules          : 모듈 목록 (AAA, BBB, …)
  parts            : Part별 machine_types (SSS→Z1~Z5, TTT→Q1~Q5)
  defaults         : 시작 시 선택값
  data_paths       : csv_dir, tree_dir

다른 PC로 옮길 때 config.json 과 data/ 만 맞추면 동작한다.

================================================================================
4. 입력 데이터 형식
================================================================================

[Config CSV]  data/csv/{module}_{part}_{machine}.csv
  컬럼 (순서·대소문자 무관): name, title, tag, link
  tag     : 세미콜론(;) 구분, 대소문자 무시 exact match
  빈 tag  : REST 로 처리
  name    : 9자리 고정 (마침표 제외). 예: aaa001.hw001 → aaa001hw001 = 9자

[Module-wide CSV]  data/csv/procedures_{module}_all.csv
  컬럼: name, title, link  (tag 없음)
  모든 machine type 통합 input. MAP 매핑 없음, 검색 전용.
  일반 config CSV에 같은 (module, name) 이 없을 때만
  검색 결과 "no config" 패널에 표시.

[HW Tree]  data/trees/tree_hw_{part}_{machine}.txt
  탭 들여쓰기 계층. keyword = 대문자.

[Support Tree]  data/trees/tree_other_{part}_{machine}.txt
  동일 형식.

[매핑 규칙]
  - tag → HW tree 우선, 나머지 → Other tree
  - multi-tag → 모든 매칭 노드에 표시
  - unmapped procedure 없음 (REST 사용)

================================================================================
5. UI 구조 (현재)
================================================================================

Sidebar : Modules | Cart | Light/Dark
Main    :
  - Part / Machine 선택 + Route breadcrumb
  - HW MAP | Support MAP  (접기 시 가로만 확장, 높이 고정)
  - Procedures 패널 (하단, 드래그로 높이 조절, localStorage 저장)
  - Search dock (Current | All configs | no config)

HW MAP:
  - Graph View / Tree View 전환
  - Tree View: vertical bar 위계, Expand all / Collapse all

Support MAP:
  - chip-grid 계층, 처음엔 전부 접힘, Expand all / Collapse all

Cart:
  - localStorage persist, Copy all (tab: name, title, config, link)

================================================================================
6. API
================================================================================

  GET /api/config
  GET /api/view?module=&part=&machine=
  GET /api/search?q=&module=&part=&machine=
      → { scoped, global, module_all }

================================================================================
7. 수정해야 하는 파일 (작업별)
================================================================================

--- 모듈/Part/Machine 이름·기본값 변경 ---
  config.json

--- Config CSV / Tree 데이터 교체 ---
  data/csv/
  data/trees/
  (대량 생성) scripts/generate_sample_data.py

--- CSV 로딩·매핑·검색 로직 ---
  backend/loader.py       ← CSV/Tree load, assign_procedures, search
  backend/models.py       ← Procedure, TreeNode dataclass
  backend/main.py         ← API routes

--- 프론트 메인 레이아웃·상태 ---
  frontend/src/App.tsx

--- HW MAP (Graph + Tree) ---
  frontend/src/components/HwMapPanel.tsx
  frontend/src/components/HwGraphMap.tsx
  frontend/src/components/HwTreeMap.tsx
  frontend/src/utils/graphLayout.ts

--- Support MAP ---
  frontend/src/components/SupportZoneMap.tsx

--- User Manual (sidebar tab → main 우측 전환, 전 모듈 통합) ---
  frontend/src/components/UserManualPanel.tsx   ← main 영역 full view, TODO
  frontend/src/App.tsx                        ← manualOpen 시 main 전환
  frontend/src/styles.css                     ← .user-manual-view, .manual-tab
  (예정) config.json manual path, data/manual/ content (module별 분리 없음)

--- Procedures 패널 ---
  frontend/src/components/ProcedurePanel.tsx

--- 검색 UI ---
  frontend/src/components/SearchBar.tsx

--- Cart ---
  frontend/src/components/CartPanel.tsx
  frontend/src/utils/cartUtils.ts

--- 공통 유틸·타입 ---
  frontend/src/types.ts
  frontend/src/utils/mapUtils.ts
  frontend/src/api.ts

--- 스타일 전체 ---
  frontend/src/styles.css

--- 아이콘·favicon ---
  frontend/src/components/NavIcons.tsx
  frontend/public/favicon.svg

--- Breadcrumb ---
  frontend/src/components/NavBreadcrumb.tsx

================================================================================
8. localStorage 키
================================================================================

  coachmap-theme           : light | dark
  coachmap-cart            : Cart JSON
  coachmap-procedure-height: Procedures 패널 높이(px)

================================================================================
9. 알려진 제약 / 참고
================================================================================

  - frontend 수정 후 npm run build 필수 (dist 갱신)
  - backend는 startup 시 전 데이터 preload → CSV 변경 후 서버 재시작
  - GitHub README.md 는 최소 정보만 있음. 상세는 이 readme.txt 참고
  - DESIGN.md 가 있으면 UI 톤 참고용 (Linear-inspired)

================================================================================
10. 최근 구현 이력 (2026-08 기준)
================================================================================

  - Procedures 패널: MAP 아래 배치, 드래그 리사이즈
  - Zone → MAP 용어 변경
  - HW MAP Graph/Tree View
  - Support/HW Expand all → 전체 depth 토글
  - procedures_{module}_all.csv + 검색 "no config" 패널
  - 검색 결과: name 링크 + [config] title 한 줄, name 9자 고정 폭

================================================================================
END
================================================================================
