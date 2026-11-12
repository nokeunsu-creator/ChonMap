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
- **경유 배우자 감지** (`isPassThroughSpouse`): 부부 간선이 경유일 뿐인 패턴은 인척으로 보지 않음
  - up→spouse→up: `어머니→[spouse]아버지→할아버지` (lineage·peerAncestor도 경유 보정)
  - up→spouse→down: 부모 한쪽에만 연결된 형제·삼촌·고모 (2026-09 추가 — 이전엔 형제가 '제수씨', 고모가 '숙모'로 나왔음)
  - down→spouse→down: 며느리/사위에게만 연결된 손주
  - down→spouse→up은 경유가 아님 → 사돈
- **InLawType `double`**: 첫 이동과 마지막 이동이 모두 배우자 = 배우자 쪽 혈족의 배우자. 1-1은 동서/처남댁/형님/서방님, 2-1은 처숙모·시고모부 등. 그 외 촌수는 spouse-side로 취급
- **배우자 쪽 장유는 배우자 기준** (`spouseRefId`): 처형/처제, 시숙/도련님, 동서(형님)는 화자가 아니라 배우자의 출생년도와 비교
- **3-1(종조부 항렬)은 `peerGender`로 구분**: 할아버지 형제=큰/작은할아버지, 할아버지 누이=고모할머니(남편 고모할아버지), 할머니 자매=이모할머니, 할머니 형제=진외종조부, 외가는 외종조부/외대고모
- **다른 경로 보기** (`reconstructPaths`): 부부 간선(가중치 0) 때문에 두 사람이 서로의 선행 노드가 되므로 경로 위 사람은 재방문 금지 (순환 경로 방지)
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

## 코드 스플리팅 전략
- **메인 청크 (~242KB)**: 가계도(`FamilyTreeSVG`, `PersonForm`, `EditForm`, `BirthdayBanner`, `AdBanner`, `OnboardingTutorial`, `RatingDialog`)만 즉시 로드
- **탭 lazy** (`App.tsx`): `RelationshipSearch`(8KB), `SettingsPage`(19KB), `PlayHub`(13KB) — 탭 클릭 시 로드, `<Suspense>` fallback `TabLoading`
- **게임 lazy** (`PlayHub.tsx`): 캐주얼 게임 5개(`KinshipQuiz/TwentyFour/Memory/WhackMole/Omok` 6~10KB), 전략 게임 3개(`Chess`/`Baduk`/`Janggi` 17~21KB) 별도 청크. 학습 게임 21개는 barrel로 묶여 단일 청크(`learn` 622KB) — 첫 학습 게임 클릭 시 한 번에 로드
- **`ToyHammer` 분리**: PlayHub 카드 아이콘에서 정적 사용 → `WhackMole.tsx`에서 별도 파일(`ToyHammer.tsx`)로 추출해 lazy/static import 충돌 해소

## 라우팅 구조 (멀티페이지 빌드)
- `/` → **정적 콘텐츠 랜딩 페이지** (`index.html`, AdSense 광고 호스트)
- `/app/` → **SPA 가계도 앱** (`app/index.html`, AdSense 스크립트 없음, canonical은 `/`)
- `/guide.html`, `/about.html`, `/contact.html`, `/privacy.html`, `/terms.html`, `/chon/*` → 정적 콘텐츠 페이지 (AdSense 광고)
- `vite.config.ts`의 `rollupOptions.input`에 main + app 두 진입점 등록 → `dist/index.html`과 `dist/app/index.html` 동시 생성
- AdSense 정책 준수를 위해 SPA 셸은 `noindex,follow`로 색인 회피, 모든 CTA는 `/app/`로 링크

## 폴더 구조
```
index.html                       # 랜딩 페이지 (정적, AdSense 광고)
app/index.html                   # SPA 셸 (canonical=/, noindex)
src/
├── models/types.ts              # 데이터 모델 (childOrder 포함)
├── engine/
│   ├── chonCalculator.ts        # 0-1 BFS + 경로 분석 + 경유배우자 감지 + 관계 계산
│   ├── chonCalculator.test.ts   # 촌수/호칭 테스트
│   ├── chonCalculator.regression.test.ts # 2026-09 리뷰 버그 회귀 테스트 (한쪽 부모 연결, 동서, 종조부, 순환 경로)
│   └── kinshipTitles.ts         # 한국식 호칭 룩업 (if-else 기반)
├── state/
│   └── FamilyContext.tsx         # Context + useReducer + Undo/Redo + REORDER_CHILD + SORT_CHILDREN_BY_AGE
├── storage/
│   ├── StorageService.ts        # localStorage CRUD, JSON 내보내기/가져오기, 디바운스 저장
│   ├── StorageService.test.ts   # 저장소 테스트 (검증·복구 보관·초기화 후 저장 차단)
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
npm run test      # Vitest 테스트 (105건)
```
- **의존성 설치는 `npx npm@11 install`**: Node 22 기본 npm 10.9.0은 vitest 4.1.12의 peer 집합을 풀다가 `Cannot read properties of null (reading 'edgesOut')`로 죽는다 (lockfile 삭제해도 동일). npm 11은 정상
- **브라우저 E2E** `scripts/e2e.cjs` (Playwright, 58 시나리오: 랜딩/정적 페이지, 가족 추가, 기준 변경, undo/redo, 관계 검색, 내보내기/가져오기(조작 JSON·XSS 페이로드), PDF 팝업 이스케이프, 다크모드, 이미지 저장, 놀이 탭, 영속성, 저장소 변조). playwright는 devDependency가 아니므로 `npx -y npm@11 install --no-save playwright@1.65.0 && npx playwright install chromium` 후 `npx vite preview --port 4173` 띄우고 `node scripts/e2e.cjs` (라이브는 `BASE=https://chonmap.vercel.app`). 저장소 변조 시나리오는 앱이 떠 있으면 beforeunload 저장이 덮어쓰므로 `/privacy.html`에서 localStorage를 바꾼 뒤 `/app/`으로 이동해야 한다

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
- **2026-11-12 전체 소스 검증·보안 점검**: tsc/Vitest 105건/빌드/npm audit 0건/E2E 58건 통과. 조작된 백업 JSON 거부 강화, '나'만 있을 때 + FAB 미표시 버그(2026-04-24 v1.1.1부터) 수정, ConfirmDialog role=dialog+ESC, 다크모드 스위치 aria

