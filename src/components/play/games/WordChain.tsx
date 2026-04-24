import React, { useEffect, useRef, useState } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';

// 두음법칙: 각 글자의 허용 가능한 대체 첫 글자
// 예: '라'로 시작하는 단어 대신 '나'로 시작하는 단어도 허용
const DUEUM_MAP: Record<string, string[]> = {
  '라': ['나'], '락': ['낙'], '란': ['난'], '랄': ['날'], '람': ['남'], '랍': ['납'], '랑': ['낭'],
  '래': ['내'], '랭': ['냉'], '량': ['양'],
  '려': ['여'], '력': ['역'], '련': ['연'], '렬': ['열'], '렴': ['염'], '렵': ['엽'], '령': ['영'], '례': ['예'],
  '로': ['노'], '록': ['녹'], '론': ['논'], '롱': ['농'], '뢰': ['뇌'], '료': ['요'], '룡': ['용'],
  '루': ['누'], '류': ['유'], '륙': ['육'], '륜': ['윤'], '률': ['율'], '륭': ['융'], '릉': ['능'],
  '르': ['느'], '리': ['이'], '린': ['인'], '림': ['임'], '립': ['입'],
  '녀': ['여'], '뇨': ['요'], '뉴': ['유'], '니': ['이'],
};

function validFirstChars(lastChar: string): string[] {
  return [lastChar, ...(DUEUM_MAP[lastChar] || [])];
}

function isKorean(word: string): boolean {
  return /^[가-힣]+$/.test(word);
}

const TURN_SECONDS = 20;
const STORAGE_KEY = 'chonmap.game.wordchain';

