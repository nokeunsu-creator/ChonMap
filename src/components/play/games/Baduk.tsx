import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useAndroidBack } from '../../../utils/useAndroidBack';
import { AdBanner } from '../../ads/AdBanner';
import { maybeFireGameOverAd } from '../../ads/GameAd';

type Color = 'black' | 'white';
type Cell = Color | null;
type Board = Cell[][];
type Pos = [number, number];
interface Captures { black: number; white: number }
interface Score {
  black: number; white: number;
  blackStones: number; whiteStones: number;
  blackTerritory: number; whiteTerritory: number;
}
interface HistoryEntry {
  board: Board; turn: Color; captures: Captures; prevBoardStr: string;
}

function createBoard(size: number): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

function getGroup(board: Board, r: number, c: number, size: number): { stones: Pos[]; liberties: number } {
  const color = board[r][c];
  if (!color) return { stones: [], liberties: 0 };
  const visited = new Set<string>();
  const stones: Pos[] = [];
  const liberties = new Set<string>();

  const dfs = (rr: number, cc: number) => {
    const key = `${rr},${cc}`;
    if (visited.has(key)) return;
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) return;
    if (board[rr][cc] === null) { liberties.add(key); return; }
    if (board[rr][cc] !== color) return;
    visited.add(key);
    stones.push([rr, cc]);
    dfs(rr - 1, cc); dfs(rr + 1, cc); dfs(rr, cc - 1); dfs(rr, cc + 1);
  };
  dfs(r, c);
  return { stones, liberties: liberties.size };
}

function removeDeadStones(board: Board, color: Color, size: number): { board: Board; captured: number } {
  const newBoard = board.map(row => [...row]);
  let captured = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (newBoard[r][c] === color) {
        const group = getGroup(newBoard, r, c, size);
        if (group.liberties === 0) {
          group.stones.forEach(([sr, sc]) => { newBoard[sr][sc] = null; });
          captured += group.stones.length;
        }
      }
    }
  }
  return { board: newBoard, captured };
}

function boardToString(board: Board): string {
  return board.map(row => row.map(c => c || '.').join('')).join('|');
}

function countTerritory(board: Board, size: number): Score {
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  let blackTerritory = 0, whiteTerritory = 0, blackStones = 0, whiteStones = 0;

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') blackStones++;
      else if (board[r][c] === 'white') whiteStones++;
    }

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null || visited[r][c]) continue;
      const territory: Pos[] = [];
      let touchBlack = false, touchWhite = false;

      const dfs = (rr: number, cc: number) => {
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) return;
        if (visited[rr][cc]) return;
        if (board[rr][cc] === 'black') { touchBlack = true; return; }
        if (board[rr][cc] === 'white') { touchWhite = true; return; }
        visited[rr][cc] = true;
        territory.push([rr, cc]);
        dfs(rr - 1, cc); dfs(rr + 1, cc); dfs(rr, cc - 1); dfs(rr, cc + 1);
      };
      dfs(r, c);
      if (touchBlack && !touchWhite) blackTerritory += territory.length;
      else if (touchWhite && !touchBlack) whiteTerritory += territory.length;
    }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory + 6.5,
    blackStones, whiteStones, blackTerritory, whiteTerritory,
  };
}

const STAR_POINTS: Record<number, Pos[]> = {
  9: [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]],
  13: [[3, 3], [3, 6], [3, 9], [6, 3], [6, 6], [6, 9], [9, 3], [9, 6], [9, 9]],
  19: [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]],
};

// ============================================================
// AI Engine
// ============================================================

