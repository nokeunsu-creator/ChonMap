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

type GameId = 'hub' | 'kinship' | 'twentyfour' | 'memory' | 'whack' | 'omok' | 'baduk' | 'janggi' | 'chess';

interface GameMeta {
  id: GameId;
  icon: React.ReactNode;
  title: string;
  desc: string;
  players: string;
  tag?: string;
}

const GAMES: GameMeta[] = [
  { id: 'kinship',    icon: '\u{1F3AF}', title: '호칭 퀴즈',    desc: '우리 가족의 호칭 맞추기',    players: '1인',   tag: '가족' },
  { id: 'twentyfour', icon: '\u{1F3B2}', title: '24점 퍼즐',    desc: '숫자 4개로 24를 만들기',      players: '1인~',  tag: '두뇌' },
  { id: 'memory',     icon: '\u{1F0CF}', title: '카드 뒤집기',   desc: '짝 맞추기 메모리 게임',        players: '1-2인', tag: '기억력' },
  { id: 'whack',      icon: <ToyHammer size={44} rotation={-20} />, title: '두더지 잡기',   desc: '30초 반사신경 게임',           players: '1인',   tag: '반사' },
  { id: 'omok',       icon: '\u{26AB}',  title: '오목',           desc: '5개 먼저 잇는 사람이 승리',    players: '1-2인', tag: '전략' },
  { id: 'baduk',      icon: '\u{26AA}',  title: '바둑',           desc: '집이 많은 쪽이 승리',          players: '1-2인', tag: '전략' },
  { id: 'janggi',     icon: '\u{265F}',  title: '장기',           desc: '한국 전통 보드게임',           players: '1-2인', tag: '전략' },
  { id: 'chess',      icon: '\u{2654}',  title: '체스',           desc: '세계적인 전략 보드게임',        players: '1-2인', tag: '전략' },
];

export function PlayHub() {
  const { state } = useFamily();
  const { darkMode: dark } = state;
  const [current, setCurrent] = useState<GameId>('hub');

  const goBack = () => setCurrent('hub');

  // 안드로이드 뒤로가기: 게임 화면 → 허브
  useAndroidBack(current !== 'hub', goBack);

  if (current === 'kinship')    return <KinshipQuiz onBack={goBack} />;
  if (current === 'twentyfour') return <TwentyFour onBack={goBack} />;
  if (current === 'memory')     return <MemoryGame onBack={goBack} />;
  if (current === 'whack')      return <WhackMole onBack={goBack} />;
  if (current === 'omok')       return <Omok onBack={goBack} />;
  if (current === 'baduk')      return <Baduk onBack={goBack} />;
  if (current === 'janggi')     return <Janggi onBack={goBack} />;
  if (current === 'chess')      return <Chess onBack={goBack} />;

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const tagBg = dark ? '#374151' : '#FFF8DC';

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 36 }}>{'\u{1F3AE}'}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 4 }}>가족 놀이</div>
        <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>온 가족이 함께 즐기는 미니게임</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setCurrent(g.id)}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 16,
              padding: '18px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.12s, box-shadow 0.12s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            <div style={{ fontSize: 36, lineHeight: 1, display: 'flex', justifyContent: 'center', minHeight: 40 }}>{g.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginTop: 10 }}>{g.title}</div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 4, minHeight: 28 }}>{g.desc}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
              {g.tag && (
                <span style={{ fontSize: 10, background: tagBg, color: goldColor, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {g.tag}
                </span>
              )}
              <span style={{ fontSize: 10, background: tagBg, color: textSecondary, padding: '2px 8px', borderRadius: 10 }}>
                {g.players}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: textSecondary }}>
        더 많은 게임이 곧 추가됩니다!
      </div>
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
