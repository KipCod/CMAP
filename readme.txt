================================================================================
CoachMAP — 로컬 인수인계 / AI 문서 작성용 readme.txt
================================================================================
(GitHub README.md 아님. 다른 PC·다른 로컬 AI가 이 파일을 먼저 읽고
 README.md 와 User Manual 본문을 작성할 때의 단일 소스.)

저장소 : https://github.com/KipCod/CMAP  (branch: main)
로컬 경로 예: C:\Users\john9\Coding\work\coachmap
최종 기능 기준: 2026-08-05

================================================================================
0. 다른 AI에게 — 이 파일로 무엇을 작성할 것인가
================================================================================

[작업 A] README.md (GitHub 공개용, 영문 또는 한글 팀 정책에 맞게)
  현재 README.md 는 "# CMAP" 한 줄만 있음. 아래 섹션을 참고해 정식 README 작성:
    - 프로젝트 한 줄 설명 (CoSy AP 대체 로컬 Procedure Navigation)
    - 스크린샷 자리 (placeholder OK)
    - Quick Start (pip install, npm install, npm run build, uvicorn)
    - config.json / data/ 구조 요약
    - API 엔드포인트 표
    - License / Contributing (없으면 TBD)

[작업 B] User Manual (앱 내 Sidebar → User Manual 탭)
  구현 파일: frontend/src/components/UserManualPanel.tsx
  현재: placeholder + TODO 리스트만 있음.
  아래 "11. User Manual 작성 가이드" 섹션의 목차·내용을 채워 넣을 것.
  권장 방식 (택1):
    (1) UserManualPanel.tsx 에 JSX 섹션으로 직접 작성 (가장 단순)
    (2) data/manual/manual.md 를 추가하고 markdown 렌더 (react-markdown 등)
    (3) config.json 에 "manual_path": "data/manual/manual.md" 추가 후 로드
  Manual 은 모듈 공통(global) — 모듈별 분리 없음.

[작업 C] readme.txt 유지
  코드/기능 변경 시 이 파일의 §5·§10·§11 을 함께 갱신할 것.

================================================================================
1. 프로젝트 개요
================================================================================

이름     : CoachMAP (config: app_title)
목적     : CoSy AP를 대체하는 로컬 Procedure 탐색·인수인계 도구
핵심 UX  :
  Module / Part / Machine 조합별 CSV + Tree preload
  → HW MAP / Support MAP 에서 keyword 선택
  → 하단 Procedures 패널에 해당 procedure 목록
  → Search / Cart / 외부 링크로 CoSy 등 연동

스택:
  Backend  : Python 3 + FastAPI (backend/)
  Frontend : React 18 + TypeScript + Vite (frontend/)
  배포     : frontend/dist 를 FastAPI가 정적 서빙 (node 없이 단일 프로세스)

================================================================================
2. 실행 방법
================================================================================

[최초 1회]
  cd coachmap
  pip install -r requirements.txt
  cd frontend
  npm install
  npm run build
  cd ..

[실행]
  python -m uvicorn backend.main:app --reload
  브라우저: http://127.0.0.1:8000

[프론트 수정 후]
  cd frontend && npm run build
  브라우저 강력 새로고침 (Ctrl+Shift+R)
  ※ dist 가 gitignore 이므로 clone 후 반드시 npm run build 필요

[샘플 데이터 재생성]
  python scripts/generate_sample_data.py
  → data/csv/, data/trees/ 전체 재작성 → 서버 재시작

[구형 경로 마이그레이션]
  python scripts/migrate_data_paths.py

[Windows 포트 8000 충돌]
  netstat -ano | findstr ":8000"
  Stop-Process -Id <PID> -Force

================================================================================
3. 저장소 / 디렉터리 구조
================================================================================

coachmap/
  backend/
    main.py           FastAPI 앱, 정적 dist 서빙
    loader.py         CSV/Tree load, search, warnings
    models.py         Procedure, TreeNode
    paths.py          파일 경로 규칙
    config_utils.py   modules normalize (구형 배열 호환)
  frontend/src/
    App.tsx           메인 레이아웃·상태·API 연동
    api.ts            fetch + view 요청 dedupe
    components/       UI (MAP, Search, Cart, Manual, …)
    utils/            cart, map, graph layout, search highlight
  config.json         모듈·Part·기본값
  data/
    csv/              {module}-{part}-{machine}.csv, {module}-{part}-all.csv
    trees/{module}/   hw-{part}-{machine}.txt, other-{part}-{machine}.txt
  scripts/            generate_sample_data, migrate_data_paths
  readme.txt          ← 이 파일 (로컬·AI용 상세)
  README.md           GitHub용 (AI가 §0 작업 A 로 채울 것)

