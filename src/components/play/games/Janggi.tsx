import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useAndroidBack } from '../../../utils/useAndroidBack';

// ─── Constants ───────────────────────────────────────────────────────────────
const ROWS = 10;
const COLS = 9;

type Side = 'cho' | 'han';
type PieceType = 'king' | 'chariot' | 'cannon' | 'horse' | 'elephant' | 'advisor' | 'soldier';
interface Piece { type: PieceType; side: Side }
type Cell = Piece | null;
type Board = Cell[][];
type Pos = [number, number];
type Move = [number, number, number, number];
interface HistoryEntry { board: Board; turn: Side; lastMove: MoveInfo | null; inCheck: Side | null }
interface MoveInfo { from: Pos; to: Pos }

const CHO: Side = 'cho';
const HAN: Side = 'han';

const KING: PieceType = 'king';
const CHARIOT: PieceType = 'chariot';
const CANNON: PieceType = 'cannon';
const HORSE: PieceType = 'horse';
const ELEPHANT: PieceType = 'elephant';
const ADVISOR: PieceType = 'advisor';
const SOLDIER: PieceType = 'soldier';

const PIECE_NAMES: Record<PieceType, Record<Side, string>> = {
  king:     { cho: '楚', han: '漢' },
  chariot:  { cho: '車', han: '車' },
  cannon:   { cho: '包', han: '包' },
  horse:    { cho: '馬', han: '馬' },
  elephant: { cho: '象', han: '象' },
  advisor:  { cho: '士', han: '士' },
  soldier:  { cho: '兵', han: '卒' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  king: 0, chariot: 13, cannon: 7, horse: 5, elephant: 3, advisor: 3, soldier: 2,
};

interface PalaceBounds { rMin: number; rMax: number; cMin: number; cMax: number }
const PALACES: Record<Side, PalaceBounds> = {
  cho: { rMin: 7, rMax: 9, cMin: 3, cMax: 5 },
  han: { rMin: 0, rMax: 2, cMin: 3, cMax: 5 },
};

// ─── Initial Board Setup ─────────────────────────────────────────────────────
function createInitialBoard(): Board {
  const board: Board = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
  // HAN
  board[0][0] = { type: CHARIOT, side: HAN };
  board[0][1] = { type: ELEPHANT, side: HAN };
  board[0][2] = { type: HORSE, side: HAN };
  board[0][3] = { type: ADVISOR, side: HAN };
  board[0][5] = { type: ADVISOR, side: HAN };
  board[0][6] = { type: ELEPHANT, side: HAN };
  board[0][7] = { type: HORSE, side: HAN };
  board[0][8] = { type: CHARIOT, side: HAN };
  board[1][4] = { type: KING, side: HAN };
  board[2][1] = { type: CANNON, side: HAN };
  board[2][7] = { type: CANNON, side: HAN };
  board[3][0] = { type: SOLDIER, side: HAN };
  board[3][2] = { type: SOLDIER, side: HAN };
  board[3][4] = { type: SOLDIER, side: HAN };
  board[3][6] = { type: SOLDIER, side: HAN };
  board[3][8] = { type: SOLDIER, side: HAN };
  // CHO
  board[9][0] = { type: CHARIOT, side: CHO };
  board[9][1] = { type: ELEPHANT, side: CHO };
  board[9][2] = { type: HORSE, side: CHO };
  board[9][3] = { type: ADVISOR, side: CHO };
  board[9][5] = { type: ADVISOR, side: CHO };
  board[9][6] = { type: ELEPHANT, side: CHO };
  board[9][7] = { type: HORSE, side: CHO };
  board[9][8] = { type: CHARIOT, side: CHO };
  board[8][4] = { type: KING, side: CHO };
  board[7][1] = { type: CANNON, side: CHO };
  board[7][7] = { type: CANNON, side: CHO };
  board[6][0] = { type: SOLDIER, side: CHO };
  board[6][2] = { type: SOLDIER, side: CHO };
  board[6][4] = { type: SOLDIER, side: CHO };
  board[6][6] = { type: SOLDIER, side: CHO };
  board[6][8] = { type: SOLDIER, side: CHO };
  return board;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function inPalace(r: number, c: number, side: Side): boolean {
  const p = PALACES[side];
  return r >= p.rMin && r <= p.rMax && c >= p.cMin && c <= p.cMax;
}

function isPalaceDiagonal(r1: number, c1: number, r2: number, c2: number, side: Side): boolean {
  const p = PALACES[side];
  const cr = p.rMin + 1, cc = p.cMin + 1;
  if (!inPalace(r1, c1, side) || !inPalace(r2, c2, side)) return false;
  if (Math.abs(r2 - r1) !== 1 || Math.abs(c2 - c1) !== 1) return false;
  if ((r1 === cr && c1 === cc) || (r2 === cr && c2 === cc)) return true;
  return false;
}

// ─── Movement Logic ──────────────────────────────────────────────────────────
function getKingMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as Pos[]) {
    const nr = r + dr, nc = c + dc;
    if (inPalace(nr, nc, side)) {
      const target = board[nr][nc];
      if (!target || target.side !== side) moves.push([nr, nc]);
    }
  }
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pos[]) {
    const nr = r + dr, nc = c + dc;
    if (isPalaceDiagonal(r, c, nr, nc, side)) {
      const target = board[nr][nc];
      if (!target || target.side !== side) moves.push([nr, nc]);
    }
  }
  return moves;
}