const DIRS: Pos[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function isLegalMove(board: Board, r: number, c: number, color: Color, size: number, prevBoardStr: string): boolean {
  if (r < 0 || r >= size || c < 0 || c >= size) return false;
  if (board[r][c] !== null) return false;
  const testBoard = board.map(row => [...row]);
  testBoard[r][c] = color;
  const opp: Color = color === 'black' ? 'white' : 'black';
  const afterCapture = removeDeadStones(testBoard, opp, size);
  const newBoard = afterCapture.board;
  const selfGroup = getGroup(newBoard, r, c, size);
  if (selfGroup.liberties === 0) return false;
  if (prevBoardStr && boardToString(newBoard) === prevBoardStr) return false;
  return true;
}

function simulateMove(board: Board, r: number, c: number, color: Color, size: number): { board: Board; captured: number } {
  const testBoard = board.map(row => [...row]);
  testBoard[r][c] = color;
  const opp: Color = color === 'black' ? 'white' : 'black';
  return removeDeadStones(testBoard, opp, size);
}

function getCandidateMoves(board: Board, size: number, radius: number): Pos[] {
  const hasStones: Pos[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] !== null) hasStones.push([r, c]);

  if (hasStones.length === 0) {
    const center = Math.floor(size / 2);
    const moves: Pos[] = [[center, center]];
    (STAR_POINTS[size] || []).forEach(p => moves.push(p));
    return moves;
  }

  const candidates = new Set<string>();
  for (const [sr, sc] of hasStones) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = sr + dr, nc = sc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
          candidates.add(`${nr},${nc}`);
        }
      }
    }
  }
  return Array.from(candidates).map(s => s.split(',').map(Number) as Pos);
}

function findCaptures(board: Board, color: Color, size: number, candidates: Pos[], prevBoardStr: string) {
  const captureMoves: { r: number; c: number; captured: number }[] = [];
  for (const [r, c] of candidates) {
    if (!isLegalMove(board, r, c, color, size, prevBoardStr)) continue;
    const result = simulateMove(board, r, c, color, size);
    if (result.captured > 0) captureMoves.push({ r, c, captured: result.captured });
  }
  captureMoves.sort((a, b) => b.captured - a.captured);
  return captureMoves;
}

function findSaveMoves(board: Board, color: Color, size: number, _candidates: Pos[], prevBoardStr: string): Pos[] {
  const saves: Pos[] = [];
  const checked = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== color) continue;
      const key = `${r},${c}`;
      if (checked.has(key)) continue;
      const group = getGroup(board, r, c, size);
      group.stones.forEach(([sr, sc]) => checked.add(`${sr},${sc}`));
      if (group.liberties === 1) {
        for (const [sr, sc] of group.stones) {
          for (const [dr, dc] of DIRS) {
            const nr = sr + dr, nc = sc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
              if (isLegalMove(board, nr, nc, color, size, prevBoardStr)) {
                saves.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }
  return saves;
}

function evaluateTerritory(board: Board, size: number, color: Color): number {
  const opp: Color = color === 'black' ? 'white' : 'black';
  let myInfluence = 0, oppInfluence = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue;
      let myAdj = 0, oppAdj = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (board[nr][nc] === color) myAdj++;
          else if (board[nr][nc] === opp) oppAdj++;
        }
      }
      if (myAdj > 0 && oppAdj === 0) myInfluence++;
      else if (oppAdj > 0 && myAdj === 0) oppInfluence++;
    }
  }
  return myInfluence - oppInfluence;
}

function scoreMoveByTerritory(board: Board, r: number, c: number, color: Color, size: number): number {
  const result = simulateMove(board, r, c, color, size);
  return evaluateTerritory(result.board, size, color);
}

function isInOpponentTerritory(board: Board, r: number, c: number, color: Color, size: number): boolean {
  const opp: Color = color === 'black' ? 'white' : 'black';
  let oppAdj = 0, myAdj = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      if (board[nr][nc] === opp) oppAdj++;
      else if (board[nr][nc] === color) myAdj++;
    }
  }
  return oppAdj >= 3 && myAdj === 0;
}

function isNearExistingGroup(board: Board, r: number, c: number, color: Color, size: number): boolean {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === color) return true;
    }
  }
  return false;
}

function advancedEval(board: Board, r: number, c: number, color: Color, size: number, _prevBoardStr: string): number {
  const result = simulateMove(board, r, c, color, size);
  let score = 0;
  score += evaluateTerritory(result.board, size, color) * 2;
  score += result.captured * 10;
  const group = getGroup(result.board, r, c, size);
  score += Math.min(group.liberties, 6) * 2;
  score += Math.min(group.stones.length, 8);
  if (isNearExistingGroup(board, r, c, color, size)) score += 3;
  if (isInOpponentTerritory(board, r, c, color, size)) score -= 8;
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 2;
  if (group.liberties === 1 && result.captured === 0) score -= 15;
  return score;
}

