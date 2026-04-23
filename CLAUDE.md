# ChonMap (촌맵) - 한국식 촌수 기반 가계도 앱

## 작업 규칙
- 기능 추가/구조 변경/버그 수정 후 이 파일의 관련 섹션을 최신 상태로 업데이트할 것
- 새로 추가된 파일, 변경된 아키텍처, 중요한 결정사항을 반영할 것
- **개발 완료 시 반드시 배포**: 기능 구현이 완료되면 항상 `npx vercel --prod --yes`로 즉시 배포할 것
- 배포 명령어: `npx vercel --prod --yes`

## 프로젝트 개요
한국 촌수 체계(8촌까지) 기반의 인터랙티브 가계도 웹앱. 사람을 탭하면 모든 호칭이 해당 인물 기준으로 자동 변경된다.

- **라이브 URL**: https://chonmap.vercel.app
- **배포**: Vercel (정적 호스팅) → TWA로 Android Play Store 래핑 예정

## 기술 스택
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 (일부 인라인 스타일 혼용)
- SVG 직접 렌더링 (외부 트리 라이브러리 없음)
- localStorage 데이터 저장 (서버 없음)
- nanoid (고유 ID 생성)
- Vitest (테스트)

## 핵심 아키텍처

### 데이터 모델 (`src/models/types.ts`)
- `Person`: id, name, gender(M/F), birthYear, deathYear, birthMonthDay, deathMonthDay, memo
- `Edge`: type(PARENT_OF | SPOUSE_OF), from, to
- `FamilyGraph`: persons(Record), edges[], rootPersonId, version, childOrder?(Record<string, string[]>)

### 촌수 계산 엔진 (`src/engine/`)
- **0-1 BFS 알고리즘** (`chonCalculator.ts`): 배우자 간선 가중치=0, 부모-자녀 간선 가중치=1
- **경로 분석**: ascent(상승) + descent(하강) = 촌수, lineage(부계/모계), inLawType(spouse-side/blood-side)
- **경유 배우자 감지**: BFS가 `어머니→[spouse]아버지→할아버지` 처럼 부부 간 경유(up→spouse→up)할 때 pass-through로 인식. lineage와 peerAncestor도 경유 보정 적용
- **장유 판단**: ascent>descent일 때 `peerAncestorId`(동세대 직계 조상)와 대상의 출생년도 비교 (큰아버지/작은아버지 구분)
- **호칭 룩업** (`kinshipTitles.ts`): if-else 기반으로 (ascent, descent, lineage, 성별, 화자성별, inLawType, 장유) → 한국식 호칭 반환
- 인척 구분: `spouse-side` = 배우자 쪽 가족 (장인, 처남), `blood-side` = 혈족의 배우자 (형수, 매형)
- 외손 구분: `maternalDescent` — 첫 번째 하강 인물의 성별로 판별 (node.id, NOT parent)

### 상태 관리 (`src/state/FamilyContext.tsx`)
- React Context + useReducer
- Undo/Redo (undoStack/redoStack, 각각 최대 20단계)
- `ADD_SIBLING` 액션: 부모 없는 형제 추가 시 부모+형제를 원자적으로 추가 (undo 일관성)
- `UPDATE_PERSON`: id 필드 주입 차단 (safeUpdates에서 id 제외)
- `REMOVE_PERSON`: 고아 자녀 재귀 삭제 (다른 부모 없는 자녀+하위 트리 함께 제거) + childOrder 정리
- `SET_PHOTO`: 500KB 초과 data URL 차단 (alert 표시)
- `REORDER_CHILD`: parentId + orderedIds → graph.childOrder 업데이트 (드래그 순서 저장)
- `SORT_CHILDREN_BY_AGE`: 전체 PARENT_OF 간선 대상 birthYear 오름차순 정렬 → childOrder 일괄 갱신
- 자동 저장: useEffect로 graph 변경 시 localStorage 디바운스 저장 + beforeunload 즉시 저장
- 탭: tree | search | settings

### 레이아웃 (`src/components/tree/TreeLayout.ts`)
- 커스텀 세대별 레이아웃 (부부 나란히, 자녀 중앙 정렬)
- H_GAP=105, COUPLE_GAP=75, V_GAP=150
- 루트 탐색: 부모 없는 사람 → 트리 루트; `findAncestorRoot()` 로 나의 최상위 조상을 1순위 처리
- 재귀적 subtreeWidth 계산 → 좌표 할당
- `collapsedIds?: Set<string>` — 접힌 노드의 자녀 트리 제외
- `graph.childOrder` 적용: 드래그/나이순 정렬 순서 반영
- 인척 트리 정렬: `getStartY()` 로 이미 배치된 자녀 기준 y 오프셋 계산 → `genOffset` 보정

