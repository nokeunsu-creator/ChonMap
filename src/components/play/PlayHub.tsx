import React, { useState, lazy, Suspense } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { useAndroidBack } from '../../utils/useAndroidBack';
import { ToyHammer } from './games/ToyHammer';

// 가벼운 캐주얼 게임은 메인 청크에 유지(빠른 진입)
const KinshipQuiz = lazy(() => import('../quiz/KinshipQuiz').then(m => ({ default: m.KinshipQuiz })));
const TwentyFour = lazy(() => import('./games/TwentyFour').then(m => ({ default: m.TwentyFour })));
const MemoryGame = lazy(() => import('./games/MemoryGame').then(m => ({ default: m.MemoryGame })));
const WhackMole = lazy(() => import('./games/WhackMole').then(m => ({ default: m.WhackMole })));
const Omok = lazy(() => import('./games/Omok').then(m => ({ default: m.Omok })));

// 큰 전략 게임 — 각각 별도 청크
const Baduk = lazy(() => import('./games/Baduk').then(m => ({ default: m.Baduk })));
const Janggi = lazy(() => import('./games/Janggi').then(m => ({ default: m.Janggi })));
const Chess = lazy(() => import('./games/Chess').then(m => ({ default: m.Chess })));

// 학습 게임 21개 — barrel에서 같은 청크로 묶임 (첫 클릭 시 한 번에 로드)
const ProverbQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.ProverbQuizGame })));
const SpellingQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.SpellingQuizGame })));
const FlagQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.FlagQuizGame })));
const ContinentQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.ContinentQuizGame })));
const DinosaurQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.DinosaurQuizGame })));
const SpaceQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.SpaceQuizGame })));
const HanjaQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.HanjaQuizGame })));
const LogicQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.LogicQuizGame })));
const SafetyQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.SafetyQuizGame })));
const BadukClassroomGame = lazy(() => import('./games/learn').then(m => ({ default: m.BadukClassroomGame })));
const EnglishChampionshipGame = lazy(() => import('./games/learn').then(m => ({ default: m.EnglishChampionshipGame })));
const HistoryQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.HistoryQuizGame })));
const ScienceQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.ScienceQuizGame })));
const NonsenseQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.NonsenseQuizGame })));
const WordMatchingGame = lazy(() => import('./games/learn').then(m => ({ default: m.WordMatchingGame })));
const MathSpeedQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.MathSpeedQuizGame })));
const ShapeQuizGame = lazy(() => import('./games/learn').then(m => ({ default: m.ShapeQuizGame })));
const MathChampionshipGame = lazy(() => import('./games/learn').then(m => ({ default: m.MathChampionshipGame })));
const WordBattleGame = lazy(() => import('./games/learn').then(m => ({ default: m.WordBattleGame })));
const WordSprintGame = lazy(() => import('./games/learn').then(m => ({ default: m.WordSprintGame })));
const FindDifferenceGame = lazy(() => import('./games/learn').then(m => ({ default: m.FindDifferenceGame })));

type GameId =
  | 'hub'
  | 'kinship' | 'twentyfour' | 'memory' | 'whack'
  | 'omok' | 'baduk' | 'janggi' | 'chess'
  | 'proverb' | 'spelling' | 'flag' | 'continent'
  | 'dinosaur' | 'space' | 'hanja' | 'logic' | 'safety'
  | 'baduk-classroom' | 'english-championship' | 'history' | 'science' | 'nonsense'
  | 'word-matching' | 'math-speed' | 'shape' | 'math-champ'
  | 'word-battle' | 'word-sprint' | 'find-difference';

type Category = 'family' | 'casual' | 'strategy' | 'learn';

interface GameMeta {
  id: GameId;
  category: Category;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag?: string;
}

const CATEGORY_INFO: Record<Category, { icon: string; label: string }> = {
  family:   { icon: '🎯', label: '우리 가족' },
  casual:   { icon: '🎮', label: '미니게임' },
  strategy: { icon: '♟',  label: '전략' },
  learn:    { icon: '🧠', label: '두뇌·상식' },
};

