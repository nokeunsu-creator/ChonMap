import React, { useState, useMemo } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';
import { AdBanner } from '../../ads/AdBanner';
import { maybeFireGameOverAd } from '../../ads/GameAd';

const TARGET = 24;
const EPS = 1e-6;
const STORAGE_KEY = 'chonmap.game.twentyfour';

interface Stats {
  solved: number;
  bestSeconds: number | null;
}

function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { solved: 0, bestSeconds: null, ...JSON.parse(r) }; } catch {}
  return { solved: 0, bestSeconds: null };
}
function saveStats(s: Stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// 4개 숫자로 24를 만들 수 있는지 검사 (브루트포스)
function canMake24(nums: number[]): boolean {
  if (nums.length === 1) return Math.abs(nums[0] - TARGET) < EPS;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const rest: number[] = [];
      for (let k = 0; k < nums.length; k++) if (k !== i && k !== j) rest.push(nums[k]);
      const a = nums[i], b = nums[j];
      const results = [a + b, a - b, a * b];
      if (Math.abs(b) > EPS) results.push(a / b);
      for (const r of results) {
        if (canMake24([...rest, r])) return true;
      }
    }
  }
  return false;
}

function generatePuzzle(): number[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const nums = [
      1 + Math.floor(Math.random() * 9),
      1 + Math.floor(Math.random() * 9),
      1 + Math.floor(Math.random() * 9),
      1 + Math.floor(Math.random() * 9),
    ];
    if (canMake24(nums)) return nums;
  }
  return [1, 2, 3, 4]; // fallback (1*2*3*4 = 24)
}

