import React, { useEffect, useRef, useState } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';

const GRID_SIZE = 9; // 3x3
const GAME_SECONDS = 30;
const MOLE_LIFETIME_MS = 1000;
const SPAWN_INTERVAL_MS = 700;
const STORAGE_KEY = 'chonmap.game.whack';

// 뽕망치 SVG — 알록달록한 장난감 망치
export function ToyHammer({ size = 48, rotation = 0, swinging = false }: { size?: number; rotation?: number; swinging?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        transform: `rotate(${rotation}deg)${swinging ? ' scale(1.1)' : ''}`,
        transition: 'transform 0.12s ease-out',
        transformOrigin: '50% 80%',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
      }}
    >
      {/* 손잡이 (나무) */}
      <rect x="46" y="48" width="8" height="48" rx="3" fill="#92400E" />
      <rect x="47" y="48" width="2" height="48" fill="rgba(255,255,255,0.35)" />
      {/* 손잡이 그립 */}
      <rect x="44" y="82" width="12" height="3" fill="#451A03" />
      <rect x="44" y="88" width="12" height="3" fill="#451A03" />
      {/* 머리 — 긴 알약 */}
      <ellipse cx="50" cy="32" rx="40" ry="24" fill="#EF4444" />
      {/* 노란색 띠 */}
      <rect x="8" y="29" width="84" height="7" fill="#FBBF24" />
      <rect x="8" y="29" width="84" height="2" fill="#FCD34D" />
      {/* 끝부분 파란 포인트 */}
      <ellipse cx="11" cy="32" rx="4" ry="8" fill="#3B82F6" />
      <ellipse cx="89" cy="32" rx="4" ry="8" fill="#3B82F6" />
      {/* 하이라이트 */}
      <ellipse cx="50" cy="21" rx="34" ry="5" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

interface Stats {
  highScore: number;
  plays: number;
}

function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { highScore: 0, plays: 0, ...JSON.parse(r) }; } catch {}
  return { highScore: 0, plays: 0 };
}
function saveStats(s: Stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function WhackMole({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [moles, setMoles] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [hit, setHit] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats());

  const gameTimerRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const despawnTimersRef = useRef<Map<number, number>>(new Map());
  const scoreRef = useRef(0);

  const cleanup = () => {
    if (gameTimerRef.current) window.clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
    despawnTimersRef.current.forEach(t => window.clearTimeout(t));
    despawnTimersRef.current.clear();
    gameTimerRef.current = null;
    spawnTimerRef.current = null;
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const start = () => {
    cleanup();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_SECONDS);
    setMoles(Array(GRID_SIZE).fill(false));
    setHit(null);
    setPhase('playing');

    gameTimerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnTimerRef.current = window.setInterval(() => {
      spawnMole();
    }, SPAWN_INTERVAL_MS);
  };

  const spawnMole = () => {
    setMoles(prev => {
      // pick random empty cell
      const empties: number[] = [];
      prev.forEach((m, i) => { if (!m) empties.push(i); });
      if (empties.length === 0) return prev;
      const idx = empties[Math.floor(Math.random() * empties.length)];
      const next = [...prev];
      next[idx] = true;
      // schedule despawn
      const t = window.setTimeout(() => {
        setMoles(cur => {
          const n = [...cur];
          n[idx] = false;
          return n;
        });
        despawnTimersRef.current.delete(idx);
      }, MOLE_LIFETIME_MS);
      despawnTimersRef.current.set(idx, t);
      return next;
    });
  };

  const endGame = () => {
    cleanup();
    setPhase('done');
    const finalScore = scoreRef.current;
    const newStats: Stats = {
      highScore: Math.max(stats.highScore, finalScore),
      plays: stats.plays + 1,
    };
    setStats(newStats);
    saveStats(newStats);
  };

  const whack = (idx: number) => {
    if (phase !== 'playing') return;
    if (!moles[idx]) return;
    const t = despawnTimersRef.current.get(idx);
    if (t) { window.clearTimeout(t); despawnTimersRef.current.delete(idx); }
    setMoles(prev => { const n = [...prev]; n[idx] = false; return n; });
    scoreRef.current += 1;
    setScore(s => s + 1);
    setHit(idx);
    window.setTimeout(() => setHit(h => (h === idx ? null : h)), 180);
  };

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const holeBg = dark ? '#111827' : '#8B7355';

  const startBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8B6914, #C4961A)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <>
      <BackBar title="두더지 잡기" onBack={onBack} dark={dark} />
      <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
        {phase === 'idle' && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ToyHammer size={72} rotation={-20} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>두더지 잡기</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
              30초 안에 튀어나오는 두더지를<br/>최대한 많이 잡아보세요!
            </div>
            {stats.plays > 0 && (
              <div style={{ marginTop: 20, fontSize: 13, color: textSecondary }}>
                최고 점수: <strong style={{ color: goldColor, fontSize: 16 }}>{stats.highScore}</strong>
              </div>
            )}
            <button onClick={start} style={{ ...startBtn, marginTop: 24 }}>시작하기</button>
          </div>
        )}

        {(phase === 'playing' || phase === 'done') && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: 12, padding: '12px 16px', marginBottom: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, color: textSecondary }}>점수</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: goldColor }}>{score}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: textSecondary }}>남은 시간</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: timeLeft <= 5 ? '#EF4444' : textPrimary }}>
                  {timeLeft}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              maxWidth: 340, margin: '0 auto',
            }}>
              {moles.map((up, i) => (
                <button
                  key={i}
                  onClick={() => whack(i)}
                  disabled={phase !== 'playing'}
                  style={{
                    aspectRatio: '1 / 1',
                    background: holeBg,
                    border: `3px solid ${dark ? '#374151' : '#6B5845'}`,
                    borderRadius: '50%',
                    fontSize: 44,
                    cursor: phase === 'playing' ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.08s',
                    transform: hit === i ? 'scale(0.9)' : 'scale(1)',
                  }}
                >
                  {hit === i ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%',
                    }}>
                      <ToyHammer size={Math.floor(56)} rotation={-30} swinging />
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-block',
                      transform: up ? 'translateY(0)' : 'translateY(60%)',
                      opacity: up ? 1 : 0,
                      transition: 'transform 0.15s, opacity 0.1s',
                    }}>
                      🦫
                    </span>
                  )}
                </button>
              ))}
            </div>

            {phase === 'done' && (
              <div style={{
                marginTop: 20, padding: 20, textAlign: 'center',
                background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14,
              }}>
                <div style={{ fontSize: 48 }}>{score >= stats.highScore && score > 0 ? '🏆' : '🎮'}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary, marginTop: 8 }}>게임 종료!</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: goldColor, marginTop: 10 }}>{score}점</div>
                <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                  최고 점수: {stats.highScore}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button onClick={start} style={{ ...startBtn, flex: 1 }}>다시 하기</button>
                  <button onClick={() => setPhase('idle')} style={{
                    flex: 1, background: 'none', border: `1px solid ${cardBorder}`,
                    borderRadius: 14, padding: 14, fontSize: 14, color: textSecondary, cursor: 'pointer',
                  }}>처음으로</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
