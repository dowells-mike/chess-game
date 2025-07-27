import { Board, Color, Position, PieceType, Move, Piece } from './types';
import { getLegalMoves, isInCheck, isInCheckmate } from './chess-check-detection';

// Piece values for evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  'p': 100,
  'n': 320,
  'b': 330,
  'r': 500,
  'q': 900,
  'k': 20000
};

// Position evaluation tables (piece-square tables)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_GAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

const KING_END_GAME_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

// AI difficulty levels
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface AIConfig {
  depth: number;
  randomFactor: number; // 0-1, higher means more random moves
  evaluationWeight: number; // How much to weight positional vs material
}

const AI_CONFIGS: Record<AIDifficulty, AIConfig> = {
  easy: { depth: 2, randomFactor: 0.3, evaluationWeight: 0.7 },
  medium: { depth: 3, randomFactor: 0.15, evaluationWeight: 0.85 },
  hard: { depth: 4, randomFactor: 0.05, evaluationWeight: 0.95 },
  expert: { depth: 5, randomFactor: 0.01, evaluationWeight: 1.0 }
};

// Convert our internal position format to standard chess notation
export const positionToAlgebraic = (pos: Position): string => {
  const [row, col] = pos.split(',').map(Number);
  const file = String.fromCharCode(97 + col); // a-h
  const rank = 8 - row; // 1-8
  return file + rank;
};

// Convert standard chess notation to our internal position format
export const algebraicToPosition = (algebraic: string): Position => {
  const file = algebraic.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(algebraic[1]); // 1-8
  const row = 8 - rank; // Convert to 0-7 from top
  return `${row},${file}` as Position;
};

// Convert our board to FEN notation
export const boardToFEN = (
  board: Board, 
  turn: Color, 
  castlingRights: { wKingSide: boolean; wQueenSide: boolean; bKingSide: boolean; bQueenSide: boolean },
  enPassantTarget: string | null,
  halfMoveClock: number = 0,
  fullMoveNumber: number = 1
): string => {
  let fen = '';
  
  // Board position
  for (let row = 0; row < 8; row++) {
    let emptyCount = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        const pieceChar = piece.type === 'n' ? 'n' : piece.type;
        fen += piece.color === 'w' ? pieceChar.toUpperCase() : pieceChar;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (row < 7) fen += '/';
  }
  
  // Active color
  fen += ` ${turn}`;
  
  // Castling rights
  let castling = '';
  if (castlingRights.wKingSide) castling += 'K';
  if (castlingRights.wQueenSide) castling += 'Q';
  if (castlingRights.bKingSide) castling += 'k';
  if (castlingRights.bQueenSide) castling += 'q';
  fen += ` ${castling || '-'}`;
  
  // En passant target
  fen += ` ${enPassantTarget ? positionToAlgebraic(enPassantTarget as Position) : '-'}`;
  
  // Half-move clock and full-move number
  fen += ` ${halfMoveClock} ${fullMoveNumber}`;
  
  return fen;
};

// Evaluate board position from the perspective of the given color
const evaluatePosition = (board: Board, color: Color, isEndGame: boolean = false): number => {
  let score = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const pieceValue = PIECE_VALUES[piece.type];
      const colorMultiplier = piece.color === color ? 1 : -1;
      
      // Material value
      score += pieceValue * colorMultiplier;
      
      // Positional value
      const squareIndex = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;
      let positionalValue = 0;
      
      switch (piece.type) {
        case 'p':
          positionalValue = PAWN_TABLE[squareIndex];
          break;
        case 'n':
          positionalValue = KNIGHT_TABLE[squareIndex];
          break;
        case 'b':
          positionalValue = BISHOP_TABLE[squareIndex];
          break;
        case 'r':
          positionalValue = ROOK_TABLE[squareIndex];
          break;
        case 'q':
          positionalValue = QUEEN_TABLE[squareIndex];
          break;
        case 'k':
          positionalValue = isEndGame ? KING_END_GAME_TABLE[squareIndex] : KING_MIDDLE_GAME_TABLE[squareIndex];
          break;
      }
      
      score += positionalValue * colorMultiplier;
    }
  }
  
  return score;
};

