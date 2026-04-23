# 촌맵 (ChonMap) - 프로젝트 정보

## 기본 정보
- **프로젝트명**: 촌맵 - 우리 가족 가계도
- **설명**: 한국 촌수 기반 가계도 웹앱 (8촌까지, 80+호칭)
- **버전**: 1.1.0

## 라이브 URL
- **웹앱**: https://chonmap.vercel.app
- **Play Store**: 심사 대기 중

## 기술 스택
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- SVG 직접 렌더링 (외부 라이브러리 없음)
- localStorage 데이터 저장
- nanoid (고유 ID 생성)
- Vitest (테스트)
- PWA (Service Worker + manifest.json)

## 배포 정보
### Vercel (웹)
- **계정**: nokeunsu-1200s-projects
- **프로젝트**: chonmap
- **URL**: https://chonmap.vercel.app
- **배포 명령어**: `npx vercel --prod --yes`
- **SSL 우회 필요 시**: `NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel --prod --yes`

### Google Play Store (Android)
- **패키지명**: app.vercel.chonmap.twa
- **빌드 방식**: TWA (Trusted Web Activity) via Bubblewrap
- **APK 위치**: `android/app-release-signed.apk` (리포 미포함)
- **키스토어/비밀번호/SHA256**: 로컬 별도 보관 (리포에 커밋하지 않음)
- **Digital Asset Links**: `public/.well-known/assetlinks.json`

## 수익 모델
- **하단 배너 광고**: Google AdSense (AdMob 연동 예정)
- **전면 광고**: 이미지 저장 후, JSON 내보내기 후, 30분+ 복귀 시
- **AdSense 설정 파일**: `src/components/ads/AdBanner.tsx` (AD_CLIENT, AD_SLOT)

## 빌드 & 실행
```bash
npm run dev       # 개발 서버 (localhost:5173)
npm run build     # 프로덕션 빌드 (tsc + vite build)
npm run preview   # 빌드 결과 미리보기
npm run test      # Vitest 테스트 (24개)
```

## APK 재빌드 (아이콘/앱이름 변경 시)
```bash
cd android
bubblewrap build  # CMD에서 실행 (인터랙티브)

# 또는 수동 빌드
./gradlew.bat assembleRelease
# zipalign + apksigner로 서명
```

## 폴더 구조
```
ChonMap/
├── src/                    # 소스 코드
│   ├── components/         # React 컴포넌트
│   │   ├── tree/           # 가계도 시각화
│   │   ├── forms/          # 가족 추가/수정
│   │   ├── search/         # 관계 검색
│   │   ├── settings/       # 설정
│   │   └── ads/            # 광고 (배너 + 전면)
│   ├── engine/             # 촌수 계산 엔진
│   ├── state/              # React Context 상태관리
│   ├── storage/            # localStorage CRUD
│   ├── models/             # 데이터 타입
│   └── utils/              # 이미지 압축 등
├── public/                 # 정적 파일 (아이콘, SW, manifest)
├── android/                # TWA Android 프로젝트
├── dist/                   # 빌드 산출물
└── CLAUDE.md               # AI 개발 가이드
```

## 핵심 기능
- 인물 탭 → 기준 변경 → 모든 호칭 자동 재계산
- 80+ 한국식 호칭 (부계/모계/인척, 장유 구분)
- 0-1 BFS 알고리즘 촌수 계산
- 다중 경로 탐색 (관계검색)
- 프로필 사진 (100x100 JPEG 압축)
- 고인 표시 (사망년도)
- 다크모드
- PWA 오프라인 지원
- 세대별 라벨
- 트리 내 이름 검색
- Undo/Redo (20단계)
- JSON 내보내기/가져오기, 클립보드 공유
- 이미지 저장 (PNG)
- 가족 템플릿 3종

## 새 프로젝트 참고 사항
- Vercel 배포: `npx vercel --prod --yes`
- PWA: `public/manifest.json` + `public/sw.js` + `index.html`에 SW 등록
- TWA 패키징: `npm install -g @bubblewrap/cli` → `bubblewrap init`
- Android SDK: `C:\Users\nokeu\.bubblewrap\`
- JDK: `C:\Program Files\Java\jdk-21`
- bubblewrap config: `C:\Users\nokeu\.bubblewrap\config.json`
- Google Play Console: https://play.google.com/console