const GAMES: GameMeta[] = [
  // 우리 가족
  { id: 'kinship', category: 'family', icon: '\u{1F3AF}', title: '호칭 퀴즈', desc: '우리 가족의 호칭 맞추기', tag: '가족' },

  // 미니게임 (캐주얼)
  { id: 'twentyfour', category: 'casual', icon: '\u{1F3B2}', title: '24점 퍼즐', desc: '숫자 4개로 24 만들기', tag: '두뇌' },
  { id: 'memory',     category: 'casual', icon: '\u{1F0CF}', title: '카드 뒤집기', desc: '짝 맞추기 메모리', tag: '기억력' },
  { id: 'whack',      category: 'casual', icon: <ToyHammer size={44} rotation={-20} />, title: '두더지 잡기', desc: '30초 반사신경', tag: '반사' },
  { id: 'find-difference', category: 'casual', icon: '\u{1F50D}', title: '틀린 그림 찾기', desc: '두 그림 비교', tag: '관찰' },

  // 전략
  { id: 'omok',   category: 'strategy', icon: '\u{26AB}', title: '오목', desc: '5개 먼저 잇기', tag: '전략' },
  { id: 'baduk',  category: 'strategy', icon: '\u{26AA}', title: '바둑', desc: '집이 많은 쪽 승리', tag: '전략' },
  { id: 'janggi', category: 'strategy', icon: '\u{265F}', title: '장기', desc: '한국 전통', tag: '전략' },
  { id: 'chess',  category: 'strategy', icon: '\u{2654}', title: '체스', desc: '체크메이트!', tag: '전략' },

  // 두뇌·상식 — 바둑 교실 (앞쪽)
  { id: 'baduk-classroom', category: 'learn', icon: '♟', title: '바둑 교실', desc: '58단계 레슨 퍼즐', tag: '바둑' },

  // 두뇌·상식 — 6단계 난이도 퀴즈
  { id: 'proverb',    category: 'learn', icon: '📜', title: '사자성어·속담', desc: '6단계 난이도',  tag: '국어' },
  { id: 'spelling',   category: 'learn', icon: '✏️', title: '맞춤법',        desc: '6단계 난이도',  tag: '국어' },
  { id: 'flag',       category: 'learn', icon: '🌍', title: '세계 국기',     desc: '국기/수도',     tag: '상식' },
  { id: 'continent',  category: 'learn', icon: '🗺️', title: '지도 찾기',     desc: '대륙·나라',     tag: '상식' },
  { id: 'dinosaur',   category: 'learn', icon: '🦖', title: '공룡 퀴즈',     desc: '공룡 종',       tag: '상식' },
  { id: 'space',      category: 'learn', icon: '🌌', title: '우주 퀴즈',     desc: '태양계·별자리', tag: '상식' },
  { id: 'hanja',      category: 'learn', icon: '漢', title: '한자',          desc: '6단계 난이도',  tag: '한자' },
  { id: 'logic',      category: 'learn', icon: '🧩', title: '논리 퍼즐',     desc: '사고력 훈련',   tag: '두뇌' },
  { id: 'safety',     category: 'learn', icon: '🛡️', title: '생활 상식',     desc: '안전/상식',     tag: '상식' },

  // 두뇌·상식 — 독립 게임
  { id: 'english-championship',category: 'learn', icon: '🇺🇸', title: '영어 챔피언',   desc: '단어·문장 종합',   tag: '영어' },
  { id: 'history',             category: 'learn', icon: '🏯', title: '한국사 퀴즈',   desc: '10주제 200문',    tag: '상식' },
  { id: 'science',             category: 'learn', icon: '🔬', title: '과학 퀴즈',     desc: '10주제 200문',    tag: '상식' },
  { id: 'nonsense',            category: 'learn', icon: '🤔', title: '넌센스 퀴즈',   desc: '125문 두뇌게임',   tag: '두뇌' },
  { id: 'word-matching',       category: 'learn', icon: '🔗', title: '영단어 매칭',   desc: '영↔한 짝맞추기',   tag: '영어' },
  { id: 'math-speed',          category: 'learn', icon: '🔢', title: '연산 스피드',   desc: '사칙연산 타임',    tag: '수학' },
  { id: 'shape',               category: 'learn', icon: '📐', title: '도형 퀴즈',     desc: '도형 알아맞히기',  tag: '수학' },
  { id: 'math-champ',          category: 'learn', icon: '🏆', title: '수학 챔피언',   desc: '종합 도전',        tag: '수학' },
  { id: 'word-battle',         category: 'learn', icon: '⚔️', title: '단어 배틀',     desc: '2인 영단어',       tag: '영어' },
  { id: 'word-sprint',         category: 'learn', icon: '💨', title: '단어 스프린트', desc: '영단어 속도',      tag: '영어' },
];

const CATEGORY_ORDER: Category[] = ['family', 'casual', 'strategy', 'learn'];