## 폴더 구조
```
src/
├── models/types.ts              # 데이터 모델 (childOrder 포함)
├── engine/
│   ├── chonCalculator.ts        # 0-1 BFS + 경로 분석 + 경유배우자 감지 + 관계 계산
│   ├── chonCalculator.test.ts   # 촌수/호칭 테스트 (13건)
│   └── kinshipTitles.ts         # 한국식 호칭 룩업 (if-else 기반)
├── state/
│   └── FamilyContext.tsx         # Context + useReducer + Undo/Redo + REORDER_CHILD + SORT_CHILDREN_BY_AGE
├── storage/
│   ├── StorageService.ts        # localStorage CRUD, JSON 내보내기/가져오기, 디바운스 저장
│   ├── StorageService.test.ts   # 저장소 테스트 (11건)
│   └── templates.ts             # 가족 템플릿 (핵가족, 3대, 양가)
├── utils/
│   └── imageUtils.ts            # 이미지 압축 유틸
├── components/
│   ├── tree/
│   │   ├── FamilyTreeSVG.tsx    # 메인 SVG 가계도 (팬/줌/핀치줌/드래그 순서변경/접기/계통색상)
│   │   ├── TreeLayout.ts        # 세대별 레이아웃 (collapsedIds/childOrder/genOffset 지원)
│   │   ├── PersonNode.tsx       # 원형 아바타 + 이모지 + 호칭 라벨 + 계통색상 + 접기버튼
│   │   └── EdgeRenderer.tsx     # 브래킷 스타일 연결선 + 경로 하이라이트
│   ├── forms/
│   │   ├── PersonForm.tsx       # 가족 추가 (바텀시트, 다크모드, MM-DD 검증)
│   │   └── EditForm.tsx         # 정보 수정/삭제 (사진 업로드, MM-DD 검증)
│   ├── search/
│   │   └── RelationshipSearch.tsx # 관계 검색 (두 사람 → 호칭/촌수/경로)
│   ├── calendar/
│   │   └── CalendarView.tsx     # 기념일 캘린더 (월별 생일/기일, 오늘 하이라이트)
│   ├── ads/
│   │   ├── AdBanner.tsx         # 하단 광고 배너
│   │   └── InterstitialAd.tsx   # 전면 광고
│   ├── onboarding/
│   │   └── OnboardingTutorial.tsx # 첫 사용자 안내 (4슬라이드)
│   ├── quiz/
│   │   └── KinshipQuiz.tsx      # 호칭 퀴즈 (4지선다, 10문제, 점수/정답률)
│   └── settings/
│       └── SettingsPage.tsx     # 이미지 저장, PDF, 내보내기/가져오기, 다크모드, 통계, 캘린더
└── App.tsx                      # 헤더, 탭바(4탭), FAB(추가+수정), 온보딩, 촌수 통계(useMemo)
```

## 구현된 기능

### 핵심
- 인물 탭 → 기준 변경 → 모든 호칭 자동 재계산
- 가족 추가 (아버지/어머니/아들/딸/배우자/형제/자매)
- 가족 수정/삭제 (길게 누르기 또는 하단 FAB ✏️ 버튼)
- 80+ 한국식 호칭 (부계/모계/인척, 장유 구분)
- 큰아버지(백부)/작은아버지(숙부) 장유 구분 (peerAncestor 비교)
- 외손자/친손자 구분, 인척 유형 구분 (spouse-side vs blood-side)

### UI/UX
- 따뜻한 금색/갈색 테마 + 다크모드
- 원형 아바타 + 이모지 + 알약형 호칭 라벨 (한글 너비 자동 계산, 긴 호칭 폰트 축소)
- 브래킷 스타일 연결선 + 배우자 점선
- FAB 스택: ✏️ 수정(48x48) + ➕ 추가(56x56), 우하단 고정
- 기준 인물 점선 회전 애니메이션
- 선택 시 경로 하이라이트 (노란색)
- 관계 요약 그리드 (하단, useMemo 최적화)
- 범례 (혈연/배우자/기준/고인)
- 생일/기일 배지 (모듈레벨 TODAY_MD)