// Check if position is endgame (simplified heuristic)
const isEndGame = (board: Board): boolean => {
  let materialCount = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type !== 'k' && piece.type !== 'p') {
        materialCount += PIECE_VALUES[piece.type];
      }
    }
  }
  return materialCount < 2500; // Threshold for endgame
};

// Simulate a move on the board
const simulateMove = (board: Board, move: { from: Position; to: Position }): Board => {
  const newBoard = board.map(row => [...row]);
  const [fromRow, fromCol] = move.from.split(',').map(Number);
  const [toRow, toCol] = move.to.split(',').map(Number);
  
  const piece = newBoard[fromRow][fromCol];
  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = null;
  
  return newBoard;
};

// Minimax algorithm with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  aiColor: Color
): number => {
  if (depth === 0) {
    return evaluatePosition(board, aiColor, isEndGame(board));
  }
  
  const currentColor = maximizingPlayer ? aiColor : (aiColor === 'w' ? 'b' : 'w');
  
  // Get all possible moves for current player
  const allMoves: { from: Position; to: Position }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === currentColor) {
        const pos = `${row},${col}` as Position;
        const legalMoves = getLegalMoves(pos, piece, board);
        for (const move of legalMoves) {
          allMoves.push({ from: pos, to: move });
        }
      }
    }
  }
  
  if (allMoves.length === 0) {
    // No legal moves - checkmate or stalemate
    if (isInCheck(board, currentColor)) {
      return maximizingPlayer ? -20000 : 20000; // Checkmate
    } else {
      return 0; // Stalemate
    }
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of allMoves) {
      const newBoard = simulateMove(board, move);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of allMoves) {
      const newBoard = simulateMove(board, move);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
};

// Get the best move for the AI
export const getBestMove = async (
  board: Board,
  aiColor: Color,
  difficulty: AIDifficulty = 'medium',
  timeLimit: number = 5000 // milliseconds
): Promise<{ from: Position; to: Position } | null> => {
  const config = AI_CONFIGS[difficulty];
  
  // Get all possible moves for the AI
  const allMoves: { from: Position; to: Position; score?: number }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === aiColor) {
        const pos = `${row},${col}` as Position;
        const legalMoves = getLegalMoves(pos, piece, board);
        for (const move of legalMoves) {
          allMoves.push({ from: pos, to: move });
        }
      }
    }
  }
  
  if (allMoves.length === 0) {
    return null; // No legal moves
  }
  
  // Add randomness for easier difficulties
  if (config.randomFactor > 0 && Math.random() < config.randomFactor) {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }
  
  // Evaluate each move using minimax
  const startTime = Date.now();
  for (const move of allMoves) {
    if (Date.now() - startTime > timeLimit) break; // Time limit check
    
    const newBoard = simulateMove(board, move);
    move.score = minimax(newBoard, config.depth - 1, -Infinity, Infinity, false, aiColor);
  }
  
  // Sort moves by score (best first)
  allMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Select from top moves with some randomness
  const topMoves = allMoves.slice(0, Math.max(1, Math.floor(allMoves.length * 0.2)));
  const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
  
  return { from: selectedMove.from, to: selectedMove.to };
};

// Convert move to standard algebraic notation
export const moveToSAN = (
  board: Board,
  move: { from: Position; to: Position },
  piece: Piece
): string => {
  const [toRow, toCol] = move.to.split(',').map(Number);
  const toFile = String.fromCharCode(97 + toCol);
  const toRank = 8 - toRow;
  
  if (piece.type === 'p') {
    return `${toFile}${toRank}`;
  }
  
  return `${piece.type.toUpperCase()}${toFile}${toRank}`;
};

// Check if AI should offer draw
export const shouldOfferDraw = (
  board: Board,
  aiColor: Color,
  moveHistory: Move[],
  evaluation: number
): boolean => {
  // Offer draw if position is very equal (evaluation close to 0)
  if (Math.abs(evaluation) < 50) {
    return Math.random() < 0.1; // 10% chance in equal positions
  }
  
  // Offer draw if losing significantly and many moves played
  if (evaluation < -200 && moveHistory.length > 40) {
    return Math.random() < 0.2; // 20% chance when losing in endgame
  }
  
  return false;
};

export default {
  getBestMove,
  boardToFEN,
  positionToAlgebraic,
  algebraicToPosition,
  moveToSAN,
  shouldOfferDraw
};
