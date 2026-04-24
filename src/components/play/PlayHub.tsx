import React, { useState } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { useAndroidBack } from '../../utils/useAndroidBack';
import { KinshipQuiz } from '../quiz/KinshipQuiz';
import { TwentyFour } from './games/TwentyFour';
import { MemoryGame } from './games/MemoryGame';
import { WhackMole, ToyHammer } from './games/WhackMole';
import { Omok } from './games/Omok';
import { Baduk } from './games/Baduk';
import { Janggi } from './games/Janggi';
import { Chess } from './games/Chess';
import {
  ProverbQuizGame, SpellingQuizGame, FlagQuizGame,
  ContinentQuizGame, DinosaurQuizGame, SpaceQuizGame, HanjaQuizGame,
  LogicQuizGame, SafetyQuizGame,
  BadukClassroomGame, EnglishChampionshipGame, HistoryQuizGame, ScienceQuizGame,
  NonsenseQuizGame, WordMatchingGame, MathSpeedQuizGame, ShapeQuizGame,
  MathChampionshipGame, WordBattleGame, WordSprintGame,
} from './games/learn';

type GameId =
  | 'hub'
  | 'kinship' | 'twentyfour' | 'memory' | 'whack'
  | 'omok' | 'baduk' | 'janggi' | 'chess'
  | 'proverb' | 'spelling' | 'flag' | 'continent'
  | 'dinosaur' | 'space' | 'hanja' | 'logic' | 'safety'
  | 'baduk-classroom' | 'english-championship' | 'history' | 'science' | 'nonsense'
  | 'word-matching' | 'math-speed' | 'shape' | 'math-champ'
  | 'word-battle' | 'word-sprint';

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
  learn:    { icon: '📚', label: '학습' },
};

const GAMES: GameMeta[] = [
  // 우리 가족
  { id: 'kinship', category: 'family', icon: '\u{1F3AF}', title: '호칭 퀴즈', desc: '우리 가족의 호칭 맞추기', tag: '가족' },

  // 미니게임 (캐주얼)
  { id: 'twentyfour', category: 'casual', icon: '\u{1F3B2}', title: '24점 퍼즐', desc: '숫자 4개로 24 만들기', tag: '두뇌' },
  { id: 'memory',     category: 'casual', icon: '\u{1F0CF}', title: '카드 뒤집기', desc: '짝 맞추기 메모리', tag: '기억력' },
  { id: 'whack',      category: 'casual', icon: <ToyHammer size={44} rotation={-20} />, title: '두더지 잡기', desc: '30초 반사신경', tag: '반사' },

  // 전략
  { id: 'omok',   category: 'strategy', icon: '\u{26AB}', title: '오목', desc: '5개 먼저 잇기', tag: '전략' },
  { id: 'baduk',  category: 'strategy', icon: '\u{26AA}', title: '바둑', desc: '집이 많은 쪽 승리', tag: '전략' },
  { id: 'janggi', category: 'strategy', icon: '\u{265F}', title: '장기', desc: '한국 전통', tag: '전략' },
  { id: 'chess',  category: 'strategy', icon: '\u{2654}', title: '체스', desc: '체크메이트!', tag: '전략' },

  // 학습 — 바둑 교실 (앞쪽)
  { id: 'baduk-classroom', category: 'learn', icon: '♟', title: '바둑 교실', desc: '58개 레슨 퍼즐', tag: '바둑' },

  // 학습 — GradeQuiz 기반
  { id: 'proverb',    category: 'learn', icon: '📜', title: '사자성어/속담', desc: '사자성어/속담', tag: '국어' },
  { id: 'spelling',   category: 'learn', icon: '✏️', title: '맞춤법',       desc: '올바른 표기', tag: '국어' },
  { id: 'flag',       category: 'learn', icon: '🌍', title: '세계 국기',    desc: '국기/수도', tag: '사회' },
  { id: 'continent',  category: 'learn', icon: '🗺️', title: '지도 찾기',    desc: '대륙/나라', tag: '사회' },
  { id: 'dinosaur',   category: 'learn', icon: '🦖', title: '공룡 퀴즈',    desc: '공룡 종', tag: '과학' },
  { id: 'space',      category: 'learn', icon: '🌌', title: '우주 퀴즈',    desc: '태양계/별자리', tag: '과학' },
  { id: 'hanja',      category: 'learn', icon: '漢', title: '한자',         desc: '한자 읽기', tag: '한자' },
  { id: 'logic',      category: 'learn', icon: '🧩', title: '코딩/논리',    desc: '논리 사고', tag: '논리' },
  { id: 'safety',     category: 'learn', icon: '🛡️', title: '안전/생활',    desc: '생활 상식', tag: '상식' },

  // 학습 — 독립 게임
  { id: 'english-championship',category: 'learn', icon: '🇺🇸', title: '영어 챔피언',   desc: '단어/문장 종합',   tag: '영어' },
  { id: 'history',             category: 'learn', icon: '🏯', title: '한국사 퀴즈',   desc: '10주제 200문',    tag: '사회' },
  { id: 'science',             category: 'learn', icon: '🔬', title: '과학 퀴즈',     desc: '10주제 200문',    tag: '과학' },
  { id: 'nonsense',            category: 'learn', icon: '🤔', title: '넌센스 퀴즈',   desc: '125문 넌센스',    tag: '두뇌' },
  { id: 'word-matching',       category: 'learn', icon: '🔗', title: '영단어 매칭',   desc: '영↔한 짝맞추기',   tag: '영어' },
  { id: 'math-speed',          category: 'learn', icon: '🔢', title: '연산 스피드',   desc: '사칙연산 타임',    tag: '수학' },
  { id: 'shape',               category: 'learn', icon: '📐', title: '도형 퀴즈',     desc: '도형 알아맞히기',  tag: '수학' },
  { id: 'math-champ',          category: 'learn', icon: '🏆', title: '수학 챔피언',   desc: '종합 도전',        tag: '수학' },
  { id: 'word-battle',         category: 'learn', icon: '⚔️', title: '단어 배틀',     desc: '2인 영단어',       tag: '영어' },
  { id: 'word-sprint',         category: 'learn', icon: '💨', title: '단어 스프린트', desc: '영단어 빠른 입력', tag: '영어' },
];

