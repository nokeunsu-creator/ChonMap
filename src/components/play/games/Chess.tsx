import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFamily } from '../../../state/FamilyContext';
import { BackBar, GameProps } from '../PlayHub';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

type PieceCode = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type Cell = PieceCode | null;
type Board = Cell[][];
type Color = 'white' | 'black';
type Pos = [number, number];
interface Castling { whiteK: boolean; whiteQ: boolean; blackK: boolean; blackQ: boolean }
interface Captured { white: PieceCode[]; black: PieceCode[] }
type GameOver = null | 'stalemate' | 'checkmate-white' | 'checkmate-black';
interface Promotion { r: number; c: number; from: Pos }
interface HistoryEntry { board: Board; turn: Color; enPassant: Pos | null; castling: Castling; captured: Captured; inCheck: boolean }

const PIECES: Record<PieceCode, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const INIT_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

function cloneBoard(b: Board): Board { return b.map(r => [...r]); }
function isWhite(p: Cell): boolean { return !!p && p === p.toUpperCase(); }
function isBlack(p: Cell): boolean { return !!p && p === p.toLowerCase(); }
function isAlly(p: Cell, turn: Color): boolean { return turn === 'white' ? isWhite(p) : isBlack(p); }

function findKing(board: Board, turn: Color): Pos | null {
  const k: PieceCode = turn === 'white' ? 'K' : 'k';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === k) return [r, c];
  return null;
}

function getRawMoves(board: Board, r: number, c: number, enPassant: Pos | null, castling: Castling | null): Pos[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Pos[] = [];
  const white = isWhite(piece);
  const type = piece.toUpperCase();

  const addIf = (nr: number, nc: number): boolean => {
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
    if (white ? isWhite(board[nr][nc]) : isBlack(board[nr][nc])) return false;
    moves.push([nr, nc]);
    return !board[nr][nc];
  };

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      if (!addIf(r + dr * i, c + dc * i)) break;
    }
  };

  if (type === 'P') {
    const dir = white ? -1 : 1;
    const start = white ? 6 : 1;
    if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === start && !board[r + dir * 2][c]) moves.push([r + dir * 2, c]);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (white ? isBlack(board[nr][nc]) : isWhite(board[nr][nc])) moves.push([nr, nc]);
        if (enPassant && enPassant[0] === nr && enPassant[1] === nc) moves.push([nr, nc]);
      }
    }
  }
  if (type === 'R') { slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0); }
  if (type === 'B') { slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1); }
  if (type === 'Q') { slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0); slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1); }
  if (type === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as Pos[]) addIf(r + dr, c + dc);
  }
  if (type === 'K') {
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as Pos[]) addIf(r + dr, c + dc);
    if (castling) {
      const row = white ? 7 : 0;
      if (r === row && c === 4) {
        const side: Color = white ? 'white' : 'black';
        const attackerColor: Color = white ? 'black' : 'white';
        const sideKey = (side + 'K') as 'whiteK' | 'blackK';
        const sideKeyQ = (side + 'Q') as 'whiteQ' | 'blackQ';
        if (castling[sideKey] && !board[row][5] && !board[row][6] && board[row][7] === (white ? 'R' : 'r')) {
          if (!isSquareAttacked(board, row, 4, attackerColor) &&
              !isSquareAttacked(board, row, 5, attackerColor) &&
              !isSquareAttacked(board, row, 6, attackerColor)) {
            moves.push([row, 6]);
          }
        }
        if (castling[sideKeyQ] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0] === (white ? 'R' : 'r')) {
          if (!isSquareAttacked(board, row, 4, attackerColor) &&
              !isSquareAttacked(board, row, 3, attackerColor) &&
              !isSquareAttacked(board, row, 2, attackerColor)) {
            moves.push([row, 2]);
          }
        }
      }
    }
  }
  return moves;
}

function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  for (let rr = 0; rr < 8; rr++)
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p) continue;
      if (byColor === 'white' ? !isWhite(p) : !isBlack(p)) continue;
      const moves = getRawMoves(board, rr, cc, null, null);
      if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
    }
  return false;
}

function isInCheck(board: Board, turn: Color): boolean {
  const kp = findKing(board, turn);
  if (!kp) return false;
  return isSquareAttacked(board, kp[0], kp[1], turn === 'white' ? 'black' : 'white');
}