interface Stats {
  maxChain: number;
  totalRounds: number;
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { maxChain: 0, totalRounds: 0, ...JSON.parse(raw) };
  } catch {}
  return { maxChain: 0, totalRounds: 0 };
}
function saveStats(s: Stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function WordChain({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [p1Name, setP1Name] = useState('플레이어 1');
  const [p2Name, setP2Name] = useState('플레이어 2');
  const [phase, setPhase] = useState<'setup' | 'playing' | 'result'>('setup');

  const [words, setWords] = useState<string[]>([]);
  const [turn, setTurn] = useState<0 | 1>(0); // 0 = p1, 1 = p2
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [loser, setLoser] = useState<0 | 1 | null>(null);
  const [loseReason, setLoseReason] = useState('');
  const [stats, setStats] = useState<Stats>(loadStats());

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const lastWord = words[words.length - 1];
  const lastChar = lastWord ? lastWord[lastWord.length - 1] : '';
  const nextStarts = lastChar ? validFirstChars(lastChar) : [];

  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(TURN_SECONDS);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          finishRound(turn, '시간 초과');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    inputRef.current?.focus();
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn]);

  const finishRound = (loserTurn: 0 | 1, reason: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setLoser(loserTurn);
    setLoseReason(reason);
    setPhase('result');
    const newStats: Stats = {
      maxChain: Math.max(stats.maxChain, words.length),
      totalRounds: stats.totalRounds + 1,
    };
    setStats(newStats);
    saveStats(newStats);
  };

  const startGame = () => {
    setWords([]);
    setTurn(0);
    setInput('');
    setError('');
    setLoser(null);
    setLoseReason('');
    setPhase('playing');
  };

  const submit = () => {
    const w = input.trim();
    setError('');
    if (!w) return;
    if (w.length < 2) { setError('2글자 이상 입력하세요.'); return; }
    if (!isKorean(w)) { setError('한글만 입력 가능합니다.'); return; }
    if (words.includes(w)) { setError('이미 나온 단어입니다.'); return; }
    if (lastChar && !nextStarts.includes(w[0])) {
      setError(`"${nextStarts.join(', ')}" 중 하나로 시작해야 합니다.`);
      return;
    }
    setWords(ws => [...ws, w]);
    setInput('');
    setTurn(t => (t === 0 ? 1 : 0));
  };

  const giveUp = () => finishRound(turn, '포기');

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const inputBg = dark ? '#374151' : '#FFF8DC';

  const turnName = turn === 0 ? p1Name : p2Name;
  const winnerName = loser === 0 ? p2Name : loser === 1 ? p1Name : '';

  const startBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8B6914, #C4961A)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <>
      <BackBar title="끝말잇기" onBack={onBack} dark={dark} />
      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {phase === 'setup' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 48 }}>🔗</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>끝말잇기</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
              2명이 번갈아가며 단어를 이어가요.<br/>20초 안에 말하지 못하면 패배!<br/>(두음법칙 허용)
            </div>
            <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
              <input value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder="플레이어 1"
                style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 12, fontSize: 14, color: textPrimary, textAlign: 'center' }} />
              <input value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="플레이어 2"
                style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 12, fontSize: 14, color: textPrimary, textAlign: 'center' }} />
            </div>
            <button onClick={startGame} style={{ ...startBtn, marginTop: 20 }}>시작하기</button>
            {stats.totalRounds > 0 && (
              <div style={{ marginTop: 16, fontSize: 12, color: textSecondary }}>
                최장 기록: <strong style={{ color: goldColor }}>{stats.maxChain}단어</strong> · 플레이 {stats.totalRounds}회
              </div>
            )}
          </div>
        )}

        {phase === 'playing' && (
          <>
            {/* 턴 표시 */}
            <div style={{
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: 14, padding: '12px 16px', marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: textSecondary }}>지금은</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: goldColor }}>{turnName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: textSecondary }}>남은 시간</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: timeLeft <= 5 ? '#EF4444' : textPrimary }}>
                  {timeLeft}
                </div>
              </div>
            </div>

            {/* 마지막 단어 */}
            <div style={{
              background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14,
              padding: 16, textAlign: 'center', marginBottom: 12,
            }}>
              {lastWord ? (
                <>
                  <div style={{ fontSize: 11, color: textSecondary }}>이전 단어</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: textPrimary, marginTop: 4 }}>
                    {lastWord.slice(0, -1)}
                    <span style={{ color: goldColor }}>{lastChar}</span>
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>
                    다음은 <strong style={{ color: goldColor }}>{nextStarts.join(' / ')}</strong> 으로 시작
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: textSecondary }}>첫 단어를 자유롭게 입력하세요</div>
              )}
            </div>

            {/* 입력 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                placeholder="단어 입력"
                style={{
                  flex: 1, background: inputBg, border: `2px solid ${cardBorder}`,
                  borderRadius: 12, padding: 14, fontSize: 18, color: textPrimary,
                  outline: 'none', textAlign: 'center', fontWeight: 700,
                }}
              />
              <button onClick={submit} style={{
                background: 'linear-gradient(135deg, #8B6914, #C4961A)',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '0 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>확인</button>
            </div>
            {error && (
              <div style={{ marginTop: 10, padding: 10, background: dark ? '#450A0A' : '#FEE2E2', color: dark ? '#FCA5A5' : '#991B1B', borderRadius: 10, fontSize: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* 포기 */}
            <button onClick={giveUp} style={{
              marginTop: 14, width: '100%', background: 'none',
              border: `1px solid ${cardBorder}`, borderRadius: 12,
              padding: 10, fontSize: 13, color: textSecondary, cursor: 'pointer',
            }}>포기하기</button>

            {/* 단어 히스토리 */}
            {words.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: textSecondary, marginBottom: 6 }}>
                  지금까지 {words.length}단어
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                  maxHeight: 140, overflowY: 'auto',
                  padding: 8, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10,
                }}>
                  {words.map((w, i) => (
                    <span key={i} style={{
                      background: i % 2 === 0 ? (dark ? '#1E3A5F' : '#DBEAFE') : (dark ? '#3D1F2E' : '#FCE4EC'),
                      color: i % 2 === 0 ? (dark ? '#93C5FD' : '#1E40AF') : (dark ? '#F9A8D4' : '#9F1239'),
                      padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    }}>{w}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'result' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 56 }}>🏆</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>승자: {winnerName}</div>
            <div style={{ fontSize: 13, color: textSecondary, marginTop: 6 }}>
              {turnName}의 패배 — {loseReason}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: textSecondary }}>이어간 단어 수</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: goldColor }}>{words.length}</div>
              {words.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: textSecondary, lineHeight: 1.7 }}>
                  {words.join(' → ')}
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: textSecondary }}>
              최장 기록: <strong style={{ color: goldColor }}>{stats.maxChain}단어</strong>
            </div>
            <button onClick={startGame} style={{ ...startBtn, marginTop: 20 }}>다시 하기</button>
            <button onClick={() => setPhase('setup')} style={{
              marginTop: 10, background: 'none', border: `1px solid ${cardBorder}`,
              borderRadius: 14, padding: '12px 28px', fontSize: 14, color: textSecondary,
              cursor: 'pointer', display: 'block', width: '100%',
            }}>처음으로</button>
          </div>
        )}
      </div>
    </>
  );
}