const CATEGORY_ORDER: Category[] = ['family', 'casual', 'strategy', 'learn'];

export function PlayHub() {
  const { state } = useFamily();
  const { darkMode: dark } = state;
  const [current, setCurrent] = useState<GameId>('hub');

  const goBack = () => setCurrent('hub');

  useAndroidBack(current !== 'hub', goBack);

  // 기존 게임
  if (current === 'kinship')    return <KinshipQuiz onBack={goBack} />;
  if (current === 'twentyfour') return <TwentyFour onBack={goBack} />;
  if (current === 'memory')     return <MemoryGame onBack={goBack} />;
  if (current === 'whack')      return <WhackMole onBack={goBack} />;
  if (current === 'omok')       return <Omok onBack={goBack} />;
  if (current === 'baduk')      return <Baduk onBack={goBack} />;
  if (current === 'janggi')     return <Janggi onBack={goBack} />;
  if (current === 'chess')      return <Chess onBack={goBack} />;

  // GradeQuiz 기반
  if (current === 'proverb')    return <ProverbQuizGame onBack={goBack} />;
  if (current === 'spelling')   return <SpellingQuizGame onBack={goBack} />;
  if (current === 'flag')       return <FlagQuizGame onBack={goBack} />;
  if (current === 'continent')  return <ContinentQuizGame onBack={goBack} />;
  if (current === 'dinosaur')   return <DinosaurQuizGame onBack={goBack} />;
  if (current === 'space')      return <SpaceQuizGame onBack={goBack} />;
  if (current === 'hanja')      return <HanjaQuizGame onBack={goBack} />;
  if (current === 'logic')      return <LogicQuizGame onBack={goBack} />;
  if (current === 'safety')     return <SafetyQuizGame onBack={goBack} />;

  // 독립 학습 게임
  if (current === 'baduk-classroom')      return <BadukClassroomGame onBack={goBack} />;
  if (current === 'english-championship') return <EnglishChampionshipGame onBack={goBack} />;
  if (current === 'history')              return <HistoryQuizGame onBack={goBack} />;
  if (current === 'science')              return <ScienceQuizGame onBack={goBack} />;
  if (current === 'nonsense')             return <NonsenseQuizGame onBack={goBack} />;
  if (current === 'word-matching')        return <WordMatchingGame onBack={goBack} />;
  if (current === 'math-speed')           return <MathSpeedQuizGame onBack={goBack} />;
  if (current === 'shape')                return <ShapeQuizGame onBack={goBack} />;
  if (current === 'math-champ')           return <MathChampionshipGame onBack={goBack} />;
  if (current === 'word-battle')          return <WordBattleGame onBack={goBack} />;
  if (current === 'word-sprint')          return <WordSprintGame onBack={goBack} />;

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