function getAiMove(board: Board, size: number, aiLevel: number, prevBoardStr: string): Pos | null {
  const color: Color = 'white';
  const opp: Color = 'black';
  const radius = aiLevel >= 7 ? 3 : 2;
  const allCandidates = getCandidateMoves(board, size, radius);
  const legalMoves = allCandidates.filter(([r, c]) => isLegalMove(board, r, c, color, size, prevBoardStr));

  if (legalMoves.length === 0) return null;

  if (aiLevel <= 2) {
    const decent = legalMoves.filter(([r, c]) => {
      const result = simulateMove(board, r, c, color, size);
      const selfGroup = getGroup(result.board, r, c, size);
      return selfGroup.liberties >= 2 || result.captured > 0;
    });
    const pool = decent.length > 0 ? decent : legalMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (aiLevel <= 4) {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr);
    if (captures.length > 0) {
      if (aiLevel === 3) return [captures[0].r, captures[0].c];
      const top2 = captures.slice(0, Math.min(2, captures.length));
      const pick = top2[Math.floor(Math.random() * top2.length)];
      return [pick.r, pick.c];
    }
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr);
    if (saves.length > 0) return saves[Math.floor(Math.random() * saves.length)];

    const decent = legalMoves.filter(([r, c]) => {
      const result = simulateMove(board, r, c, color, size);
      const selfGroup = getGroup(result.board, r, c, size);
      return selfGroup.liberties >= 2 || result.captured > 0;
    });
    const pool = decent.length > 0 ? decent : legalMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (aiLevel <= 6) {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr);
    if (captures.length > 0) return [captures[0].r, captures[0].c];
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr);
    if (saves.length > 0) return saves[0];

    const scored = legalMoves
      .filter(([r, c]) => !isInOpponentTerritory(board, r, c, color, size))
      .map(([r, c]) => ({ r, c, score: scoreMoveByTerritory(board, r, c, color, size) }));
    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const topN = Math.min(aiLevel === 5 ? 5 : 3, scored.length);
    const pick = scored[Math.floor(Math.random() * topN)];
    return [pick.r, pick.c];
  }

  if (aiLevel <= 8) {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr);
    if (captures.length > 0 && captures[0].captured >= 2) return [captures[0].r, captures[0].c];
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr);
    if (saves.length > 0) return saves[0];

    const scored = legalMoves.map(([r, c]) => ({ r, c, score: advancedEval(board, r, c, color, size, prevBoardStr) }));
    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) return null;
    const topN = aiLevel === 7 ? Math.min(3, scored.length) : 1;
    const pick = scored[Math.floor(Math.random() * topN)];
    return [pick.r, pick.c];
  }

  // Level 9-10
  {
    const captures = findCaptures(board, color, size, legalMoves, prevBoardStr);
    if (captures.length > 0 && captures[0].captured >= 3) return [captures[0].r, captures[0].c];
    const saves = findSaveMoves(board, color, size, legalMoves, prevBoardStr);
    if (saves.length > 0) return saves[0];

    const scored = legalMoves.map(([r, c]) => {
      let score = advancedEval(board, r, c, color, size, prevBoardStr);
      if (aiLevel === 10) {
        const result = simulateMove(board, r, c, color, size);
        const oppMoves = getCandidateMoves(result.board, size, 2)
          .filter(([or, oc]) => isLegalMove(result.board, or, oc, opp, size, ''))
          .slice(0, 8);
        let bestOppScore = -Infinity;
        for (const [or, oc] of oppMoves) {
          const oppResult = simulateMove(result.board, or, oc, opp, size);
          const oppScore = evaluateTerritory(oppResult.board, size, opp) + oppResult.captured * 5;
          if (oppScore > bestOppScore) bestOppScore = oppScore;
        }
        if (bestOppScore > -Infinity) score -= bestOppScore * 0.5;
      }
      return { r, c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) return null;
    return [scored[0].r, scored[0].c];
  }
}

// ============================================================
// UI
// ============================================================

type Mode = null | 'pick-mode' | 'local' | 'ai';

interface AiLevelGroup { range: string; label: string; levels: number[] }
const AI_LEVEL_LABELS: AiLevelGroup[] = [
  { range: '1-2', label: '입문', levels: [1, 2] },
  { range: '3-4', label: '초급', levels: [3, 4] },
  { range: '5-6', label: '중급', levels: [5, 6] },
  { range: '7-8', label: '상급', levels: [7, 8] },
  { range: '9-10', label: '고수', levels: [9, 10] },
];

function getLevelColor(level: number): string {
  const colors = [
    '#2ECC71', '#27AE60',
    '#F1C40F', '#F39C12',
    '#E67E22', '#D35400',
    '#E74C3C', '#C0392B',
    '#8E44AD', '#6C3483',
  ];
  return colors[level - 1] || '#333';
}

function getLevelLabel(level: number): string {
  if (level <= 2) return '입문';
  if (level <= 4) return '초급';
  if (level <= 6) return '중급';
  if (level <= 8) return '상급';
  return '고수';
}

const STORAGE_KEY = 'chonmap.game.baduk';
interface Stats { aiWinsByLevel: Record<number, number>; aiLossesByLevel: Record<number, number>; localPlays: number }
function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { aiWinsByLevel: {}, aiLossesByLevel: {}, localPlays: 0, ...JSON.parse(r) }; } catch {}
  return { aiWinsByLevel: {}, aiLossesByLevel: {}, localPlays: 0 };
}
function saveStats(s: Stats) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