const getAdvisorMoves = getKingMoves;

function getChariotMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as Pos[]) {
    for (let i = 1; i < 10; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      const target = board[nr][nc];
      if (!target) { moves.push([nr, nc]); continue; }
      if (target.side !== side) moves.push([nr, nc]);
      break;
    }
  }
  const palaceSide: Side | null = inPalace(r, c, CHO) ? CHO : inPalace(r, c, HAN) ? HAN : null;
  if (palaceSide) {
    const p = PALACES[palaceSide];
    const cr = p.rMin + 1, cc = p.cMin + 1;
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pos[]) {
      if (r === cr && c === cc) {
        const nr = r + dr, nc = c + dc;
        if (inPalace(nr, nc, palaceSide)) {
          const target = board[nr][nc];
          if (!target || target.side !== side) moves.push([nr, nc]);
        }
      } else if (r !== cr && c !== cc) {
        const mr = r + dr, mc = c + dc;
        if (mr === cr && mc === cc) {
          const centerPiece = board[mr][mc];
          if (!centerPiece) {
            const nr = mr + dr, nc = mc + dc;
            if (inPalace(nr, nc, palaceSide)) {
              const target = board[nr][nc];
              if (!target || target.side !== side) moves.push([nr, nc]);
            }
          }
          if (!centerPiece || centerPiece.side !== side) moves.push([mr, mc]);
        }
      }
    }
  }
  return moves;
}

function getCannonMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as Pos[]) {
    let jumped = false;
    for (let i = 1; i < 10; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      const target = board[nr][nc];
      if (!jumped) {
        if (target) {
          if (target.type === CANNON) break;
          jumped = true;
        }
      } else {
        if (target) {
          if (target.side !== side && target.type !== CANNON) moves.push([nr, nc]);
          break;
        }
        moves.push([nr, nc]);
      }
    }
  }
  const palaceSide: Side | null = inPalace(r, c, CHO) ? CHO : inPalace(r, c, HAN) ? HAN : null;
  if (palaceSide) {
    const p = PALACES[palaceSide];
    const cr = p.rMin + 1, cc = p.cMin + 1;
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pos[]) {
      if (r === cr && c === cc) continue;
      if (r !== cr && c !== cc) {
        const mr = r + dr, mc = c + dc;
        if (mr === cr && mc === cc) {
          const hurdlePiece = board[mr][mc];
          if (hurdlePiece && hurdlePiece.type !== CANNON) {
            const nr = mr + dr, nc = mc + dc;
            if (inPalace(nr, nc, palaceSide)) {
              const target = board[nr][nc];
              if (!target) moves.push([nr, nc]);
              else if (target.side !== side && target.type !== CANNON) moves.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  return moves;
}

function getHorseMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  const steps: { dr1: number; dc1: number; legs: Pos[] }[] = [
    { dr1: -1, dc1: 0, legs: [[-1, -1], [-1, 1]] },
    { dr1:  1, dc1: 0, legs: [[1, -1], [1, 1]] },
    { dr1:  0, dc1: -1, legs: [[-1, -1], [1, -1]] },
    { dr1:  0, dc1: 1, legs: [[-1, 1], [1, 1]] },
  ];
  for (const { dr1, dc1, legs } of steps) {
    const mr = r + dr1, mc = c + dc1;
    if (!inBounds(mr, mc) || board[mr][mc]) continue;
    for (const [dr2, dc2] of legs) {
      const nr = r + dr1 + dr2, nc = c + dc1 + dc2;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target || target.side !== side) moves.push([nr, nc]);
    }
  }
  return moves;
}

function getElephantMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  const elephantPaths: Pos[][] = [
    [[-1, 0], [-1, -1], [-1, -1]],
    [[-1, 0], [-1,  1], [-1,  1]],
    [[ 1, 0], [ 1, -1], [ 1, -1]],
    [[ 1, 0], [ 1,  1], [ 1,  1]],
    [[0, -1], [-1, -1], [-1, -1]],
    [[0, -1], [ 1, -1], [ 1, -1]],
    [[0,  1], [-1,  1], [-1,  1]],
    [[0,  1], [ 1,  1], [ 1,  1]],
  ];
  for (const path of elephantPaths) {
    let cr = r, cc = c;
    let blocked = false;
    for (let i = 0; i < path.length - 1; i++) {
      cr += path[i][0];
      cc += path[i][1];
      if (!inBounds(cr, cc) || board[cr][cc]) { blocked = true; break; }
    }
    if (blocked) continue;
    cr += path[path.length - 1][0];
    cc += path[path.length - 1][1];
    if (!inBounds(cr, cc)) continue;
    const target = board[cr][cc];
    if (!target || target.side !== side) moves.push([cr, cc]);
  }
  return moves;
}

function getSoldierMoves(board: Board, r: number, c: number, side: Side): Pos[] {
  const moves: Pos[] = [];
  const forward = side === CHO ? -1 : 1;
  for (const [dr, dc] of [[forward, 0], [0, -1], [0, 1]] as Pos[]) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (!target || target.side !== side) moves.push([nr, nc]);
  }
  const enemySide: Side = side === CHO ? HAN : CHO;
  if (inPalace(r, c, enemySide)) {
    for (const [dr, dc] of [[forward, -1], [forward, 1]] as Pos[]) {
      const nr = r + dr, nc = c + dc;
      if (isPalaceDiagonal(r, c, nr, nc, enemySide)) {
        const target = board[nr][nc];
        if (!target || target.side !== side) moves.push([nr, nc]);
      }
    }
  }
  return moves;
}

function getLegalMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c];
  if (!piece) return [];
  switch (piece.type) {
    case KING: return getKingMoves(board, r, c, piece.side);
    case ADVISOR: return getAdvisorMoves(board, r, c, piece.side);
    case CHARIOT: return getChariotMoves(board, r, c, piece.side);
    case CANNON: return getCannonMoves(board, r, c, piece.side);
    case HORSE: return getHorseMoves(board, r, c, piece.side);
    case ELEPHANT: return getElephantMoves(board, r, c, piece.side);
    case SOLDIER: return getSoldierMoves(board, r, c, piece.side);
    default: return [];
  }
}

function findKing(board: Board, side: Side): Pos | null {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c]!.type === KING && board[r][c]!.side === side)
        return [r, c];
  return null;
}

function isInCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return true;
  const opp: Side = side === CHO ? HAN : CHO;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c]!.side === opp) {
        const moves = getLegalMoves(board, r, c);
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) return true;
      }
  return false;
}

function applyMove(board: Board, fromR: number, fromC: number, toR: number, toC: number): Board {
  const newBoard: Board = board.map(row => row.map(cell => cell ? { ...cell } : null));
  newBoard[toR][toC] = newBoard[fromR][fromC];
  newBoard[fromR][fromC] = null;
  return newBoard;
}

function getValidMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = getLegalMoves(board, r, c);
  return raw.filter(([tr, tc]) => {
    const newBoard = applyMove(board, r, c, tr, tc);
    return !isInCheck(newBoard, piece.side);
  });
}

function hasAnyMoves(board: Board, side: Side): boolean {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c]!.side === side)
        if (getValidMoves(board, r, c).length > 0) return true;
  return false;
}

function checkBikjang(board: Board): boolean {
  const choKing = findKing(board, CHO);
  const hanKing = findKing(board, HAN);
  if (!choKing || !hanKing) return false;
  if (choKing[1] !== hanKing[1]) return false;
  const col = choKing[1];
  const minR = Math.min(choKing[0], hanKing[0]);
  const maxR = Math.max(choKing[0], hanKing[0]);
  for (let r = minR + 1; r < maxR; r++)
    if (board[r][col]) return false;
  return true;
}