================================================================================
4. 설정 (config.json)
================================================================================

  app_title        : UI 제목
  modules          : [{ "name": "AAA", "active": true }, ...]
                     active:false → sidebar 비활성(클릭 불가)
                     구형 ["AAA","BBB"] → normalize_modules() 가 active:true 처리
  parts            : Part별 machine_types (SSS: Z1~Z5, TTT: Q1~Q5)
  defaults         : 시작 module / part / machine_type
  data_paths       : csv_dir, tree_dir

================================================================================
5. UI 기능 (현재 버전 — 2026-08-05)
================================================================================

[Sidebar]
  - Modules 탭 (activate/deactivate 반영)
  - Cart (localStorage persist)
  - User Manual 탭 → main 전체를 매뉴얼 뷰로 전환
  - Light / Dark theme
  - Sidebar 접기 토글 (‹/›)
  - Presentation(Focus) 모드: sidebar+search 숨김, MAP 집중

[Top bar]
  - Part 세gment, Machine chips
  - MAP keyword filter 입력 (HW·Support 동시 dim)
  - Focus / Exit focus
  - Route breadcrumb (module · part · machine · map · path)

[HW MAP]
  - Graph View / Tree View
  - Full View: 전체 화면 + Zoom/Pan (+/−/Reset) + Screenshot PNG
  - Tree: vertical hierarchy, Expand all / Collapse all
  - Graph: 노드 클릭 → Procedures
  - mapFilter: 매칭 안 되는 노드 dim

[Support MAP]
  - Region → branch → keyword chip 계층
  - Expand all / Collapse all (전 depth)
  - mapFilter 동일
  ※ Pinned / Recent 기능은 제거됨 (2026-08-05)

[Procedures 패널]
  - MAP 선택 시 하단 표시, 드래그로 높이 조절 (localStorage)
  - name → 외부 link (새 탭)
  - hover preview popover (name, title, tags, link)
  - tag 클릭 → MAP 점프 (findProcedureOnMap)
  - "Also on: machine" 클릭 → machine 전환
  - Cart 추가

[Search dock]
  - 3패널: Current | All configs (part 범위) | no config (part-all CSV)
  - name/title/tags 검색 (tags 결과에 chip 표시 + highlight)
  - 키워드형 검색(예 AXIS_X): tag exact 또는 name/title 포함
  - Show on MAP (RoutePin) → procedure 위치로 점프
  - Cart 추가
  - 단축키: / 검색 포커스, Esc overlay/검색 blur

[Cart]
  - Copy all: plain (name [config] title) + rich HTML (name 링크)
  - title 앞 [config] 중복 strip

[Data warnings]
  - 누락 CSV/tree/part-all 시 상단 배너 (앱은 계속 동작)

================================================================================
6. 입력 데이터 형식
================================================================================

[Config CSV]  data/csv/{module}-{part}-{machine}.csv
  fallback: {module}_{part}_{machine}.csv
  컬럼: name, title, tag, link (순서·대소문자 무관, BOM OK)
  tag: ; 또는 , 구분, normalize 대문자, 빈 tag → REST
  name: 9자리 관례 (예 aaa001.hw001)

[Part-all CSV]  data/csv/{module}-{part}-all.csv
  컬럼: name, title, link (tag 없음)
  MAP 미매핑, 검색 "no config" 전용
  같은 (module,part,name) 이 config CSV에 있으면 제외

[HW Tree]  data/trees/{module}/hw-{part}-{machine}.txt
[Support Tree]  data/trees/{module}/other-{part}-{machine}.txt
  탭/스페이스 들여쓰기, keyword 대문자
  tag → HW tree 우선 매핑, 나머지 Support tree
  multi-tag → 모든 매칭 노드에 procedure 표시

================================================================================
7. API
================================================================================

  GET /api/config
  GET /api/view?module=&part=&machine=
      → { hw_tree, other_tree, warnings: string[] }
  GET /api/search?q=&module=&part=&machine=
      → { scoped, global, module_all }
  GET /api/name-machines?module=&part=
      → { [procedureName]: [machineType, ...] }

검색: backend/loader.py procedure_matches_query()
  - name / title / tags 만 매칭 (module/part/machine 경로 제외)