## 미완료
- Google Play Store 2회 거절 (2026-09 기준) → v1.2.1(versionCode 8) AAB 재제출 준비 완료. 거절 사유 원문 확인 필요
- **assetlinks.json에 Play 앱 서명 키 SHA-256 추가 필요**: 현재는 업로드 키(E2:72:…)만 등록. Play App Signing 사용 시 스토어 설치본은 Google 키로 서명되므로
  이 지문이 없으면 TWA 검증 실패 → 주소창 노출(웹뷰 스팸/최소 기능 거절 사유). Play Console → 테스트 및 출시 → 앱 무결성 → 앱 서명 키 인증서 SHA-256
- 인앱상품 등록 (chonmap_premium_unlock, ₩1,000) — 현재 앱 내 결제 코드 없음 (Digital Goods API 미구현). 구현 전에는 등록 불필요
- **AdSense 재검토 요청 필요**: `/`를 정적 랜딩으로, `/app/`을 SPA로 분리한 후 AdSense 콘솔에서 "검토 요청" 클릭 (chonmap.vercel.app 정책 위반 해소)

## Android 릴리스 빌드 (2026-09-25 변경)
- **targetSdk 36 필수**: Google Play는 2026-08-31부터 신규 앱·업데이트에 API 36 요구. `android/app/build.gradle`에서 직접 36으로 올림
- **`bubblewrap build`/`bubblewrap update` 쓰지 말 것**: bubblewrap 1.24.1 템플릿은 targetSdk 35라 프로젝트를 재생성하면 36이 35로 되돌아간다.
  `twa-manifest.json`을 고치면 `manifest-checksum.txt`(= twa-manifest.json의 SHA-1)도 갱신해야 재생성 프롬프트가 안 뜬다
- 빌드: `JAVA_HOME=C:\jdk21`, `ANDROID_HOME=C:\Users\nokeu\.bubblewrap` → `android\gradlew.bat bundleRelease assembleRelease`
- 서명: `jarsigner`(AAB) / `zipalign`+`apksigner`(APK, build-tools 35.0.0), 키는 `android/keystore.properties` (git 제외)
- 버전 올릴 때 `app/build.gradle`(versionCode/versionName)과 `twa-manifest.json`(appVersionCode/appVersionName/appVersion) 둘 다 수정
- 산출물 `android/app-release-bundle.aab`는 git 제외 (`.gitignore`)