function getLegalMoves(board: Board, r: number, c: number, turn: Color, enPassant: Pos | null, castling: Castling | null): Pos[] {
  const piece = board[r][c];
  if (!piece || !isAlly(piece, turn)) return [];
  const raw = getRawMoves(board, r, c, enPassant, castling);
  return raw.filter(([nr, nc]) => {
    const nb = cloneBoard(board);
    nb[nr][nc] = nb[r][c];
    nb[r][c] = null;
    if (piece.toUpperCase() === 'P' && enPassant && nr === enPassant[0] && nc === enPassant[1]) {
      const capturedRow = isWhite(piece) ? nr + 1 : nr - 1;
      nb[capturedRow][nc] = null;
    }
    return !isInCheck(nb, turn);
  });
}

function hasAnyLegalMove(board: Board, turn: Color, enPassant: Pos | null, castling: Castling): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (isAlly(board[r][c], turn)) {
        if (getLegalMoves(board, r, c, turn, enPassant, castling).length > 0) return true;
      }
    }
  return false;
}

// --- AI ---
const PIECE_VALUES: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const PST_PAWN = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0],
];
const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];
const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];
const PST_ROOK = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0],
];
const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];
const PST_KING = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

const PST: Record<string, number[][]> = { P: PST_PAWN, N: PST_KNIGHT, B: PST_BISHOP, R: PST_ROOK, Q: PST_QUEEN, K: PST_KING };

function getPST(pieceType: string, r: number, c: number, white: boolean): number {
  const table = PST[pieceType];
  if (!table) return 0;
  const row = white ? (7 - r) : r;
  return table[row][c];
}

function evaluateBoard(board: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const type = p.toUpperCase();
      const val = PIECE_VALUES[type] || 0;
      const pst = getPST(type, r, c, isWhite(p));
      if (isWhite(p)) score += val + pst;
      else score -= val + pst;
    }
  }
  return score;
}

interface MoveResult { board: Board; castling: Castling; enPassant: Pos | null; captured: Cell }
function executeMove(board: Board, fromR: number, fromC: number, toR: number, toC: number, enPassant: Pos | null, castling: Castling): MoveResult {
  const nb = cloneBoard(board);
  const piece = nb[fromR][fromC]!;
  const capturedPiece = nb[toR][toC];
  const white = isWhite(piece);

  let epCapture: Cell = null;
  if (piece.toUpperCase() === 'P' && enPassant && toR === enPassant[0] && toC === enPassant[1]) {
    const capturedRow = white ? toR + 1 : toR - 1;
    epCapture = nb[capturedRow][toC];
    nb[capturedRow][toC] = null;
  }

  nb[toR][toC] = piece;
  nb[fromR][fromC] = null;

  const newCastling: Castling = { ...castling };
  if (piece.toUpperCase() === 'K') {
    if (white) { newCastling.whiteK = false; newCastling.whiteQ = false; }
    else { newCastling.blackK = false; newCastling.blackQ = false; }
    if (Math.abs(toC - fromC) === 2) {
      if (toC === 6) { nb[toR][5] = nb[toR][7]; nb[toR][7] = null; }
      if (toC === 2) { nb[toR][3] = nb[toR][0]; nb[toR][0] = null; }
    }
  }
  if (piece.toUpperCase() === 'R') {
    if (fromR === 7 && fromC === 0) newCastling.whiteQ = false;
    if (fromR === 7 && fromC === 7) newCastling.whiteK = false;
    if (fromR === 0 && fromC === 0) newCastling.blackQ = false;
    if (fromR === 0 && fromC === 7) newCastling.blackK = false;
  }

  let newEP: Pos | null = null;
  if (piece.toUpperCase() === 'P' && Math.abs(toR - fromR) === 2) {
    newEP = [(toR + fromR) / 2, toC];
  }

  if (piece.toUpperCase() === 'P' && (toR === 0 || toR === 7)) {
    nb[toR][toC] = white ? 'Q' : 'q';
  }

  return { board: nb, castling: newCastling, enPassant: newEP, captured: capturedPiece || epCapture };
}