================================================================================
8. localStorage 키
================================================================================

  coachmap-theme              light | dark
  coachmap-cart               Cart JSON
  coachmap-procedure-height   Procedures 패널 높이(px)
  coachmap-sidebar-collapsed  sidebar 접힘
  coachmap-presentation-mode  Focus 모드

================================================================================
9. 주요 소스 파일 (수정 시 참고)
================================================================================

  backend/loader.py              데이터 load, search, warnings
  backend/config_utils.py        module active normalize
  frontend/src/App.tsx           전역 state, layout
  frontend/src/components/
    HwMapPanel, HwGraphMap, HwGraphCanvas, HwTreeMap, HwGraphFullView
    SupportZoneMap
    ProcedurePanel, ProcedurePreview
    SearchBar, CartPanel, DataWarningsBanner
    UserManualPanel              ← Manual 본문 채울 위치
    ZoomPanViewport
  frontend/src/utils/
    mapNavigation.ts             MAP 점프, filter
    cartUtils.ts                 copy plain/html
    searchHighlight.tsx
  frontend/src/styles.css

================================================================================
10. 최근 변경 이력
================================================================================

2026-08-05 (이번 push)
  - 사용성: MAP filter, tag→MAP, search highlight, Show on MAP, preview
  - Full View zoom/pan, sidebar collapse, presentation mode
  - Module active/inactive (config.json)
  - Data missing warnings API + 배너
  - Search: tag 표시, AXIS_X 등 tag exact 매칭 개선
  - /api/view 무한 호출 수정 (stable EMPTY_TREE, contextKey expand)
  - Cart copy: plain + HTML, config prefix strip
  - part-all CSV: {module}-{part}-all.csv
  - 제거: Recent paths, Support Pinned
  - Full View Reset 버튼 레이아웃 수정

2026-08 (이전)
  - 모듈별 tree 경로, HW Full View + screenshot
  - Graph/Tree view, Expand all, Procedures resize
  - Also on machine, tree tab/space indent

================================================================================
11. User Manual 작성 가이드 (AI 작업 B — UserManualPanel 채울 목차)
================================================================================

아래 목차를 User Manual 본문으로 확장. 톤: 실무 인수인계, 단계별.

  1. Overview
     - CoachMAP이 무엇인지, CoSy AP와 관계 (link는 procedure.link 로 외부 이동)
     - Module / Part / Machine 의미

  2. Getting Started
     - 실행 방법 (§2 와 동일)
     - 첫 화면: AAA / SSS / Z1 기본값

  3. Navigating the MAP
     3.1 HW MAP (Graph vs Tree vs Full View)
     3.2 Support MAP (region, expand/collapse)
     3.3 Keyword filter (top bar)
     3.4 Breadcrumb / selection

  4. Procedures Panel
     - 선택·링크·preview·tags·Also on·Cart

  5. Search
     - Current / All configs / no config 차이
     - Show on MAP, highlight, / 단축키

  6. Cart
     - 추가·제거·Copy all (plain vs rich)

  7. Layout & Display
     - Theme, sidebar collapse, Focus mode

  8. Data & Configuration
     - config.json, CSV/tree 형식, part-all
     - missing data warnings 의미
     - sample data / migrate scripts

  9. Troubleshooting
     - npm run build 잊었을 때
     - /api/view 반복 시: 탭 닫기, 강력 새로고침
     - 포트 충돌

  10. FAQ (optional)

================================================================================
12. README.md 작성 가이드 (AI 작업 A — GitHub)
================================================================================

필수 포함:
  - Title: CoachMAP (or CMAP)
  - Badges: optional (Python, React)
  - Description: 2~3 sentences
  - Features bullet (§5 요약)
  - Installation (§2)
  - Project structure (§3 축약)
  - Configuration pointer → config.json
  - Development: backend reload, frontend build
  - Link: 상세 로컬 문서는 repo 의 readme.txt (internal handoff)

한국어 README 원하면 팀 정책에 맞게 번역.

================================================================================
13. 알려진 제약
================================================================================

  - frontend 변경 후 npm run build 필수
  - backend startup 시 전 데이터 preload → CSV/tree 변경 후 재시작
  - dist, node_modules 는 gitignore → clone 후 build 필요
  - User Manual 본문 미구현 (placeholder)
  - DESIGN.md 없음 — styles.css 가 Linear-inspired dark/light

================================================================================
END
================================================================================
