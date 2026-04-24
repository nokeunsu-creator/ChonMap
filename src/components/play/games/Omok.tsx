import React, { useEffect, useRef, useState } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useAndroidBack } from '../../../utils/useAndroidBack';
import { AdBanner } from '../../ads/AdBanner';
import { maybeFireGameOverAd } from '../../ads/GameAd';

const SIZE = 15;
type Stone = 'black' | 'white' | null;
type Cell = Stone;
type Board = Cell[][];
type Mode = null | 'local' | 'ai-pick' | 'ai';

interface Move { r: number; c: number; player: Stone }

const STORAGE_KEY = 'chonmap.game.omok';

interface Stats {
  aiWins: number;
  aiLosses: number;
  localPlays: number;
}
function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { aiWins: 0, aiLosses: 0, localPlays: 0, ...JSON.parse(r) }; } catch {}
  return { aiWins: 0, aiLosses: 0, localPlays: 0 };
}
function saveStats(s: Stats) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function createBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}

function checkWin(board: Board, r: number, c: number, player: Stone): boolean {
  if (!player) return false;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let d = 1; d < 5; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++;
      else break;
    }
    for (let d = 1; d < 5; d++) {
      const nr = r - dr * d, nc = c - dc * d;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

// ─── AI ───

function getCandidateMoves(board: Board): [number, number][] {
  const candidates = new Set<number>();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) {
              candidates.add(nr * SIZE + nc);
            }
          }
        }
      }
    }
  }
  if (candidates.size === 0) candidates.add(7 * SIZE + 7);
  return [...candidates].map(v => [Math.floor(v / SIZE), v % SIZE]) as [number, number][];
}

function countPattern(board: Board, player: Stone): number {
  let score = 0;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const [dr, dc] of dirs) {
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < SIZE && pc >= 0 && pc < SIZE && board[pr][pc] === player) continue;
        let count = 0;
        let cr = r, cc = c;
        while (cr >= 0 && cr < SIZE && cc >= 0 && cc < SIZE && board[cr][cc] === player) {
          count++;
          cr += dr;
          cc += dc;
        }
        if (count === 0) continue;
        const endR = cr, endC = cc;
        const startR = r - dr, startC = c - dc;
        const openEnd = (endR >= 0 && endR < SIZE && endC >= 0 && endC < SIZE && board[endR][endC] === null);
        const openStart = (startR >= 0 && startR < SIZE && startC >= 0 && startC < SIZE && board[startR][startC] === null);

        if (count >= 5) score += 100000;
        else if (count === 4) {
          if (openEnd && openStart) score += 10000;
          else if (openEnd || openStart) score += 1000;
        } else if (count === 3) {
          if (openEnd && openStart) score += 1000;
          else if (openEnd || openStart) score += 100;
        } else if (count === 2) {
          if (openEnd && openStart) score += 10;
        }
      }
    }
  }
  return score;
}

function evaluate(board: Board, aiColor: Stone): number {
  const humanColor: Stone = aiColor === 'black' ? 'white' : 'black';
  return countPattern(board, aiColor) - countPattern(board, humanColor);
}

interface MinimaxResult { score: number; move?: [number, number] | null }