interface OrderedMove { from: Pos; to: Pos; score?: number }
function generateOrderedMoves(board: Board, turn: Color, enPassant: Pos | null, castling: Castling): OrderedMove[] {
  const captures: OrderedMove[] = [];
  const quiet: OrderedMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!isAlly(board[r][c], turn)) continue;
      const moves = getLegalMoves(board, r, c, turn, enPassant, castling);
      for (const [toR, toC] of moves) {
        const victim = board[toR][toC];
        if (victim) {
          const victimVal = PIECE_VALUES[victim.toUpperCase()] || 0;
          const attackerVal = PIECE_VALUES[board[r][c]!.toUpperCase()] || 0;
          captures.push({ from: [r, c], to: [toR, toC], score: victimVal * 10 - attackerVal });
        } else if (enPassant && board[r][c]!.toUpperCase() === 'P' && toR === enPassant[0] && toC === enPassant[1]) {
          captures.push({ from: [r, c], to: [toR, toC], score: 100 });
        } else {
          quiet.push({ from: [r, c], to: [toR, toC] });
        }
      }
    }
  }
  captures.sort((a, b) => (b.score || 0) - (a.score || 0));
  return [...captures, ...quiet];
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean, turn: Color, enPassant: Pos | null, castling: Castling): { score: number; move?: OrderedMove | null } {
  if (depth === 0) return { score: evaluateBoard(board) };
  const moves = generateOrderedMoves(board, turn, enPassant, castling);
  if (moves.length === 0) {
    if (isInCheck(board, turn)) return { score: maximizing ? -100000 + (3 - depth) : 100000 - (3 - depth) };
    return { score: 0 };
  }
  let bestMove: OrderedMove | null = null;
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = executeMove(board, move.from[0], move.from[1], move.to[0], move.to[1], enPassant, castling);
      const nextTurn: Color = turn === 'white' ? 'black' : 'white';
      const { score } = minimax(result.board, depth - 1, alpha, beta, false, nextTurn, result.enPassant, result.castling);
      if (score > maxEval) { maxEval = score; bestMove = move; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = executeMove(board, move.from[0], move.from[1], move.to[0], move.to[1], enPassant, castling);
      const nextTurn: Color = turn === 'white' ? 'black' : 'white';
      const { score } = minimax(result.board, depth - 1, alpha, beta, true, nextTurn, result.enPassant, result.castling);
      if (score < minEval) { minEval = score; bestMove = move; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

function getAIMove(board: Board, enPassant: Pos | null, castling: Castling): OrderedMove | null {
  const result = minimax(board, 3, -Infinity, Infinity, false, 'black', enPassant, castling);
  return result.move ?? null;
}

// --- Component ---
type Mode = null | 'local' | 'ai';
const STORAGE_KEY = 'chonmap.game.chess';
interface Stats { aiWins: number; aiLosses: number; localPlays: number }
function loadStats(): Stats {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return { aiWins: 0, aiLosses: 0, localPlays: 0, ...JSON.parse(r) }; } catch {}
  return { aiWins: 0, aiLosses: 0, localPlays: 0 };
}
function saveStats(s: Stats) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

export function Chess({ onBack }: GameProps) {
  const { state } = useFamily();
  const dark = state.darkMode;

  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Board>(() => cloneBoard(INIT_BOARD));
  const [turn, setTurn] = useState<Color>('white');
  const [selected, setSelected] = useState<Pos | null>(null);
  const [legalMoves, setLegalMoves] = useState<Pos[]>([]);
  const [enPassant, setEnPassant] = useState<Pos | null>(null);
  const [castling, setCastling] = useState<Castling>({ whiteK: true, whiteQ: true, blackK: true, blackQ: true });
  const [gameOver, setGameOver] = useState<GameOver>(null);
  const [inCheck, setInCheck] = useState(false);
  const [lastMove, setLastMove] = useState<[Pos, Pos] | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [captured, setCaptured] = useState<Captured>({ white: [], black: [] });
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const aiTimerRef = useRef<number | null>(null);
  const aiThinkingRef = useRef(false);
  const statsRecordedRef = useRef(false);

  const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 400);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    return () => { if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current); };
  }, [mode]);

  // AI turn
  useEffect(() => {
    if (mode !== 'ai') return;
    if (turn !== 'black') return;
    if (gameOver) return;
    if (promotion) return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    setAiThinking(true);
    aiTimerRef.current = window.setTimeout(() => {
      const aiMove = getAIMove(board, enPassant, castling);
      if (!aiMove) {
        aiThinkingRef.current = false;
        setAiThinking(false);
        return;
      }
      const { from, to } = aiMove;
      const [fromR, fromC] = from;
      const [toR, toC] = to;
      const nb = cloneBoard(board);
      const piece = nb[fromR][fromC]!;
      const capturedPiece = nb[toR][toC];
      const newCaptured: Captured = { white: [...captured.white], black: [...captured.black] };

      if (piece.toUpperCase() === 'P' && enPassant && toR === enPassant[0] && toC === enPassant[1]) {
        const capturedRow = isWhite(piece) ? toR + 1 : toR - 1;
        const ep = nb[capturedRow][toC];
        if (ep) newCaptured[isWhite(piece) ? 'white' : 'black'].push(ep);
        nb[capturedRow][toC] = null;
      }
      if (capturedPiece) newCaptured[isWhite(piece) ? 'white' : 'black'].push(capturedPiece);

      nb[toR][toC] = piece;
      nb[fromR][fromC] = null;

      const newCastling: Castling = { ...castling };
      if (piece.toUpperCase() === 'K') {
        if (isWhite(piece)) { newCastling.whiteK = false; newCastling.whiteQ = false; }
        else { newCastling.blackK = false; newCastling.blackQ = false; }
        if (Math.abs(toC - fromC) === 2) {
          if (toC === 6) { nb[toR][5] = nb[toR][7]; nb[toR][7] = null; }
          if (toC === 2) { nb[toR][3] = nb[toR][0]; nb[toR][0] = null; }
        }
      }
      if (piece.toUpperCase() === 'R') {
        if (fromR === 7 && fromC === 0) newCastling.whiteQ = false;
        if (fromR === 7 && fromC === 7) newCastling.whiteK = false;
        if (fromR === 0 && fromC === 0) newCastling.blackQ = false;
        if (fromR === 0 && fromC === 7) newCastling.blackK = false;
      }

      let newEP: Pos | null = null;
      if (piece.toUpperCase() === 'P' && Math.abs(toR - fromR) === 2) {
        newEP = [(toR + fromR) / 2, toC];
      }
      if (piece.toUpperCase() === 'P' && (toR === 0 || toR === 7)) {
        nb[toR][toC] = isWhite(piece) ? 'Q' : 'q';
      }

      const newLastMove: [Pos, Pos] = [from as Pos, to as Pos];
      const nextTurn: Color = 'white';
      const check = isInCheck(nb, nextTurn);
      let newGameOver: GameOver = null;
      if (!hasAnyLegalMove(nb, nextTurn, newEP, newCastling)) {
        newGameOver = check ? 'checkmate-black' : 'stalemate';
      }

      setBoard(nb);
      setCastling(newCastling);
      setEnPassant(newEP);
      setCaptured(newCaptured);
      setLastMove(newLastMove);
      setSelected(null);
      setLegalMoves([]);
      setInCheck(check);
      setTurn(nextTurn);
      setGameOver(newGameOver);
      aiThinkingRef.current = false;
      setAiThinking(false);
    }, 500);

    return () => { if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current); };
  }, [mode, turn, gameOver, promotion, board, enPassant, castling, captured]);

  // 승패 기록
  useEffect(() => {
    if (!gameOver) { statsRecordedRef.current = false; return; }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    if (mode === 'ai') {
      const newStats = { ...stats };
      if (gameOver === 'checkmate-black') newStats.aiWins += 1;
      else if (gameOver === 'checkmate-white') newStats.aiLosses += 1;
      setStats(newStats);
      saveStats(newStats);
    } else if (mode === 'local') {
      const newStats = { ...stats, localPlays: stats.localPlays + 1 };
      setStats(newStats);
      saveStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const doReset = () => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    aiThinkingRef.current = false;
    setAiThinking(false);
    setBoard(cloneBoard(INIT_BOARD));
    setTurn('white');
    setSelected(null);
    setLegalMoves([]);
    setEnPassant(null);
    setCastling({ whiteK: true, whiteQ: true, blackK: true, blackQ: true });
    setGameOver(null);
    setInCheck(false);
    setLastMove(null);
    setPromotion(null);
    setHistory([]);
    setCaptured({ white: [], black: [] });
    statsRecordedRef.current = false;
  };
  const reset = () => setShowResetConfirm(true);

  const undo = () => {
    if (mode === 'ai') return;
    if (history.length === 0 || gameOver) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setTurn(last.turn);
    setEnPassant(last.enPassant);
    setCastling(last.castling);
    setCaptured(last.captured);
    setInCheck(last.inCheck);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setLegalMoves([]);
    setLastMove(null);
    setGameOver(null);
    setPromotion(null);
    statsRecordedRef.current = false;
  };

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver) return;
    if (mode === 'ai') {
      if (turn !== 'white') return;
      if (aiThinking) return;
    }
    if (promotion) return;

    if (selected && legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
      const nb = cloneBoard(board);
      const piece = nb[selected[0]][selected[1]]!;
      const capturedPiece = nb[r][c];
      const newCaptured: Captured = { white: [...captured.white], black: [...captured.black] };

      if (mode === 'local') {
        setHistory([...history, { board: cloneBoard(board), turn, enPassant, castling: { ...castling }, captured: { white: [...captured.white], black: [...captured.black] }, inCheck }]);
      }

      if (piece.toUpperCase() === 'P' && enPassant && r === enPassant[0] && c === enPassant[1]) {
        const capturedRow = isWhite(piece) ? r + 1 : r - 1;
        const ep = nb[capturedRow][c];
        if (ep) newCaptured[isWhite(piece) ? 'white' : 'black'].push(ep);
        nb[capturedRow][c] = null;
      }
      if (capturedPiece) newCaptured[isWhite(piece) ? 'white' : 'black'].push(capturedPiece);

      nb[r][c] = piece;
      nb[selected[0]][selected[1]] = null;

      const newCastling: Castling = { ...castling };
      if (piece.toUpperCase() === 'K') {
        if (isWhite(piece)) { newCastling.whiteK = false; newCastling.whiteQ = false; }
        else { newCastling.blackK = false; newCastling.blackQ = false; }
        if (Math.abs(c - selected[1]) === 2) {
          if (c === 6) { nb[r][5] = nb[r][7]; nb[r][7] = null; }
          if (c === 2) { nb[r][3] = nb[r][0]; nb[r][0] = null; }
        }
      }
      if (piece.toUpperCase() === 'R') {
        if (selected[0] === 7 && selected[1] === 0) newCastling.whiteQ = false;
        if (selected[0] === 7 && selected[1] === 7) newCastling.whiteK = false;
        if (selected[0] === 0 && selected[1] === 0) newCastling.blackQ = false;
        if (selected[0] === 0 && selected[1] === 7) newCastling.blackK = false;
      }

      let newEP: Pos | null = null;
      if (piece.toUpperCase() === 'P' && Math.abs(r - selected[0]) === 2) {
        newEP = [(r + selected[0]) / 2, c];
      }

      const newLastMove: [Pos, Pos] = [selected, [r, c]];

      if (piece.toUpperCase() === 'P' && (r === 0 || r === 7)) {
        const newPromotion: Promotion = { r, c, from: selected };
        setBoard(nb);
        setPromotion(newPromotion);
        setEnPassant(newEP);
        setCastling(newCastling);
        setCaptured(newCaptured);
        setLastMove(newLastMove);
        setSelected(null);
        setLegalMoves([]);
        return;
      }

      const nextTurn: Color = turn === 'white' ? 'black' : 'white';
      const check = isInCheck(nb, nextTurn);
      let newGameOver: GameOver = null;
      if (!hasAnyLegalMove(nb, nextTurn, newEP, newCastling)) {
        newGameOver = check ? (turn === 'white' ? 'checkmate-white' : 'checkmate-black') : 'stalemate';
      }

      setBoard(nb);
      setCastling(newCastling);
      setEnPassant(newEP);
      setCaptured(newCaptured);
      setLastMove(newLastMove);
      setSelected(null);
      setLegalMoves([]);
      setInCheck(check);
      setTurn(nextTurn);
      setGameOver(newGameOver);
      return;
    }

    const piece = board[r][c];
    if (mode === 'ai') {
      if (piece && isWhite(piece)) {
        const moves = getLegalMoves(board, r, c, turn, enPassant, castling);
        setSelected([r, c]);
        setLegalMoves(moves);
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    } else if (piece && isAlly(piece, turn)) {
      const moves = getLegalMoves(board, r, c, turn, enPassant, castling);
      setSelected([r, c]);
      setLegalMoves(moves);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [board, turn, selected, legalMoves, enPassant, castling, gameOver, promotion, history, captured, inCheck, mode, aiThinking]);

  const promote = (piece: 'Q' | 'R' | 'B' | 'N') => {
    if (!promotion) return;
    const nb = cloneBoard(board);
    nb[promotion.r][promotion.c] = (turn === 'white' ? piece : piece.toLowerCase()) as PieceCode;

    const nextTurn: Color = turn === 'white' ? 'black' : 'white';
    const check = isInCheck(nb, nextTurn);
    let newGameOver: GameOver = null;
    if (!hasAnyLegalMove(nb, nextTurn, enPassant, castling)) {
      newGameOver = check ? (turn === 'white' ? 'checkmate-white' : 'checkmate-black') : 'stalemate';
    }
    setBoard(nb);
    setPromotion(null);
    setInCheck(check);
    setTurn(nextTurn);
    setGameOver(newGameOver);
  };

  const exitToHome = () => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    aiThinkingRef.current = false;
    setAiThinking(false);
    setMode(null);
    doReset();
  };

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
  if (!mode) {
    return (
      <>
        <BackBar title="체스" onBack={onBack} dark={dark} />
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginTop: 20 }}>♟</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginTop: 8 }}>체스</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            체크메이트 하면 승리!
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button onClick={() => { doReset(); setMode('local'); }} style={{ ...modeBtn, background: 'linear-gradient(135deg, #5D4037, #795548)' }}>
              📱 같은 기기에서 2인
            </button>
            <button onClick={() => { doReset(); setMode('ai'); }} style={{ ...modeBtn, background: 'linear-gradient(135deg, #43A047, #66BB6A)' }}>
              🤖 컴퓨터 대전
            </button>
          </div>
          {(stats.aiWins + stats.aiLosses + stats.localPlays) > 0 && (
            <div style={{ marginTop: 20, fontSize: 12, color: textSecondary }}>
              {(stats.aiWins + stats.aiLosses) > 0 && <>AI 전적: <strong style={{ color: goldColor }}>{stats.aiWins}승 {stats.aiLosses}패</strong></>}
              {stats.localPlays > 0 && <> · 로컬 플레이: {stats.localPlays}회</>}
            </div>
          )}
        </div>
      </>
    );
  }

  // 2) 대국
  const cellSize = Math.min(Math.floor((vw - 32) / 8), 50);

  const renderPiece = (p: Cell) => {
    if (!p) return null;
    return <span style={{ fontSize: cellSize * 0.65, lineHeight: 1 }}>{PIECES[p]}</span>;
  };

  const statusText = gameOver
    ? gameOver === 'stalemate' ? '무승부 (스테일메이트)'
      : gameOver === 'checkmate-white'
        ? mode === 'ai' ? '🏆 승리! (체크메이트)' : '⚪ 백 승리!'
        : mode === 'ai' ? '컴퓨터 승리 (체크메이트)' : '⚫ 흑 승리!'
    : mode === 'ai' && turn === 'black'
      ? (aiThinking ? '🤖 컴퓨터 생각 중...' : '컴퓨터 차례')
      : mode === 'ai'
        ? (inCheck ? '⚠️ 체크! 내 차례 (백)' : '내 차례 (백)')
        : inCheck ? `⚠️ ${turn === 'white' ? '백' : '흑'} 체크!`
          : `${turn === 'white' ? '⚪ 백' : '⚫ 흑'} 차례`;

  return (
    <>
      <BackBar title={mode === 'ai' ? '체스 · AI 대전' : '체스 · 로컬'} onBack={exitToHome} dark={dark} />
      <div style={{ paddingBottom: 12, maxWidth: 520, margin: '0 auto' }}>
        {/* Status */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px',
          background: gameOver ? (dark ? '#78350F' : '#FEF3C7') : (inCheck ? (dark ? '#450A0A' : '#FEE2E2') : cardBg),
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <div style={{ fontSize: 12, color: textSecondary }}>
            ⚪ {captured.white.map((p, i) => <span key={i} style={{ fontSize: 16 }}>{PIECES[p]}</span>)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: gameOver ? goldColor : textPrimary }}>
            {statusText}
          </div>
          <div style={{ fontSize: 12, color: textSecondary }}>
            ⚫ {captured.black.map((p, i) => <span key={i} style={{ fontSize: 16 }}>{PIECES[p]}</span>)}
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6,
          padding: '6px 0', background: cardBg,
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <button onClick={undo} disabled={mode === 'ai' || history.length === 0 || !!gameOver}
            style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              opacity: (mode === 'ai' || history.length === 0 || gameOver) ? 0.4 : 1,
            }}>↩ 무르기</button>
          <button onClick={reset}
            style={{
              background: 'none', border: `1px solid ${cardBorder}`, color: textSecondary,
              fontSize: 12, borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
            }}>새 게임</button>
        </div>

        {/* Board */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div style={{ border: '3px solid #5D4037', borderRadius: 4 }}>
            {board.map((row, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {row.map((cell, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selected && selected[0] === r && selected[1] === c;
                  const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
                  const isLast = lastMove && ((lastMove[0][0] === r && lastMove[0][1] === c) || (lastMove[1][0] === r && lastMove[1][1] === c));
                  const isKingCheck = inCheck && cell && cell.toUpperCase() === 'K' && isAlly(cell, turn);

                  let bg = isDark ? '#B58863' : '#F0D9B5';
                  if (isSelected) bg = '#7B61FF';
                  else if (isLast) bg = isDark ? '#AAA23A' : '#CDD26A';
                  else if (isKingCheck) bg = '#E74C3C';

                  return (
                    <div key={c}
                      onClick={() => handleClick(r, c)}
                      style={{
                        width: cellSize, height: cellSize,
                        background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: (mode === 'ai' ? (turn === 'white' && !aiThinking) : true) && !gameOver ? 'pointer' : 'default',
                        position: 'relative',
                      }}
                    >
                      {renderPiece(cell)}
                      {isLegal && !cell && (
                        <div style={{
                          position: 'absolute', width: cellSize * 0.25, height: cellSize * 0.25,
                          borderRadius: '50%', background: 'rgba(0,0,0,0.2)',
                        }} />
                      )}
                      {isLegal && cell && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          border: `3px solid rgba(0,0,0,0.3)`, borderRadius: '50%',
                        }} />
                      )}
                      {c === 0 && (
                        <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 8, color: isDark ? '#F0D9B5' : '#B58863' }}>
                          {8 - r}
                        </span>
                      )}
                      {r === 7 && (
                        <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, color: isDark ? '#F0D9B5' : '#B58863' }}>
                          {'abcdefgh'[c]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Promotion */}
        {promotion && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, padding: '12px',
            background: dark ? '#78350F' : '#FFF9E6', borderRadius: 12, margin: '0 12px',
            border: `2px solid ${goldColor}`,
          }}>
            <span style={{ alignSelf: 'center', fontSize: 13, fontWeight: 600, color: dark ? '#FDE68A' : '#78350F' }}>승급:</span>
            {(['Q', 'R', 'B', 'N'] as const).map(p => (
              <button key={p} onClick={() => promote(p)}
                style={{
                  width: 48, height: 48, borderRadius: 10,
                  border: `2px solid ${cardBorder}`,
                  background: cardBg, fontSize: 30, cursor: 'pointer',
                }}>
                {PIECES[(turn === 'white' ? p : p.toLowerCase()) as PieceCode]}
              </button>
            ))}
          </div>
        )}

        {/* Game over box */}
        {gameOver && (
          <div style={{
            margin: 12, padding: 20, borderRadius: 14, textAlign: 'center',
            background: dark ? 'linear-gradient(135deg, #78350F, #92400E)' : 'linear-gradient(135deg, #FFF9E6, #FEF3C7)',
            border: `2px solid ${goldColor}`,
            color: dark ? '#FDE68A' : '#78350F',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>
              {gameOver === 'stalemate' ? '🤝' : '🏆'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {statusText}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={doReset}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: goldColor, color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                다시 하기
              </button>
              <button onClick={exitToHome}
                style={{ padding: '10px 24px', borderRadius: 10, border: `1px solid ${cardBorder}`, cursor: 'pointer', background: 'transparent', color: textSecondary, fontSize: 14, fontWeight: 600 }}>
                게임 목록
              </button>
            </div>
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