// ─── AI ──────────────────────────────────────────────────────────────────────
function evaluateBoard(board: Board, aiSide: Side): number {
  let score = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type];
      let posBonus = 0;
      if (piece.type === SOLDIER) {
        posBonus = piece.side === CHO ? (9 - r) * 0.1 : r * 0.1;
      }
      posBonus += (4.5 - Math.abs(c - 4)) * 0.05;
      if (piece.side === aiSide) score += val + posBonus;
      else score -= val + posBonus;
    }
  return score;
}

function getAllMoves(board: Board, side: Side): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c]!.side === side) {
        const valid = getValidMoves(board, r, c);
        for (const [tr, tc] of valid) moves.push([r, c, tr, tc]);
      }
  return moves;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean, aiSide: Side): number {
  const opp: Side = aiSide === CHO ? HAN : CHO;
  const currentSide: Side = maximizing ? aiSide : opp;
  if (depth === 0) return evaluateBoard(board, aiSide);
  const moves = getAllMoves(board, currentSide);
  if (moves.length === 0) return maximizing ? -1000 : 1000;
  if (maximizing) {
    let maxEval = -Infinity;
    for (const [fr, fc, tr, tc] of moves) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      const ev = minimax(newBoard, depth - 1, alpha, beta, false, aiSide);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [fr, fc, tr, tc] of moves) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      const ev = minimax(newBoard, depth - 1, alpha, beta, true, aiSide);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(board: Board, aiSide: Side, level: number): Move | null {
  const moves = getAllMoves(board, aiSide);
  if (moves.length === 0) return null;

  if (level <= 2) {
    const captures = moves.filter(([, , tr, tc]) => board[tr][tc] !== null);
    if (level === 2 && captures.length > 0 && Math.random() < 0.5) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (level <= 4) {
    const depth = 1;
    let bestMove: Move = moves[0];
    let bestVal = -Infinity;
    const shuffled = [...moves].sort(() => Math.random() - 0.5);
    for (const [fr, fc, tr, tc] of shuffled) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      let val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide);
      val += (Math.random() - 0.5) * (level === 3 ? 3 : 1.5);
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc]; }
    }
    return bestMove;
  }

  if (level <= 6) {
    const depth = 2;
    let bestMove: Move = moves[0];
    let bestVal = -Infinity;
    const shuffled = [...moves].sort(() => Math.random() - 0.5);
    for (const [fr, fc, tr, tc] of shuffled) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      let val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide);
      val += (Math.random() - 0.5) * (level === 5 ? 1 : 0.5);
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc]; }
    }
    return bestMove;
  }

  if (level <= 8) {
    const depth = 2;
    const sorted = [...moves].sort((a, b) => {
      const capA = board[a[2]][a[3]] ? PIECE_VALUES[board[a[2]][a[3]]!.type] : 0;
      const capB = board[b[2]][b[3]] ? PIECE_VALUES[board[b[2]][b[3]]!.type] : 0;
      return capB - capA;
    });
    let bestMove: Move = sorted[0];
    let bestVal = -Infinity;
    for (const [fr, fc, tr, tc] of sorted) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide);
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc]; }
    }
    return bestMove;
  }

  // Level 9-10
  {
    const depth = level === 9 ? 2 : 3;
    const sorted = [...moves].sort((a, b) => {
      const capA = board[a[2]][a[3]] ? PIECE_VALUES[board[a[2]][a[3]]!.type] : 0;
      const capB = board[b[2]][b[3]] ? PIECE_VALUES[board[b[2]][b[3]]!.type] : 0;
      return capB - capA;
    });
    let bestMove: Move = sorted[0];
    let bestVal = -Infinity;
    for (const [fr, fc, tr, tc] of sorted) {
      const newBoard = applyMove(board, fr, fc, tr, tc);
      const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiSide);
      if (val > bestVal) { bestVal = val; bestMove = [fr, fc, tr, tc]; }
    }
    return bestMove;
  }
}

function getLevelColor(lv: number): string {
  const colors = ['#2ECC71','#27AE60','#F1C40F','#F39C12','#E67E22','#D35400','#E74C3C','#C0392B','#8E44AD','#6C3483'];
  return colors[lv - 1] || '#333';
}
function getLevelLabel(lv: number): string {
  if (lv <= 2) return '입문';
  if (lv <= 4) return '초급';
  if (lv <= 6) return '중급';
  if (lv <= 8) return '상급';
  return '고수';
}