export function Baduk({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [mode, setMode] = useState<Mode>(null);
  const [size, setSize] = useState<number | null>(null);
  const [aiLevel, setAiLevel] = useState<number | null>(null);
  const [board, setBoard] = useState<Board>([]);
  const [turn, setTurn] = useState<Color>('black');
  const [captures, setCaptures] = useState<Captures>({ black: 0, white: 0 });
  const [lastMove, setLastMove] = useState<Pos | null>(null);
  const [prevBoardStr, setPrevBoardStr] = useState('');
  const [passCount, setPassCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [message, setMessage] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const statsRecordedRef = useRef(false);

  const aiThinkingRef = useRef(false);
  const aiTimerRef = useRef<number | null>(null);

  const opponent: Color = turn === 'black' ? 'white' : 'black';

  // 뷰포트 너비
  const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 400);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // AI 턴 자동 수행
  useEffect(() => {
    if (mode !== 'ai' || turn !== 'white' || gameOver) return;
    if (!size || board.length === 0 || aiLevel === null) return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    const delay = aiLevel <= 4 ? 300 : aiLevel <= 6 ? 400 : 500;

    const timer = window.setTimeout(() => {
      try {
        const move = getAiMove(board, size, aiLevel, prevBoardStr);
        if (move === null) {
          const newPassCount = passCount + 1;
          if (newPassCount >= 2) {
            const newScore = countTerritory(board, size);
            setScore(newScore);
            setGameOver(true);
            setMessage('');
          } else {
            setPassCount(newPassCount);
            setTurn('black');
            setMessage('⚪ 백(AI) 패스');
          }
        } else {
          const [r, c] = move;
          const testBoard = board.map(row => [...row]);
          testBoard[r][c] = 'white';
          const afterCapture = removeDeadStones(testBoard, 'black', size);
          const newBoard = afterCapture.board;
          const newCaptured = afterCapture.captured;
          const newCaptures: Captures = { ...captures, white: captures.white + newCaptured };
          const newPrevBoardStr = boardToString(board);

          setHistory(prev => [...prev, { board: board.map(row => [...row]), turn: 'white', captures: { ...captures }, prevBoardStr }]);
          setPrevBoardStr(newPrevBoardStr);
          setBoard(newBoard);
          setLastMove([r, c]);
          setCaptures(newCaptures);
          setPassCount(0);
          setTurn('black');
          setMessage('');
        }
      } catch (e) {
        console.error('AI error:', e);
      }
      aiThinkingRef.current = false;
      setAiThinking(false);
    }, delay);

    aiTimerRef.current = timer;
    return () => { window.clearTimeout(timer); };
  }, [mode, turn, gameOver, board, size, aiLevel, prevBoardStr, passCount, captures]);

  // 승리 기록
  useEffect(() => {
    if (!gameOver || !score) { statsRecordedRef.current = false; return; }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;

    if (mode === 'ai' && aiLevel != null) {
      const newStats: Stats = {
        aiWinsByLevel: { ...stats.aiWinsByLevel },
        aiLossesByLevel: { ...stats.aiLossesByLevel },
        localPlays: stats.localPlays,
      };
      if (score.black > score.white) newStats.aiWinsByLevel[aiLevel] = (newStats.aiWinsByLevel[aiLevel] || 0) + 1;
      else newStats.aiLossesByLevel[aiLevel] = (newStats.aiLossesByLevel[aiLevel] || 0) + 1;
      setStats(newStats);
      saveStats(newStats);
    } else if (mode === 'local') {
      const newStats: Stats = { ...stats, localPlays: stats.localPlays + 1 };
      setStats(newStats);
      saveStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, score]);

  const startGame = (s: number) => {
    setSize(s);
    setBoard(createBoard(s));
    setTurn('black');
    setCaptures({ black: 0, white: 0 });
    setLastMove(null);
    setPrevBoardStr('');
    setPassCount(0);
    setGameOver(false);
    setScore(null);
    setHistory([]);
    setMessage('');
    setAiThinking(false);
    statsRecordedRef.current = false;
  };

  const place = useCallback((r: number, c: number) => {
    if (!size || board[r][c] || gameOver) return;
    if (mode === 'ai') {
      if (turn !== 'black' || aiThinking) return;
    }

    const testBoard = board.map(row => [...row]);
    testBoard[r][c] = turn;
    const afterCapture = removeDeadStones(testBoard, opponent, size);
    const newBoard = afterCapture.board;
    const newCaptured = afterCapture.captured;

    const selfGroup = getGroup(newBoard, r, c, size);
    if (selfGroup.liberties === 0) {
      setMessage('자충수! 놓을 수 없어요');
      window.setTimeout(() => setMessage(''), 1500);
      return;
    }

    const newBoardStr = boardToString(newBoard);
    if (newBoardStr === prevBoardStr) {
      setMessage('패! 같은 형태 반복 금지');
      window.setTimeout(() => setMessage(''), 1500);
      return;
    }

    const newCaptures: Captures = { ...captures, [turn]: captures[turn] + newCaptured };
    const newPrevBoardStr = boardToString(board);

    setHistory(prev => [...prev, { board: board.map(row => [...row]), turn, captures: { ...captures }, prevBoardStr }]);
    setPrevBoardStr(newPrevBoardStr);
    setBoard(newBoard);
    setLastMove([r, c]);
    setCaptures(newCaptures);
    setPassCount(0);
    setTurn(opponent);
    setMessage('');
  }, [board, turn, opponent, gameOver, prevBoardStr, captures, size, mode, aiThinking]);

  const pass = () => {
    if (gameOver || !size) return;
    if (mode === 'ai' && (turn !== 'black' || aiThinking)) return;

    const newPassCount = passCount + 1;
    setHistory(prev => [...prev, { board: board.map(row => [...row]), turn, captures: { ...captures }, prevBoardStr }]);
    setPassCount(newPassCount);
    setTurn(opponent);
    setMessage(`${turn === 'black' ? '⚫ 흑' : '⚪ 백'} 패스`);
    if (newPassCount >= 2) {
      const newScore = countTerritory(board, size);
      setScore(newScore);
      setGameOver(true);
      setMessage('');
    }
  };

  const undo = () => {
    if (history.length === 0 || gameOver) return;
    if (mode === 'ai' && aiThinking) return;

    if (mode === 'ai' && history.length >= 2) {
      const prev = history[history.length - 2];
      setBoard(prev.board);
      setTurn(prev.turn);
      setCaptures(prev.captures);
      setPrevBoardStr(prev.prevBoardStr);
      setHistory(history.slice(0, -2));
    } else {
      const last = history[history.length - 1];
      setBoard(last.board);
      setTurn(last.turn);
      setCaptures(last.captures);
      setPrevBoardStr(last.prevBoardStr);
      setHistory(history.slice(0, -1));
    }
    setPassCount(0);
    setLastMove(null);
    setMessage('');
  };

  const doReset = () => { if (size) startGame(size); };
  const resetGame = () => setShowResetConfirm(true);

  const exitToHome = () => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    setMode(null);
    setSize(null);
    setAiLevel(null);
    setBoard([]);
    setGameOver(false);
    setScore(null);
    setHistory([]);
  };

  // 안드로이드 뒤로가기: 상단 화살표 로직과 동일하게 한 단계씩 위로
  const smartBack = () => {
    if (mode === 'ai' && size !== null && aiLevel !== null) { setAiLevel(null); return; }
    if (mode === 'ai' && size !== null && aiLevel === null) { setSize(null); return; }
    if (mode === 'ai' && size === null) { setMode(null); return; }
    if (mode === 'local' && size !== null) { setSize(null); setBoard([]); setGameOver(false); setScore(null); setHistory([]); return; }
    if (mode === 'local' && size === null) { setMode(null); return; }
    setMode(null);
  };
  useAndroidBack(mode !== null, smartBack);

  // 테마 색
  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const boardColor = dark ? '#92400E' : '#DCB35C';
  const lineColor = dark ? '#3E2723' : '#8B6914';

  const modeBtn: React.CSSProperties = {
    padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, color: 'white',
  };

  // 1) 모드 선택
  if (!mode) {
    return (
      <>
        <BackBar title="바둑" onBack={onBack} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>⚪</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>바둑</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            집이 많은 쪽이 승리하는 전략 게임
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => setMode('ai')} style={{ ...modeBtn, background: 'linear-gradient(135deg, #8E44AD, #6C3483)' }}>
              🤖 컴퓨터 대전 (10단계)
            </button>
            <button onClick={() => setMode('local')} style={{ ...modeBtn, background: 'linear-gradient(135deg, #1F2937, #4B5563)' }}>
              📱 같은 기기에서 2인
            </button>
          </div>
          {(stats.localPlays > 0 || Object.keys(stats.aiWinsByLevel).length > 0) && (
            <div style={{ marginTop: 20, fontSize: 12, color: textSecondary }}>
              {stats.localPlays > 0 && <>로컬 {stats.localPlays}회</>}
              {Object.keys(stats.aiWinsByLevel).length > 0 && (
                <div style={{ marginTop: 4 }}>
                  AI 승리: {Object.entries(stats.aiWinsByLevel).map(([lv, n]) => `Lv${lv} ${n}`).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // 2) AI 모드: 크기 선택
  if (mode === 'ai' && !size) {
    return (
      <>
        <BackBar title="바둑 · 컴퓨터 대전" onBack={() => setMode(null)} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>🤖</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>판 크기</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>작을수록 한 판이 빨리 끝납니다</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => setSize(9)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
              9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
            </button>
            <button onClick={() => setSize(13)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
              13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
            </button>
            <button onClick={() => setSize(19)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #1F2937, #4B5563)' }}>
              19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // 3) AI 모드: 레벨 선택
  if (mode === 'ai' && size && aiLevel === null) {
    return (
      <>
        <BackBar title={`바둑 · ${size}×${size}`} onBack={() => setSize(null)} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>🤖</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>난이도 선택</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>{size}×{size} · 나는 ⚫ 흑 (선공)</div>
          <div style={{ maxWidth: 320, margin: '20px auto 0' }}>
            {AI_LEVEL_LABELS.map(({ range, label, levels }) => (
              <div key={range} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: textSecondary, marginBottom: 4, textAlign: 'left', paddingLeft: 4 }}>
                  {label}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {levels.map(lv => {
                    const wins = stats.aiWinsByLevel[lv] || 0;
                    const losses = stats.aiLossesByLevel[lv] || 0;
                    return (
                      <button key={lv} onClick={() => { setAiLevel(lv); startGame(size); }}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                          fontSize: 18, fontWeight: 700, color: '#FFF',
                          background: getLevelColor(lv),
                          boxShadow: `0 2px 8px ${getLevelColor(lv)}44`,
                          position: 'relative',
                        }}>
                        {lv}
                        {(wins > 0 || losses > 0) && (
                          <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.9 }}>
                            {wins}승 {losses}패
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // 4) 로컬 모드: 크기 선택
  if (mode === 'local' && !size) {
    return (
      <>
        <BackBar title="바둑 · 로컬" onBack={() => setMode(null)} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>⚪</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>판 크기</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => startGame(9)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #06D6A0, #05B384)' }}>
              9×9 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>입문</span>
            </button>
            <button onClick={() => startGame(13)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
              13×13 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>중급</span>
            </button>
            <button onClick={() => startGame(19)} style={{ ...modeBtn, background: 'linear-gradient(135deg, #1F2937, #4B5563)' }}>
              19×19 <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>정식</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!size) return null;

  // 5) 대국 화면
  const isPC = vw >= 768;
  const maxCell = isPC
    ? (size === 19 ? 36 : size === 13 ? 50 : 64)
    : (size === 19 ? 20 : size === 13 ? 28 : 38);
  const effectiveWidth = isPC ? Math.min(vw - 40, 900) : vw - 32;
  const cellSize = Math.min(Math.floor(effectiveWidth / size), maxCell);
  const boardPx = cellSize * (size - 1);
  const padding = cellSize;

  const turnLabel = (() => {
    if (gameOver) return '종료';
    if (mode === 'ai') {
      if (aiThinking) return 'AI 생각중...';
      return turn === 'black' ? '내 차례' : 'AI 차례';
    }
    return `${turn === 'black' ? '흑' : '백'} 차례`;
  })();

  return (
    <>
      <BackBar
        title={mode === 'ai' ? `바둑 · ${size}×${size} · Lv.${aiLevel}` : `바둑 · ${size}×${size}`}
        onBack={exitToHome}
        dark={dark}
      />
      <div style={{ paddingBottom: 12, maxWidth: 520, margin: '0 auto' }}>
        {/* 정보 바 */}
        <div style={{
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '10px 16px',
          background: cardBg, borderBottom: `1px solid ${cardBorder}`,
          fontSize: 13, color: textPrimary,
        }}>
          <div style={{ textAlign: 'center', fontWeight: turn === 'black' && !gameOver ? 700 : 400 }}>
            ⚫ 흑{mode === 'ai' ? '(나)' : ''}
            <div style={{ fontSize: 11, color: textSecondary }}>잡은돌 {captures.black}</div>
          </div>
          <div style={{
            padding: '4px 14px', borderRadius: 12,
            background: gameOver ? '#F1C40F'
              : aiThinking ? '#8E44AD'
              : turn === 'black' ? (dark ? '#1F2937' : '#1F2937')
              : (dark ? '#F9FAFB' : '#FFF'),
            color: gameOver ? '#111'
              : aiThinking ? '#FFF'
              : turn === 'black' ? '#FFF'
              : '#1F2937',
            border: `1px solid ${cardBorder}`, fontSize: 12, fontWeight: 600,
          }}>
            {turnLabel}
          </div>
          <div style={{ textAlign: 'center', fontWeight: turn === 'white' && !gameOver ? 700 : 400 }}>
            ⚪ 백{mode === 'ai' ? '(AI)' : ''}
            <div style={{ fontSize: 11, color: textSecondary }}>잡은돌 {captures.white}</div>
          </div>
        </div>

        {/* 컨트롤 */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6,
          padding: '6px 0', background: cardBg,
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <button onClick={undo} disabled={history.length === 0 || gameOver || aiThinking}
            style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              opacity: (history.length === 0 || gameOver || aiThinking) ? 0.4 : 1,
            }}>↩ 무르기</button>
          <button onClick={resetGame}
            style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
            }}>새 게임</button>
        </div>

        {message && (
          <div style={{
            textAlign: 'center', padding: '6px 0', fontSize: 13, fontWeight: 600,
            color: dark ? '#FCA5A5' : '#B91C1C',
            background: dark ? '#450A0A' : '#FEE2E2',
          }}>
            {message}
          </div>
        )}

        {/* 바둑판 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
          <svg
            width={boardPx + padding * 2}
            height={boardPx + padding * 2}
            style={{ background: boardColor, borderRadius: 8, display: 'block' }}
          >
            {Array.from({ length: size }).map((_, i) => (
              <g key={`line-${i}`}>
                <line x1={padding} y1={padding + i * cellSize} x2={padding + (size - 1) * cellSize} y2={padding + i * cellSize} stroke={lineColor} strokeWidth={0.8} />
                <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={padding + (size - 1) * cellSize} stroke={lineColor} strokeWidth={0.8} />
              </g>
            ))}
            {(STAR_POINTS[size] || []).map(([r, c]) => (
              <circle key={`dot-${r}-${c}`} cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 2.5} fill={lineColor} />
            ))}
            {board.map((row, r) => row.map((cell, c) => {
              if (!cell) return null;
              const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
              return (
                <g key={`stone-${r}-${c}`}>
                  <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={cellSize * 0.44}
                    fill={cell === 'black' ? '#1F2937' : '#F9FAFB'} stroke={cell === 'black' ? '#000' : '#9CA3AF'} strokeWidth={0.8} />
                  {isLast && <circle cx={padding + c * cellSize} cy={padding + r * cellSize} r={size === 19 ? 2 : 3} fill="#EF4444" />}
                </g>
              );
            }))}
            {!gameOver && board.map((row, r) => row.map((cell, c) => {
              if (cell) return null;
              const clickable = mode === 'ai' ? (turn === 'black' && !aiThinking) : true;
              return (
                <rect key={`click-${r}-${c}`}
                  x={padding + c * cellSize - cellSize / 2} y={padding + r * cellSize - cellSize / 2}
                  width={cellSize} height={cellSize} fill="transparent"
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                  onClick={() => place(r, c)} />
              );
            }))}
          </svg>
        </div>

        {!gameOver && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <button onClick={pass} disabled={mode === 'ai' && (turn !== 'black' || aiThinking)}
              style={{
                padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: (mode === 'ai' && (turn !== 'black' || aiThinking))
                  ? (dark ? '#4B5563' : '#CBD5E1')
                  : (dark ? '#4B5563' : '#6B7280'),
                color: '#FFF', fontSize: 14, fontWeight: 600,
              }}>
              패스{passCount >= 1 ? ' (양쪽 패스 시 종료)' : ''}
            </button>
          </div>
        )}

        {gameOver && score && (
          <div style={{
            margin: '12px 12px', padding: 20, borderRadius: 14,
            background: dark ? 'linear-gradient(135deg, #78350F, #92400E)' : 'linear-gradient(135deg, #FFF9E6, #FEF3C7)',
            border: `2px solid ${dark ? '#FBBF24' : '#F59E0B'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: dark ? '#FDE68A' : '#78350F' }}>
              {score.black > score.white
                ? mode === 'ai' ? '⚫ 승리! AI를 이겼습니다!' : '⚫ 흑 승리!'
                : mode === 'ai' ? '⚪ AI 승리! 다시 도전하세요!' : '⚪ 백 승리!'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, fontSize: 13, color: dark ? '#FDE68A' : '#78350F' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{score.black}</div>
                <div>⚫ 흑{mode === 'ai' ? '(나)' : ''}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>돌 {score.blackStones} + 집 {score.blackTerritory}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{score.white}</div>
                <div>⚪ 백{mode === 'ai' ? '(AI)' : ''}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>돌 {score.whiteStones} + 집 {score.whiteTerritory} + 덤6.5</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { maybeFireGameOverAd('바둑'); startGame(size); }}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: goldColor, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                다시 하기
              </button>
              {mode === 'local' && (
                <button onClick={() => setSize(null)}
                  style={{ padding: '10px 24px', borderRadius: 10, border: `1px solid ${cardBorder}`, cursor: 'pointer', background: 'transparent', color: textSecondary, fontSize: 14, fontWeight: 600 }}>
                  크기 변경
                </button>
              )}
              {mode === 'ai' && (
                <button onClick={() => { setAiLevel(null); setSize(null); }}
                  style={{ padding: '10px 24px', borderRadius: 10, border: `1px solid ${cardBorder}`, cursor: 'pointer', background: 'transparent', color: textSecondary, fontSize: 14, fontWeight: 600 }}>
                  난이도 변경
                </button>
              )}
            </div>
            {mode === 'ai' && aiLevel != null && (
              <div style={{ marginTop: 12, fontSize: 11, color: dark ? '#FDE68A' : '#78350F', opacity: 0.8 }}>
                Lv.{aiLevel} ({getLevelLabel(aiLevel)})
              </div>
            )}
            <div style={{ marginTop: 16 }}><AdBanner /></div>
          </div>
        )}
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          message="현재 게임을 종료하고 새 게임을 시작할까요?"
          confirmLabel="새 게임"
          dark={dark}
          onConfirm={() => { doReset(); setShowResetConfirm(false); }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );
}