### 기능
- 관계 검색 탭 (두 사람 선택 → 호칭 + 촌수 + 역방향 + 경로)
- 호칭 퀴즈 탭 (🎯, 4지선다 10문제, 점수/정답률, 다시하기)
- Undo/Redo (Ctrl+Z/Y + 헤더 버튼, 각 20단계)
- 이미지로 저장 (SVG → PNG 변환 + img.onerror 핸들링)
- PDF 족보 내보내기 (새 창 인쇄 대화상자, 가족 목록 표 형식)
- 가족 템플릿 3종 (핵가족 4인, 3대 8인, 양가 12인)
- JSON 내보내기/가져오기
- 데이터 초기화 (디바운스 타이머 취소 포함)
- ESC로 모달 닫기 + 바깥 탭 닫기
- 헤더 기준인물 탭 → "나"로 복귀
- 온보딩 안내 (첫 사용자)
- 프로필 사진 업로드 (압축 + 500KB 제한)
- 생일/기일 MM-DD 형식 검증
- **나이순 자동 정렬**: "↕ 나이순" 버튼 → SORT_CHILDREN_BY_AGE 액션
- **기념일 캘린더**: 설정 탭 내 접을 수 있는 CalendarView (월별 생일/기일, 오늘 하이라이트)
- **부계/모계 색상 구분**: "🎨 계통" 토글 (부계=파랑, 모계=분홍, 인척=보라); localStorage 유지
- **브랜치 접기/펼치기**: PersonNode 하단 ▼/▶ 버튼; collapsedIds Set → computeLayout 전달
- **드래그 순서 변경**: 노드 500ms 길게 누르면 드래그 모드, 좌우 이동으로 형제 순서 변경 (REORDER_CHILD)

### 팬/줌
- 마우스 드래그 팬
- 마우스 휠 줌 (커서 위치 기준, non-passive listener)
- 모바일 핀치줌 (2점 터치)
- "전체보기" 버튼

### 접근성
- role="dialog" aria-modal 모달
- role="button" + 키보드 Enter/Space 핸들러 (PersonNode)
- aria-label (검색, undo, redo, FAB 버튼)

## 빌드 & 실행
```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 (tsc + vite build)
npm run preview   # 빌드 결과 미리보기
npm run test      # Vitest 테스트 (24건)
```

## 배포
```bash
npx vercel --prod --yes
```

## 완료된 항목
- TWA Android 패키징 완료 (`android/app-release-signed.apk`, ~1MB)
- bubblewrap build 완료 (Android SDK: `C:\Users\nokeu\.bubblewrap\`, JDK 21)
- `public/.well-known/assetlinks.json`에 실제 서명 키 SHA256 등록 완료
- Google Play Console 등록 완료 (심사 대기 중)
- Store listing 작성 완료 (`store-listing.md`)

## 미완료
- Google Play Store 심사 통과 대기 → 결과에 따라 추가 조치 필요
- 인앱상품 등록 (chonmap_premium_unlock, ₩1,000) — Play Console에서 설정 필요

## 주의사항
- `kinshipTitles.ts`는 if-else 기반. 새 호칭 추가 시 ascent/descent 조합 확인
- **경유 배우자 패턴**: BFS가 up→spouse→up 경로를 택할 수 있음. `analyzePath`에서 pass-through 감지 + lineage/peerAncestor 보정 필수. 이 로직 수정 시 반드시 다양한 경로 조합 테스트
- 배우자는 1인만 허용 (PersonForm에서 검증)
- 부모는 2인까지만 허용
- 루트 인물(나)은 삭제 불가 (리듀서에서 차단)
- 부모 삭제 시 고아 자녀 재귀 삭제됨 (다른 부모 없는 경우만)
- localStorage 5MB 제한 (가족 200명 ≈ 50KB, 충분)
- 사진 data URL 500KB 제한 (리듀서에서 차단)
- PersonForm은 인라인 스타일 + dk 변수로 다크모드, EditForm은 Tailwind + CSS 오버라이드
- **드래그 stale closure**: endDrag는 useCallback([dispatch])만 의존. dragTargetOrder를 state가 아닌 `dragInfoRef.current.currentOrder`(ref)에서 읽어야 함
- **레이아웃 루트 순서**: `findAncestorRoot()` 로 나의 직계 최상위 조상을 찾아 sortedRoots 첫 번째로 배치. 이 순서를 바꾸면 인척 트리 y 오프셋 계산이 틀어짐
- AdSense: SPA는 크롤러가 JS 미실행 → 정적 HTML 페이지(guide, about, chon/*)에만 광고 스크립트 삽입. AD_SLOT은 AdSense 승인 후 채울 것