// 사용자 수식 평가 (안전한 문자만 허용)
function evaluate(expr: string): number | null {
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('return (' + expr + ')');
    const v = fn();
    if (typeof v !== 'number' || !isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

function extractDigits(expr: string): number[] {
  // 연속된 숫자를 찾지 않고, 단일 자리 숫자만 추출 (가령 "12+12" 는 [1,2,1,2])
  // 하지만 사용자가 "4*6" 같은 것도 입력할 수 있으므로 모든 숫자 추출
  const matches = expr.match(/\d+/g) || [];
  const result: number[] = [];
  for (const m of matches) {
    for (const c of m) result.push(parseInt(c, 10));
  }
  return result;
}

function sortedKey(nums: number[]) {
  return [...nums].sort((a, b) => a - b).join(',');
}

export function TwentyFour({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [puzzle, setPuzzle] = useState<number[]>(() => generatePuzzle());
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats());

  const puzzleKey = useMemo(() => sortedKey(puzzle), [puzzle]);

  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const inputBg = dark ? '#374151' : '#FFF8DC';

  const appendToInput = (s: string) => {
    setInput(i => i + s);
    setFeedback(null);
  };

  const backspace = () => setInput(i => i.slice(0, -1));
  const clearInput = () => { setInput(''); setFeedback(null); };

  const submit = () => {
    const expr = input.trim();
    if (!expr) return;
    const used = extractDigits(expr);
    const required = [...puzzle].sort();
    const usedSorted = [...used].sort();

    if (used.length !== puzzle.length || required.join(',') !== usedSorted.join(',')) {
      setFeedback({ ok: false, msg: `주어진 숫자 4개를 각각 한 번씩만 써야 합니다.` });
      return;
    }
    const v = evaluate(expr);
    if (v === null) {
      setFeedback({ ok: false, msg: '수식이 잘못되었습니다.' });
      return;
    }
    if (Math.abs(v - TARGET) < EPS) {
      const secs = Math.round((Date.now() - startTime) / 1000);
      setFeedback({ ok: true, msg: `정답! ${secs}초 만에 풀었어요!` });
      setSolved(true);
      const newStats: Stats = {
        solved: stats.solved + 1,
        bestSeconds: stats.bestSeconds == null ? secs : Math.min(stats.bestSeconds, secs),
      };
      setStats(newStats);
      saveStats(newStats);
    } else {
      setFeedback({ ok: false, msg: `결과는 ${Math.round(v * 100) / 100} (24가 아닙니다)` });
    }
  };

  const nextPuzzle = () => {
    if (solved) maybeFireGameOverAd('24점 퍼즐');
    setPuzzle(generatePuzzle());
    setInput('');
    setFeedback(null);
    setSolved(false);
    setStartTime(Date.now());
  };

  const btnStyle: React.CSSProperties = {
    background: cardBg, border: `1px solid ${cardBorder}`,
    borderRadius: 10, padding: '14px 0', fontSize: 18, fontWeight: 700,
    color: textPrimary, cursor: 'pointer', transition: 'transform 0.08s',
  };
  const opBtnStyle: React.CSSProperties = {
    ...btnStyle, background: dark ? '#3D1F2E' : '#FCE4EC', color: dark ? '#F9A8D4' : '#9F1239',
  };

  return (
    <>
      <BackBar title="24점 퍼즐" onBack={onBack} dark={dark} />
      <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: textSecondary }}>다음 숫자 4개로 <strong style={{ color: goldColor }}>24</strong>를 만들어보세요</div>
        </div>

        {/* 주어진 숫자 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {puzzle.map((n, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg, #8B6914, #C4961A)',
              color: 'white', borderRadius: 14,
              padding: '18px 0', textAlign: 'center',
              fontSize: 32, fontWeight: 800,
              boxShadow: '0 2px 8px rgba(139,105,20,0.3)',
            }}>{n}</div>
          ))}
        </div>

        {/* 입력 */}
        <div style={{
          background: inputBg, border: `2px solid ${cardBorder}`,
          borderRadius: 14, padding: '14px 16px', minHeight: 54,
          fontSize: 22, fontWeight: 700, color: textPrimary,
          textAlign: 'center', marginBottom: 12, letterSpacing: 1,
          wordBreak: 'break-all',
        }}>{input || <span style={{ color: textSecondary, fontSize: 14, fontWeight: 400 }}>수식을 입력하세요</span>}</div>

        {/* 피드백 */}
        {feedback && (
          <div style={{
            padding: '10px 14px', borderRadius: 12, textAlign: 'center', marginBottom: 12,
            background: feedback.ok ? (dark ? '#064E3B' : '#D1FAE5') : (dark ? '#450A0A' : '#FEE2E2'),
            color: feedback.ok ? (dark ? '#6EE7B7' : '#065F46') : (dark ? '#FCA5A5' : '#991B1B'),
            fontSize: 13, fontWeight: 600,
          }}>{feedback.msg}</div>
        )}

        {/* 키패드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          {puzzle.map((n, i) => (
            <button key={`n-${i}`} onClick={() => appendToInput(String(n))} style={btnStyle}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          <button onClick={() => appendToInput('+')} style={opBtnStyle}>+</button>
          <button onClick={() => appendToInput('-')} style={opBtnStyle}>−</button>
          <button onClick={() => appendToInput('*')} style={opBtnStyle}>×</button>
          <button onClick={() => appendToInput('/')} style={opBtnStyle}>÷</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <button onClick={() => appendToInput('(')} style={btnStyle}>(</button>
          <button onClick={() => appendToInput(')')} style={btnStyle}>)</button>
          <button onClick={backspace} style={{ ...btnStyle, fontSize: 15 }}>⌫</button>
          <button onClick={clearInput} style={{ ...btnStyle, fontSize: 14 }}>초기화</button>
        </div>

        {!solved ? (
          <button onClick={submit} style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: 'linear-gradient(135deg, #8B6914, #C4961A)',
            color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>확인</button>
        ) : (
          <button onClick={nextPuzzle} style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>다음 문제 →</button>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: textSecondary }}>
          푼 문제: <strong style={{ color: goldColor }}>{stats.solved}</strong>
          {stats.bestSeconds != null && <> · 최단 시간: <strong style={{ color: goldColor }}>{stats.bestSeconds}초</strong></>}
        </div>

        {!solved && (
          <button onClick={nextPuzzle} style={{
            marginTop: 10, width: '100%', background: 'none',
            border: `1px solid ${cardBorder}`, borderRadius: 12,
            padding: 8, fontSize: 12, color: textSecondary, cursor: 'pointer',
          }}>건너뛰기</button>
        )}

        <div style={{ marginTop: 14, fontSize: 11, color: textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
          키 {puzzleKey} · +, −, ×, ÷ 와 괄호를 사용해 24를 만드세요
        </div>

        <div style={{ marginTop: 20 }}><AdBanner /></div>
      </div>
    </>
  );
}
