import React, { useEffect, useRef, useState } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';

const EMOJI_POOL = [
  '🍎','🍌','🍇','🍓','🍑','🍉','🥕','🌽',
  '🐶','🐱','🐭','🐰','🐻','🐼','🐸','🐨',
  '⚽','🏀','🎾','🏐','🎱','🎲','🎯','🎳',
  '🚗','🚕','🚙','🚌','🚓','✈️','🚀','🚁',
  '🌞','🌝','🌈','⭐','❤️','💙','💚','💛',
];

type Difficulty = 'easy' | 'normal' | 'hard';
const DIFF_MAP: Record<Difficulty, { pairs: number; cols: number; label: string }> = {
  easy:   { pairs: 6,  cols: 3, label: '쉬움 (6쌍)' },
  normal: { pairs: 8,  cols: 4, label: '보통 (8쌍)' },
  hard:   { pairs: 12, cols: 4, label: '어려움 (12쌍)' },
};

const STORAGE_KEY = 'chonmap.game.memory';

interface BestRecord {
  moves: number;
  seconds: number;
}

function loadBest(): Record<Difficulty, BestRecord | null> {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return { easy: null, normal: null, hard: null, ...JSON.parse(r) };
  } catch {}
  return { easy: null, normal: null, hard: null };
}
function saveBest(b: Record<Difficulty, BestRecord | null>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {}
}

interface Card {
  id: number;
  emoji: string;
  matched: boolean;
  flipped: boolean;
}

function generateCards(pairs: number): Card[] {
  const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
  const cards: Card[] = [];
  pool.forEach((emoji, i) => {
    cards.push({ id: i * 2,     emoji, matched: false, flipped: false });
    cards.push({ id: i * 2 + 1, emoji, matched: false, flipped: false });
  });
  return cards.sort(() => Math.random() - 0.5);
}

export function MemoryGame({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [diff, setDiff] = useState<Difficulty>('normal');
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices of currently flipped (unmatched)
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [bests, setBests] = useState(loadBest());
  const lockRef = useRef(false);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [phase, startTime]);

  const startGame = (d: Difficulty) => {
    setDiff(d);
    setCards(generateCards(DIFF_MAP[d].pairs));
    setFlipped([]);
    setMoves(0);
    setElapsed(0);
    setStartTime(Date.now());
    setPhase('playing');
    lockRef.current = false;
  };

  const handleCardClick = (idx: number) => {
    if (lockRef.current) return;
    const c = cards[idx];
    if (c.matched || c.flipped) return;
    if (flipped.length === 2) return;

    const newCards = cards.map((cc, i) => (i === idx ? { ...cc, flipped: true } : cc));
    setCards(newCards);
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        // match
        setTimeout(() => {
          setCards(cs => {
            const updated = cs.map((cc, i) => ((i === a || i === b) ? { ...cc, matched: true } : cc));
            // check game complete
            if (updated.every(cc => cc.matched)) {
              const secs = Math.floor((Date.now() - startTime) / 1000);
              setElapsed(secs);
              setPhase('done');
              const currentBest = bests[diff];
              const newRecord: BestRecord = { moves: moves + 1, seconds: secs };
              let shouldUpdate = false;
              if (!currentBest) shouldUpdate = true;
              else if (newRecord.moves < currentBest.moves) shouldUpdate = true;
              else if (newRecord.moves === currentBest.moves && newRecord.seconds < currentBest.seconds) shouldUpdate = true;
              if (shouldUpdate) {
                const nb = { ...bests, [diff]: newRecord };
                setBests(nb);
                saveBest(nb);
              }
            }
            return updated;
          });
          setFlipped([]);
        }, 400);
      } else {
        // mismatch: flip back after delay
        lockRef.current = true;
        setTimeout(() => {
          setCards(cs => cs.map((cc, i) => ((i === a || i === b) ? { ...cc, flipped: false } : cc)));
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const cardBack = 'linear-gradient(135deg, #8B6914, #C4961A)';

  const cols = DIFF_MAP[diff].cols;
  const startBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8B6914, #C4961A)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <>
      <BackBar title="카드 뒤집기" onBack={onBack} dark={dark} />
      <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
        {phase === 'setup' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 48 }}>🃏</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>카드 뒤집기</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
              같은 그림의 카드 두 장을 찾아 짝을 맞춰요!
            </div>
            <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                <button key={d} onClick={() => startGame(d)} style={{
                  background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14,
                  padding: '14px 20px', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{DIFF_MAP[d].label}</div>
                    {bests[d] && (
                      <div style={{ fontSize: 11, color: textSecondary }}>
                        최고: {bests[d]!.moves}번 / {bests[d]!.seconds}초
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === 'playing' || phase === 'done') && (
          <>
            {/* 상태바 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontSize: 10, color: textSecondary }}>시도 횟수</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary }}>{moves}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: textSecondary }}>난이도</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: goldColor }}>{DIFF_MAP[diff].label}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: textSecondary }}>시간</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary }}>{elapsed}초</div>
              </div>
            </div>

            {/* 카드 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 8,
              maxWidth: cols === 3 ? 300 : 400,
              margin: '0 auto',
            }}>
              {cards.map((c, i) => (
                <button key={c.id} onClick={() => handleCardClick(i)} style={{
                  aspectRatio: '1 / 1',
                  background: c.flipped || c.matched ? cardBg : cardBack,
                  border: `2px solid ${c.matched ? '#10B981' : cardBorder}`,
                  borderRadius: 12,
                  fontSize: cols === 3 ? 36 : 28,
                  cursor: c.flipped || c.matched ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: c.matched ? 0.6 : 1,
                }}>
                  {(c.flipped || c.matched) ? c.emoji : ''}
                </button>
              ))}
            </div>

            {phase === 'done' && (
              <div style={{ marginTop: 20, textAlign: 'center', padding: 20, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14 }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary, marginTop: 8 }}>완성!</div>
                <div style={{ fontSize: 13, color: textSecondary, marginTop: 6 }}>
                  {moves}번 · {elapsed}초
                </div>
                {bests[diff] && (bests[diff]!.moves === moves && bests[diff]!.seconds === elapsed) && (
                  <div style={{ fontSize: 12, color: goldColor, marginTop: 6, fontWeight: 700 }}>🏆 신기록!</div>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button onClick={() => startGame(diff)} style={{ ...startBtn, flex: 1 }}>다시 하기</button>
                  <button onClick={() => setPhase('setup')} style={{
                    flex: 1, background: 'none', border: `1px solid ${cardBorder}`,
                    borderRadius: 14, padding: 14, fontSize: 14, color: textSecondary, cursor: 'pointer',
                  }}>난이도 선택</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
