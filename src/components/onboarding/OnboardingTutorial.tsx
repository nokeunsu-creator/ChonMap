import React, { useState } from 'react';

const STORAGE_KEY = 'chonmap_onboarding_done';

const SLIDES = [
  {
    emoji: '\u{1F333}',
    title: '촌맵에 오신 것을 환영합니다!',
    desc: '한국 촌수 기반 가계도 앱입니다.\n가족을 추가하고 관계를 한눈에 파악하세요.',
  },
  {
    emoji: '\u{1F446}',
    title: '탭 = 기준 변경',
    desc: '가족 노드를 탭하면\n그 사람 기준으로 모든 호칭이 바뀝니다.',
  },
  {
    emoji: '\u{1F590}',
    title: '길게 누르기 = 선택',
    desc: '노드를 길게 누르면 선택됩니다.\n선택 후 "수정" 버튼으로 정보를 편집하세요.',
  },
  {
    emoji: '\u{2795}',
    title: '가족 추가',
    desc: '우측 하단 + 버튼을 눌러\n아버지, 어머니, 자녀, 배우자 등을 추가하세요.',
  },
  {
    emoji: '\u{1F50D}',
    title: '관계 검색',
    desc: '관계검색 탭에서 두 사람을 선택하면\n호칭·촌수·경로를 한번에 확인할 수 있어요.',
  },
  {
    emoji: '\u{1F3AF}',
    title: '호칭 퀴즈',
    desc: '호칭퀴즈 탭에서 가족 호칭을\n4지선다로 맞춰보세요!\n얼마나 알고 있는지 확인해보세요.',
  },
];

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  return { showOnboarding: show, finishOnboarding: finish };
}

interface OnboardingProps {
  onFinish: () => void;
}

export function OnboardingTutorial({ onFinish }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const isLast = page === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) onFinish();
    else setPage(p => p + 1);
  };

  const slide = SLIDES[page];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 건너뛰기 */}
      <button onClick={onFinish} style={{
        position: 'absolute', top: 16, right: 16,
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
        fontSize: 13, cursor: 'pointer',
      }}>
        건너뛰기
      </button>

      {/* 카드 */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF8DC, #FAEBD7)',
        borderRadius: 24, padding: '40px 32px', textAlign: 'center',
        maxWidth: 320, width: '85%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{slide.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#3D2B1F', marginBottom: 12 }}>
          {slide.title}
        </div>
        <div style={{ fontSize: 14, color: '#8B7355', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 24 }}>
          {slide.desc}
        </div>

        <button onClick={handleNext} style={{
          background: 'linear-gradient(135deg, #8B6914, #C4961A)',
          color: 'white', border: 'none', borderRadius: 14,
          padding: '12px 32px', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', width: '100%',
        }}>
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>

      {/* 페이지 인디케이터 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === page ? 24 : 8, height: 8, borderRadius: 4,
            background: i === page ? '#E8C547' : 'rgba(255,255,255,0.3)',
            transition: 'width 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}