export function PlayHub() {
  const { state } = useFamily();
  const { darkMode: dark } = state;
  const [current, setCurrent] = useState<GameId>('hub');

  const goBack = () => setCurrent('hub');

  useAndroidBack(current !== 'hub', goBack);

  if (current !== 'hub') {
    let GameComponent: React.ReactNode = null;
    if (current === 'kinship')    GameComponent = <KinshipQuiz onBack={goBack} />;
    else if (current === 'twentyfour') GameComponent = <TwentyFour onBack={goBack} />;
    else if (current === 'memory')     GameComponent = <MemoryGame onBack={goBack} />;
    else if (current === 'whack')      GameComponent = <WhackMole onBack={goBack} />;
    else if (current === 'omok')       GameComponent = <Omok onBack={goBack} />;
    else if (current === 'baduk')      GameComponent = <Baduk onBack={goBack} />;
    else if (current === 'janggi')     GameComponent = <Janggi onBack={goBack} />;
    else if (current === 'chess')      GameComponent = <Chess onBack={goBack} />;
    else if (current === 'proverb')    GameComponent = <ProverbQuizGame onBack={goBack} />;
    else if (current === 'spelling')   GameComponent = <SpellingQuizGame onBack={goBack} />;
    else if (current === 'flag')       GameComponent = <FlagQuizGame onBack={goBack} />;
    else if (current === 'continent')  GameComponent = <ContinentQuizGame onBack={goBack} />;
    else if (current === 'dinosaur')   GameComponent = <DinosaurQuizGame onBack={goBack} />;
    else if (current === 'space')      GameComponent = <SpaceQuizGame onBack={goBack} />;
    else if (current === 'hanja')      GameComponent = <HanjaQuizGame onBack={goBack} />;
    else if (current === 'logic')      GameComponent = <LogicQuizGame onBack={goBack} />;
    else if (current === 'safety')     GameComponent = <SafetyQuizGame onBack={goBack} />;
    else if (current === 'baduk-classroom')      GameComponent = <BadukClassroomGame onBack={goBack} />;
    else if (current === 'english-championship') GameComponent = <EnglishChampionshipGame onBack={goBack} />;
    else if (current === 'history')              GameComponent = <HistoryQuizGame onBack={goBack} />;
    else if (current === 'science')              GameComponent = <ScienceQuizGame onBack={goBack} />;
    else if (current === 'nonsense')             GameComponent = <NonsenseQuizGame onBack={goBack} />;
    else if (current === 'word-matching')        GameComponent = <WordMatchingGame onBack={goBack} />;
    else if (current === 'math-speed')           GameComponent = <MathSpeedQuizGame onBack={goBack} />;
    else if (current === 'shape')                GameComponent = <ShapeQuizGame onBack={goBack} />;
    else if (current === 'math-champ')           GameComponent = <MathChampionshipGame onBack={goBack} />;
    else if (current === 'word-battle')          GameComponent = <WordBattleGame onBack={goBack} />;
    else if (current === 'word-sprint')          GameComponent = <WordSprintGame onBack={goBack} />;
    else if (current === 'find-difference')      GameComponent = <FindDifferenceGame onBack={goBack} />;
    return (
      <Suspense fallback={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: 200, color: dark ? '#9CA3AF' : '#A09080', fontSize: 13,
        }}>
          <span>게임을 불러오는 중...</span>
        </div>
      }>
        {GameComponent}
      </Suspense>
    );
  }

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const tagBg = dark ? '#374151' : '#FFF8DC';

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 36 }}>{'\u{1F3AE}'}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 4 }}>가족 놀이</div>
        <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
          총 {GAMES.length}개 게임
        </div>
      </div>

      {CATEGORY_ORDER.map(cat => {
        const games = GAMES.filter(g => g.category === cat);
        if (games.length === 0) return null;
        const info = CATEGORY_INFO[cat];
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 2px 8px', fontSize: 14, fontWeight: 700, color: goldColor,
            }}>
              <span style={{ fontSize: 18 }}>{info.icon}</span>
              <span>{info.label}</span>
              <span style={{ fontSize: 11, color: textSecondary, fontWeight: 400 }}>
                {games.length}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
            }}>
              {games.map(g => (
                <button
                  key={g.id}
                  onClick={() => setCurrent(g.id)}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    padding: '14px 8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.12s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={e => (e.currentTarget.style.transform = '')}
                  onMouseLeave={e => (e.currentTarget.style.transform = '')}
                >
                  <div style={{ fontSize: 30, lineHeight: 1, display: 'flex', justifyContent: 'center', minHeight: 34 }}>
                    {g.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginTop: 8 }}>{g.title}</div>
                  <div style={{ fontSize: 10, color: textSecondary, marginTop: 2, minHeight: 24, lineHeight: 1.3 }}>{g.desc}</div>
                  {g.tag && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 9, background: tagBg, color: goldColor, padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>
                        {g.tag}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface GameProps {
  onBack: () => void;
}

export function BackBar({ title, onBack, dark }: { title: string; onBack: () => void; dark: boolean }) {
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderBottom: `1px solid ${cardBorder}`,
    }}>
      <button onClick={onBack} aria-label="뒤로"
        style={{
          background: 'none', border: 'none', fontSize: 18,
          color: textSecondary, cursor: 'pointer', padding: '4px 8px',
        }}>
        {'←'}
      </button>
      <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{title}</div>
    </div>
  );
}