function minimax(board: Board, depth: number, alpha: number, beta: number, isMaximizing: boolean, aiColor: Stone): MinimaxResult {
  const humanColor: Stone = aiColor === 'black' ? 'white' : 'black';
  if (depth === 0) return { score: evaluate(board, aiColor) };
  const moves = getCandidateMoves(board);
  if (moves.length === 0) return { score: 0 };
  let bestMove: [number, number] | null = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const [r, c] of moves) {
      board[r][c] = aiColor;
      if (checkWin(board, r, c, aiColor)) {
        board[r][c] = null;
        return { score: 100000 + depth, move: [r, c] };
      }
      const result = minimax(board, depth - 1, alpha, beta, false, aiColor);
      board[r][c] = null;
      if (result.score > maxScore) { maxScore = result.score; bestMove = [r, c]; }
      alpha = Math.max(alpha, maxScore);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const [r, c] of moves) {
      board[r][c] = humanColor;
      if (checkWin(board, r, c, humanColor)) {
        board[r][c] = null;
        return { score: -(100000 + depth), move: [r, c] };
      }
      const result = minimax(board, depth - 1, alpha, beta, true, aiColor);
      board[r][c] = null;
      if (result.score < minScore) { minScore = result.score; bestMove = [r, c]; }
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

function getAiMove(board: Board, aiColor: Stone): [number, number] | null {
  const stoneCount = board.flat().filter(Boolean).length;
  const depth = stoneCount < 10 ? 3 : 2;
  const cloned: Board = board.map(row => [...row]);
  const result = minimax(cloned, depth, -Infinity, Infinity, true, aiColor);
  return result.move ?? null;
}

// ─── Component ───

export function Omok({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<Stone>('black');
  const [winner, setWinner] = useState<Stone>(null);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<Move[]>([]);
  const [aiColor, setAiColor] = useState<Stone>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const aiThinkingRef = useRef(false);
  const [stats, setStats] = useState<Stats>(loadStats());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const statsRecordedRef = useRef(false);

  const playerColor: Stone = aiColor === 'black' ? 'white' : 'black';

  // 뷰포트 너비 반응형
  const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 400);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // AI 턴 자동 수행
  useEffect(() => {
    if (mode !== 'ai' || !aiColor || winner || turn !== aiColor) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    setAiThinking(true);

    const timer = window.setTimeout(() => {
      const move = getAiMove(board, aiColor);
      if (move) {
        const [r, c] = move;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = aiColor;
        const newHistory = [...history, { r, c, player: aiColor }];
        const newWinner = checkWin(newBoard, r, c, aiColor) ? aiColor : null;
        const newTurn: Stone = newWinner ? aiColor : (aiColor === 'black' ? 'white' : 'black');
        setBoard(newBoard);
        setLastMove([r, c]);
        setHistory(newHistory);
        setWinner(newWinner);
        setTurn(newTurn);
      }
      aiThinkingRef.current = false;
      setAiThinking(false);
    }, 300);

    return () => { window.clearTimeout(timer); aiThinkingRef.current = false; };
  }, [mode, aiColor, winner, turn, board, history]);

  // 승리 기록
  useEffect(() => {
    if (!winner) { statsRecordedRef.current = false; return; }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    if (mode === 'ai' && aiColor) {
      const newStats = { ...stats };
      if (winner === aiColor) newStats.aiLosses += 1;
      else newStats.aiWins += 1;
      setStats(newStats);
      saveStats(newStats);
    } else if (mode === 'local') {
      const newStats = { ...stats, localPlays: stats.localPlays + 1 };
      setStats(newStats);
      saveStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const place = (r: number, c: number) => {
    if (board[r][c] || winner) return;
    if (mode === 'ai') {
      if (turn !== playerColor) return;
      if (aiThinking) return;
    }
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = turn;
    const newHistory = [...history, { r, c, player: turn }];
    const newWinner = checkWin(newBoard, r, c, turn) ? turn : null;
    const newTurn: Stone = newWinner ? turn : (turn === 'black' ? 'white' : 'black');
    setBoard(newBoard);
    setLastMove([r, c]);
    setHistory(newHistory);
    setWinner(newWinner);
    setTurn(newTurn);
  };

  const undo = () => {
    if (history.length === 0 || winner) return;
    if (mode === 'ai' && aiThinking) return;
    const stepsBack = (mode === 'ai' && history.length >= 2) ? 2 : 1;
    const prev = history.slice(0, -stepsBack);
    const newBoard = createBoard();
    prev.forEach(m => { newBoard[m.r][m.c] = m.player; });
    setBoard(newBoard);
    setHistory(prev);
    setLastMove(prev.length > 0 ? [prev[prev.length - 1].r, prev[prev.length - 1].c] : null);
    setTurn(history[history.length - stepsBack].player);
  };

  const doReset = () => {
    setBoard(createBoard());
    setTurn('black');
    setWinner(null);
    setLastMove(null);
    setHistory([]);
    statsRecordedRef.current = false;
  };
  const reset = () => setShowResetConfirm(true);

  const exitMode = () => {
    setMode(null);
    setAiColor(null);
    setAiThinking(false);
    aiThinkingRef.current = false;
    doReset();
  };

  // 안드로이드 뒤로가기: 하위 화면 → 모드 선택
  useAndroidBack(mode !== null, exitMode);

  const startAiGame = (playerPickedColor: Stone) => {
    const ai: Stone = playerPickedColor === 'black' ? 'white' : 'black';
    setAiColor(ai);
    doReset();
    setMode('ai');
  };

  // 테마
  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const boardColor = dark ? '#92400E' : '#DCB35C';
  const lineColor = dark ? '#3E2723' : '#8B6914';

  const startBtn: React.CSSProperties = {
    padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, color: 'white',
  };

  // AI 색상 선택 화면
  if (mode === 'ai-pick') {
    return (
      <>
        <BackBar title="오목 · 컴퓨터 대전" onBack={() => setMode(null)} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>🤖</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>색을 선택하세요</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>흑(선공)이 유리합니다</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => startAiGame('black')} style={{ ...startBtn, background: 'linear-gradient(135deg, #1F2937, #374151)' }}>
              ⚫ 흑 (선공)
            </button>
            <button onClick={() => startAiGame('white')} style={{ ...startBtn, background: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)', color: '#1F2937' }}>
              ⚪ 백 (후공)
            </button>
          </div>
          {(stats.aiWins > 0 || stats.aiLosses > 0) && (
            <div style={{ marginTop: 20, fontSize: 12, color: textSecondary }}>
              AI 대전 전적: <strong style={{ color: goldColor }}>{stats.aiWins}승 {stats.aiLosses}패</strong>
            </div>
          )}
        </div>
      </>
    );
  }

  // 모드 선택 화면
  if (!mode) {
    return (
      <>
        <BackBar title="오목" onBack={onBack} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>⚫</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>오목</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            5개의 돌을 먼저 일렬로 놓으면 승리!
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => setMode('local')} style={{ ...startBtn, background: 'linear-gradient(135deg, #1F2937, #4B5563)' }}>
              📱 같은 기기에서 2인
            </button>
            <button onClick={() => setMode('ai-pick')} style={{ ...startBtn, background: 'linear-gradient(135deg, #8B6914, #C4961A)' }}>
              🤖 컴퓨터 대전
            </button>
          </div>
          {(stats.aiWins + stats.aiLosses + stats.localPlays) > 0 && (
            <div style={{ marginTop: 20, fontSize: 12, color: textSecondary }}>
              {stats.aiWins + stats.aiLosses > 0 && <>AI 전적: <strong style={{ color: goldColor }}>{stats.aiWins}승 {stats.aiLosses}패</strong></>}
              {stats.localPlays > 0 && <> · 로컬 플레이: {stats.localPlays}회</>}
            </div>
          )}
        </div>
      </>
    );
  }

  // 대국 화면
  const maxBoardPx = Math.min(vw - 32, 440);
  const cellSize = Math.floor(maxBoardPx / SIZE);
  const boardSize = cellSize * (SIZE - 1);
  const padding = cellSize;
  const isMyTurn = mode === 'local' || (mode === 'ai' && turn === playerColor && !aiThinking);
  const turnLabel =
    winner
      ? `🎉 ${winner === 'black' ? '⚫ 흑' : '⚪ 백'}${mode === 'ai' ? (winner === aiColor ? ' (AI)' : ' (나)') : ''} 승리!`
      : mode === 'ai'
        ? (aiThinking ? '🤖 AI 생각 중...' : `내 차례 (${playerColor === 'black' ? '⚫ 흑' : '⚪ 백'})`)
        : `${turn === 'black' ? '⚫ 흑' : '⚪ 백'} 차례`;

  return (
    <>
      <BackBar title={mode === 'ai' ? '오목 · AI 대전' : '오목 · 로컬'} onBack={exitMode} dark={dark} />
      <div style={{ padding: 10, maxWidth: 480, margin: '0 auto' }}>
        {/* 턴 표시 */}
        <div style={{
          background: winner ? (dark ? '#78350F' : '#FEF3C7') : cardBg,
          border: `1px solid ${cardBorder}`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: winner ? goldColor : textPrimary }}>
            {turnLabel}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo} disabled={history.length === 0 || !!winner || aiThinking} style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              opacity: (history.length === 0 || winner || aiThinking) ? 0.4 : 1,
            }}>↩ 무르기</button>
            <button onClick={reset} style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
            }}>새 게임</button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: textSecondary, textAlign: 'center', marginBottom: 6 }}>
          {mode === 'ai' && aiColor
            ? <>나: {playerColor === 'black' ? '⚫' : '⚪'} · AI: {aiColor === 'black' ? '⚫' : '⚪'} · {history.length}수</>
            : <>총 {history.length}수</>
          }
        </div>

        {/* 바둑판 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg
            width={boardSize + padding * 2}
            height={boardSize + padding * 2}
            style={{ background: boardColor, borderRadius: 8, display: 'block' }}
          >
            {Array.from({ length: SIZE }).map((_, i) => (
              <g key={`line-${i}`}>
                <line x1={padding} y1={padding + i * cellSize} x2={padding + (SIZE - 1) * cellSize} y2={padding + i * cellSize} stroke={lineColor} strokeWidth={0.8} />
                <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (SIZE - 1) * cellSize} stroke={lineColor} strokeWidth={0.8} />
              </g>
            ))}
            {[[3, 3], [3, 7], [3, 11], [7, 3], [7, 7], [7, 11], [11, 3], [11, 7], [11, 11]].map(([r, c]) => (
              <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={2.5} fill={lineColor} />
            ))}
            {board.map((row, r) => row.map((cell, c) => {
              if (!cell) return null;
              const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
              return (
                <g key={`stone-${r}-${c}`}>
                  <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.42}
                    fill={cell === 'black' ? '#1F2937' : '#F9FAFB'} stroke={cell === 'black' ? '#000' : '#9CA3AF'} strokeWidth={0.8} />
                  {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={3} fill="#EF4444" />}
                </g>
              );
            }))}
            {!winner && board.map((row, r) => row.map((cell, c) => {
              if (cell) return null;
              return (
                <rect key={`click-${r}-${c}`}
                  x={padding + c * cellSize - cellSize / 2} y={padding + r * cellSize - cellSize / 2}
                  width={cellSize} height={cellSize} fill="transparent"
                  style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
                  onClick={() => place(r, c)} />
              );
            }))}
          </svg>
        </div>

        {winner && <div style={{ marginTop: 16 }}><AdBanner /></div>}
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          message="현재 게임을 종료하고 새 게임을 시작할까요?"
          confirmLabel="새 게임"
          dark={dark}
          onConfirm={() => { maybeFireGameOverAd('오목'); doReset(); setShowResetConfirm(false); }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );
}