## 주의사항
- `kinshipTitles.ts`는 if-else 기반. 새 호칭 추가 시 ascent/descent 조합 확인
- **경유 배우자 패턴**: BFS가 up→spouse→up 경로를 택할 수 있음. `analyzePath`에서 pass-through 감지 + lineage/peerAncestor 보정 필수. 이 로직 수정 시 반드시 다양한 경로 조합 테스트
- 배우자는 1인만 허용 (PersonForm에서 검증)
- 부모는 2인까지만 허용
- 루트 인물(나)은 삭제 불가 (리듀서에서 차단)
- 부모 삭제 시 고아 자녀 재귀 삭제됨 (다른 부모 없는 경우만). `collectRemovalIds()`로 범위를 계산하고 EditForm 확인창에 함께 삭제될 인원을 표시
- **자녀·형제 추가 시 부모 양쪽 연결** (PersonForm `createExtraParentEdges`): 자녀는 대상의 배우자에게도, 형제자매는 대상의 모든 부모에게 PARENT_OF 추가
- **REMOVE_PERSON은 사진을 지우지 않음**: UNDO가 그래프만 되돌리므로 사진 영구 손실 방지. 가계도에 없는 사람의 사진은 앱 시작 시 `pruneOrphanPhotos`로 정리
- **저장 보호** (StorageService): `MAX_PERSONS=2000`(PersonForm도 같은 값으로 차단), 검증 실패한 저장본은 `chonmap_family_v1_recovery`에 보관, 저장 실패 시 토스트, `clearAllData()` 후엔 `saveDisabled`로 beforeunload flush 차단
- **validateGraph 거부 규칙** (2026-11-12 강화): persons가 배열, 값이 null, 키≠person.id, null 간선, from===to, PARENT_OF 순환(`hasParentCycle`), childOrder가 객체가 아니거나 값이 문자열 배열이 아님 → 모두 false. 로드와 가져오기 양쪽에 적용되므로 **UI로 만들 수 있는 구조는 절대 거부하면 안 된다** (거부되면 사용자 데이터가 recovery 키로 밀려나 빈 가계도가 뜸). 월일 범위처럼 무해한 값은 일부러 느슨하게 둠
- **TreeLayout 방어**: childOrder 값이 배열이 아니면 무시(`Array.isArray`), `findAncestorRoot`는 memo 캐시 — 조부모가 부모로도 등록된 격자 구조에서 경로 수가 피보나치로 폭발해 앱이 멈추던 문제
- **FAB는 '나'만 있어도 표시**: 빈 상태 안내가 "+ 버튼"을 가리키는데 FAB가 `personCount > 1` 조건으로 숨겨져 템플릿 없이는 첫 가족을 못 넣던 버그(2026-04-24~11-12). 조건에 personCount를 다시 넣지 말 것
- **ConfirmDialog**: `role="dialog" aria-modal` + ESC=취소 + 안드로이드 뒤로가기=취소. E2E는 `[role=dialog] button` 마지막이 확인 버튼
- **안드로이드 뒤로가기** (`useAndroidBack`): App(탭·검색·추가/수정 폼·평가창), ConfirmDialog(취소), PlayHub, 각 게임에서 등록. 하위 단계만 바뀌는 화면은 3번째 인자 `key`로 재등록(바둑).
  조용한 되돌리기는 카운터+`history.go(-n)` 일괄 처리, 페이지 이탈 중(`beforeunload`)에는 호출 안 함 — 안 그러면 데이터 초기화의 reload가 취소됨
- localStorage 5MB 제한 (가족 200명 ≈ 50KB, 충분)
- 사진 data URL 500KB 제한 + 화이트리스트 검증 (`isSafePhotoDataUrl`: `data:image/(jpeg|png|webp);base64,...`만 허용). `loadPhotos`/`SET_PHOTO` 양쪽에서 검증
- PersonForm은 인라인 스타일 + dk 변수로 다크모드, EditForm은 Tailwind + CSS 오버라이드
- **드래그 stale closure**: endDrag는 useCallback([dispatch])만 의존. dragTargetOrder를 state가 아닌 `dragInfoRef.current.currentOrder`(ref)에서 읽어야 함
- **레이아웃 루트 순서**: `findAncestorRoot()` 로 나의 직계 최상위 조상을 찾아 sortedRoots 첫 번째로 배치. 이 순서를 바꾸면 인척 트리 y 오프셋 계산이 틀어짐
- **AdSense 라우팅 전략**: 광고 스크립트는 `/`(랜딩) + 정적 페이지(guide, about, chon/*)에만 삽입. SPA 셸(`/app/`)은 `noindex,follow`로 색인 회피하고 AdSense 스크립트도 제거됨 — SPA는 행동 화면이라 "콘텐츠 없는 화면" 정책 위반 사유였음. AD_SLOT은 AdSense 승인 후 채울 것
- **TWA start_url 변경**: `manifest.json` `start_url`이 `/app/`. versionCode 7부터 `launchUrl: '/app/'`로 재빌드 완료. versionCode 6 이하 APK는 `/` 진입 시 랜딩 페이지가 나타남
- **평점 유도 문구**: RatingDialog에 "별점 5점" 같은 특정 점수 요구 금지 (Play 평점·리뷰 정책). 중립 문구만 사용
- **CSP 정책**: `vercel.json`에서 `'unsafe-eval'` 제거 완료. `'unsafe-inline'`은 AdSense 인라인 호출(`(adsbygoogle = ...).push({})`) 때문에 유지. 후속 강화는 nonce 도입(Vercel Edge Middleware) 필요.
  `https://*.adtrafficquality.google`(AdSense 무효 트래픽 검사 sodar 비콘)은 script/img/connect/frame-src에 모두 허용 — 막히면 라이브 콘솔에 CSP 위반이 찍히고 광고 품질 검증이 안 됨 (2026-11-12 추가)
- **TwentyFour 평가기**: `new Function` 대신 Shunting-yard 기반 파서 사용 (`src/components/play/games/TwentyFour.tsx`). 정수/부동소수점, 단항 마이너스, 괄호 모두 지원. EPS=1e-6 비교로 부동소수점 오차 허용
- **Service Worker 캐시 정책**: `sameOrigin && response.type === 'basic'`인 응답만 캐시. 외부(AdSense iframe 등) 응답은 캐시하지 않음. message 핸들러는 `event.origin === self.location.origin` 검증 + 입력 sanitize (배열 max 20개, 문자열 max 50자)