const STORAGE_KEY = 'chonmap.game.janggi';
interface Stats { aiWinsByLevel: Record<number, number>; localPlays: number }
function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { aiWinsByLevel: {}, localPlays: 0, ...JSON.parse(r) }; } catch {}
  return { aiWinsByLevel: {}, localPlays: 0 };
}
function saveStats(s: Stats) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

// ─── Component ───────────────────────────────────────────────────────────────
type Mode = null | 'pick' | 'ai-level' | 'ai' | 'local';

export function Janggi({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [mode, setMode] = useState<Mode>(null);
  const [aiLevel, setAiLevel] = useState<number>(1);
  const [board, setBoard] = useState<Board>(createInitialBoard);
  const [turn, setTurn] = useState<Side>(CHO);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [winner, setWinner] = useState<Side | 'draw' | null>(null);
  const [lastMove, setLastMove] = useState<MoveInfo | null>(null);
  const [moveHistory, setMoveHistory] = useState<HistoryEntry[]>([]);
  const [inCheck, setInCheck] = useState<Side | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const aiThinkingRef = useRef(false);
  const statsRecordedRef = useRef(false);

  // 뷰포트 너비
  const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 400);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || turn !== HAN || winner || aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const delay = aiLevel <= 4 ? 300 : 500;
    const timer = window.setTimeout(() => {
      const move = getBestAIMove(board, HAN, aiLevel);
      if (move) {
        const [fr, fc, tr, tc] = move;
        const newBoard = applyMove(board, fr, fc, tr, tc);
        const check: Side | null = isInCheck(newBoard, CHO) ? CHO : isInCheck(newBoard, HAN) ? HAN : null;
        let newWinner: Side | 'draw' | null = null;
        if (!hasAnyMoves(newBoard, CHO)) newWinner = HAN;
        if (!findKing(newBoard, CHO)) newWinner = HAN;
        if (checkBikjang(newBoard)) newWinner = 'draw';

        setMoveHistory(prev => [...prev, { board: board.map(row => row.map(cell => cell ? { ...cell } : null)), turn, lastMove, inCheck }]);
        setBoard(newBoard);
        setTurn(CHO);
        setLastMove({ from: [fr, fc], to: [tr, tc] });
        setInCheck(check);
        setWinner(newWinner);
        setSelected(null);
        setValidMoves([]);
      }
      aiThinkingRef.current = false;
    }, delay);
    return () => { window.clearTimeout(timer); aiThinkingRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, turn, winner, board, aiLevel]);

  // 결과 기록
  useEffect(() => {
    if (!winner) { statsRecordedRef.current = false; return; }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    if (mode === 'ai' && winner === CHO) {
      const newStats = { ...stats, aiWinsByLevel: { ...stats.aiWinsByLevel } };
      newStats.aiWinsByLevel[aiLevel] = (newStats.aiWinsByLevel[aiLevel] || 0) + 1;
      setStats(newStats);
      saveStats(newStats);
    } else if (mode === 'local') {
      const newStats = { ...stats, localPlays: stats.localPlays + 1 };
      setStats(newStats);
      saveStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const handleClick = useCallback((r: number, c: number) => {
    if (winner) return;
    if (mode === 'ai' && turn === HAN) return;

    const currentSide = turn;
    const piece = board[r][c];

    if (selected) {
      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isValid) {
        const newBoard = applyMove(board, selected[0], selected[1], r, c);
        const nextTurn: Side = turn === CHO ? HAN : CHO;
        const check: Side | null = isInCheck(newBoard, CHO) ? CHO : isInCheck(newBoard, HAN) ? HAN : null;
        let newWinner: Side | 'draw' | null = null;
        if (!hasAnyMoves(newBoard, nextTurn)) newWinner = turn;
        if (!findKing(newBoard, nextTurn)) newWinner = turn;
        if (checkBikjang(newBoard)) newWinner = 'draw';

        setMoveHistory(prev => [...prev, { board: board.map(row => row.map(cell => cell ? { ...cell } : null)), turn, lastMove, inCheck }]);
        setBoard(newBoard);
        setTurn(nextTurn);
        setLastMove({ from: [selected[0], selected[1]], to: [r, c] });
        setInCheck(check);
        setWinner(newWinner);
        setSelected(null);
        setValidMoves([]);
        return;
      }
      if (piece && piece.side === currentSide) {
        setSelected([r, c]);
        setValidMoves(getValidMoves(board, r, c));
        return;
      }
      setSelected(null);
      setValidMoves([]);
      return;
    }

    if (piece && piece.side === currentSide) {
      setSelected([r, c]);
      setValidMoves(getValidMoves(board, r, c));
    }
  }, [board, turn, selected, validMoves, winner, mode, lastMove, inCheck]);

  const undo = () => {
    if (moveHistory.length === 0 || winner) return;
    if (aiThinkingRef.current) return;
    const stepsBack = (mode === 'ai' && moveHistory.length >= 2) ? 2 : 1;
    const prev = moveHistory[moveHistory.length - stepsBack];
    setBoard(prev.board);
    setTurn(prev.turn);
    setLastMove(prev.lastMove);
    setInCheck(prev.inCheck);
    setWinner(null);
    setSelected(null);
    setValidMoves([]);
    setMoveHistory(moveHistory.slice(0, -stepsBack));
    statsRecordedRef.current = false;
  };

  const doReset = () => {
    setBoard(createInitialBoard());
    setTurn(CHO);
    setWinner(null);
    setLastMove(null);
    setInCheck(null);
    setSelected(null);
    setValidMoves([]);
    setMoveHistory([]);
    aiThinkingRef.current = false;
    statsRecordedRef.current = false;
  };
  const reset = () => setShowResetConfirm(true);

  const exitToHome = () => {
    setMode(null);
    doReset();
  };

  // 안드로이드 뒤로가기: AI 레벨 선택 → 모드 선택 → (허브는 PlayHub이 처리)
  const smartBack = () => {
    if (mode === 'ai-level') { setMode('pick'); return; }
    exitToHome();
  };
  useAndroidBack(mode !== null && mode !== 'pick', smartBack);

  // 테마
  const goldColor = dark ? '#FBBF24' : '#8B6914';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';

  const modeBtn: React.CSSProperties = {
    padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, color: 'white',
  };

  // 1) 모드 선택
  if (!mode || mode === 'pick') {
    return (
      <>
        <BackBar title="장기" onBack={onBack} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>♟</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>장기</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            한국 전통 보드게임 · 초(청) vs 한(빨강)
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => setMode('ai-level')} style={{ ...modeBtn, background: 'linear-gradient(135deg, #E74C3C, #C0392B)' }}>
              🤖 컴퓨터 대전 (10단계)
            </button>
            <button onClick={() => { setMode('local'); doReset(); }} style={{ ...modeBtn, background: 'linear-gradient(135deg, #1F2937, #4B5563)' }}>
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

  // 2) AI 레벨 선택
  if (mode === 'ai-level') {
    return (
      <>
        <BackBar title="장기 · 난이도 선택" onBack={() => setMode('pick')} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>🤖</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginTop: 8 }}>난이도 선택</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>나는 초(빨강, 선공)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20, maxWidth: 300, margin: '20px auto 0' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => {
              const wins = stats.aiWinsByLevel[lv] || 0;
              return (
                <button key={lv}
                  onClick={() => { setAiLevel(lv); setMode('ai'); doReset(); }}
                  style={{
                    padding: '14px 0', borderRadius: 12,
                    border: wins > 0 ? '3px solid #F1C40F' : 'none',
                    cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#FFF',
                    background: getLevelColor(lv),
                    position: 'relative',
                  }}>
                  Lv.{lv} {getLevelLabel(lv)}
                  {wins > 0 && (
                    <span style={{
                      position: 'absolute', top: -8, right: -6,
                      background: '#F1C40F', color: '#FFF',
                      borderRadius: 12, fontSize: 10, fontWeight: 800,
                      padding: '2px 7px',
                    }}>
                      🏆 {wins}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // 3) 대국
  const cellSize = Math.min(Math.floor((vw - 48) / (COLS - 1)), 44);
  const boardW = cellSize * (COLS - 1);
  const boardH = cellSize * (ROWS - 1);
  const pad = cellSize * 0.8;
  const baseR = cellSize * 0.4;

  const PIECE_SIZE: Record<PieceType, number> = {
    king: 1.0, chariot: 0.9, cannon: 0.85, horse: 0.8, elephant: 0.8, advisor: 0.75, soldier: 0.65,
  };

  function octagonPath(cx: number, cy: number, w: number, h: number): string {
    const cut = Math.min(w, h) * 0.38;
    return `M${cx - w + cut},${cy - h} L${cx + w - cut},${cy - h} L${cx + w},${cy - h + cut} L${cx + w},${cy + h - cut} L${cx + w - cut},${cy + h} L${cx - w + cut},${cy + h} L${cx - w},${cy + h - cut} L${cx - w},${cy - h + cut} Z`;
  }
  const svgW = boardW + pad * 2;
  const svgH = boardH + pad * 2;

  const turnLabel = turn === CHO ? '초 (빨강)' : '한 (청)';

  const statusText = winner
    ? winner === 'draw'
      ? '무승부 (빅장)!'
      : mode === 'ai'
        ? (winner === CHO ? `🏆 Lv.${aiLevel} 승리!` : `Lv.${aiLevel} AI 승리`)
        : `${winner === CHO ? '초 (빨강)' : '한 (청)'} 승리!`
    : mode === 'ai' && turn === HAN
      ? 'AI 생각 중...'
      : `${turnLabel}의 차례`;

  return (
    <>
      <BackBar title={mode === 'ai' ? `장기 · AI Lv.${aiLevel}` : '장기 · 로컬'} onBack={exitToHome} dark={dark} />
      <div style={{ paddingBottom: 12, maxWidth: 560, margin: '0 auto' }}>
        {/* Status */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px',
          background: winner ? (dark ? '#78350F' : '#FEF3C7') : (inCheck ? (dark ? '#450A0A' : '#FEE2E2') : cardBg),
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: winner ? goldColor : textPrimary }}>
            {statusText}
            {inCheck && !winner && ` · ${inCheck === CHO ? '초' : '한'} 장군!`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo} disabled={moveHistory.length === 0 || !!winner}
              style={{
                background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
                fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
                opacity: (moveHistory.length === 0 || winner) ? 0.4 : 1,
              }}>↩ 무르기</button>
            <button onClick={reset}
              style={{
                background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
                fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              }}>새 게임</button>
          </div>
        </div>

        {/* SVG Board */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflow: 'auto' }}>
          <svg width={svgW} height={svgH} style={{ borderRadius: 8 }}>
            <defs>
              <radialGradient id="woodPieceJG" cx="32%" cy="28%" r="85%">
                <stop offset="0%" stopColor="#FFF2D6" />
                <stop offset="30%" stopColor="#F2D9AA" />
                <stop offset="70%" stopColor="#D4A56A" />
                <stop offset="100%" stopColor="#8B5A2B" />
              </radialGradient>
              <linearGradient id="pieceHighlightJG" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
                <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
              </linearGradient>
              <radialGradient id="kingGlowJG" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="#F1C40F" stopOpacity="0" />
                <stop offset="100%" stopColor="#F1C40F" stopOpacity="0.8" />
              </radialGradient>
            </defs>
            <rect x={0} y={0} width={svgW} height={svgH} fill={dark ? '#92400E' : '#DCB35C'} rx={8} />

            {Array.from({ length: ROWS }).map((_, i) => (
              <line key={`h-${i}`}
                x1={pad} y1={pad + i * cellSize}
                x2={pad + boardW} y2={pad + i * cellSize}
                stroke="#8B6914" strokeWidth={1} />
            ))}
            {Array.from({ length: COLS }).map((_, i) => (
              <line key={`v-${i}`}
                x1={pad + i * cellSize} y1={pad}
                x2={pad + i * cellSize} y2={pad + boardH}
                stroke="#8B6914" strokeWidth={1} />
            ))}

            {/* Palace diagonals */}
            <line x1={pad + 3 * cellSize} y1={pad + 0 * cellSize} x2={pad + 5 * cellSize} y2={pad + 2 * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            <line x1={pad + 5 * cellSize} y1={pad + 0 * cellSize} x2={pad + 3 * cellSize} y2={pad + 2 * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            <line x1={pad + 3 * cellSize} y1={pad + 7 * cellSize} x2={pad + 5 * cellSize} y2={pad + 9 * cellSize} stroke="#8B6914" strokeWidth={0.8} />
            <line x1={pad + 5 * cellSize} y1={pad + 7 * cellSize} x2={pad + 3 * cellSize} y2={pad + 9 * cellSize} stroke="#8B6914" strokeWidth={0.8} />

            {/* Last move */}
            {lastMove && (
              <>
                <circle cx={pad + lastMove.from[1] * cellSize} cy={pad + lastMove.from[0] * cellSize}
                  r={baseR * 0.3} fill="none" stroke="#F39C12" strokeWidth={2} opacity={0.6} />
                <circle cx={pad + lastMove.to[1] * cellSize} cy={pad + lastMove.to[0] * cellSize}
                  r={baseR + 3} fill="none" stroke="#F39C12" strokeWidth={2.5} opacity={0.7} />
              </>
            )}

            {/* Valid moves */}
            {validMoves.map(([mr, mc]) => {
              const hasPiece = board[mr][mc];
              return hasPiece ? (
                <circle key={`vm-${mr}-${mc}`}
                  cx={pad + mc * cellSize} cy={pad + mr * cellSize}
                  r={baseR + 2} fill="none" stroke="#E74C3C" strokeWidth={2.5} strokeDasharray="4,3" opacity={0.8} />
              ) : (
                <circle key={`vm-${mr}-${mc}`}
                  cx={pad + mc * cellSize} cy={pad + mr * cellSize}
                  r={cellSize * 0.12} fill="#4CAF50" opacity={0.6} />
              );
            })}

            {/* Selected highlight */}
            {selected && (() => {
              const sp = board[selected[0]][selected[1]];
              const sc = sp ? (PIECE_SIZE[sp.type] || 0.8) : 0.8;
              const sw = baseR * sc + 4;
              const sh = baseR * sc * 1.1 + 4;
              return <path d={octagonPath(pad + selected[1] * cellSize, pad + selected[0] * cellSize, sw, sh)}
                fill="none" stroke="#FFD700" strokeWidth={3} />;
            })()}

            {/* Pieces */}
            {board.map((row, r) => row.map((piece, c) => {
              if (!piece) return null;
              const cx = pad + c * cellSize;
              const cy = pad + r * cellSize;
              const isCho = piece.side === CHO;
              const scale = PIECE_SIZE[piece.type] || 0.8;
              const pw = baseR * scale;
              const ph = baseR * scale * 1.1;
              const strokeColor = isCho ? '#C62828' : '#1565C0';
              const textColor = isCho ? '#C62828' : '#1565C0';
              const name = PIECE_NAMES[piece.type][piece.side];
              const fontSize = baseR * scale * 1.15;
              const isKing = piece.type === KING;
              return (
                <g key={`p-${r}-${c}`} style={{ cursor: 'pointer' }}>
                  {isKing && (
                    <path d={octagonPath(cx, cy, pw * 1.15, ph * 1.15)}
                      fill="url(#kingGlowJG)" opacity={0.8} />
                  )}
                  <ellipse cx={cx} cy={cy + ph + 1} rx={pw * 0.85} ry={ph * 0.15}
                    fill="rgba(0,0,0,0.35)" />
                  <path d={octagonPath(cx, cy, pw, ph)} fill="#6B3A1A" stroke="none" />
                  <path d={octagonPath(cx, cy, pw * 0.95, ph * 0.95)} fill="url(#woodPieceJG)" />
                  <path d={octagonPath(cx, cy, pw * 0.95, ph * 0.95)} fill="url(#pieceHighlightJG)" />
                  <path d={octagonPath(cx, cy, pw * 0.78, ph * 0.78)}
                    fill="none" stroke={strokeColor} strokeWidth={1.8} opacity={0.85} />
                  <path d={octagonPath(cx, cy, pw * 0.73, ph * 0.73)}
                    fill="none" stroke={strokeColor} strokeWidth={0.6} opacity={0.4} />
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                    fontSize={fontSize} fontWeight={900}
                    fill={isKing ? (isCho ? '#B71C1C' : '#0D47A1') : textColor}
                    stroke={isKing ? (isCho ? '#B71C1C' : '#0D47A1') : textColor}
                    strokeWidth={fontSize * 0.055}
                    paintOrder="stroke fill"
                    fontFamily="'Noto Serif KR', 'Nanum Myeongjo', 'Batang', serif"
                    style={{
                      userSelect: 'none', pointerEvents: 'none',
                      textRendering: 'geometricPrecision',
                    }}>
                    {name}
                  </text>
                </g>
              );
            }))}

            {/* Click targets */}
            {board.map((row, r) => row.map((_, c) => (
              <rect key={`click-${r}-${c}`}
                x={pad + c * cellSize - cellSize / 2} y={pad + r * cellSize - cellSize / 2}
                width={cellSize} height={cellSize} fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => handleClick(r, c)} />
            )))}
          </svg>
        </div>
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
