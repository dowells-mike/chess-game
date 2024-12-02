import React, { useState, useRef } from 'react';

type Color = 'w' | 'b';
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
type Position = `${number},${number}`;

interface Piece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

type Board = (Piece | null)[][];

interface Move {
  startPos: Position;
  endPos: Position;
  piece: Piece;
  capturedPiece: Piece | null;
}

interface PromotionState {
  from: Position;
  to: Position;
  color: Color;
}

const INITIAL_BOARD: Board = [
  [
    { type: 'r', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'q', color: 'b' },
    { type: 'k', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'r', color: 'b' },
  ],
  Array(8).fill(null).map(() => ({ type: 'p', color: 'b' })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'p', color: 'w' })),
  [
    { type: 'r', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'q', color: 'w' },
    { type: 'k', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'r', color: 'w' },
  ],
];

const App: React.FC = () => {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [turn, setTurn] = useState<Color>('w');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{ w: Piece[], b: Piece[] }>({ w: [], b: [] });
  const [promotionState, setPromotionState] = useState<PromotionState | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);

  const getPieceMoves = (pos: Position, piece: Piece): Position[] => {
    const [row, col] = pos.split(',').map(Number);
    const moves: Position[] = [];

    const addMove = (r: number, c: number) => {
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const targetPiece = board[r][c];
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(`${r},${c}`);
        }
      }
    };

    switch (piece.type) {
      case 'p':
        const direction = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;

        // Forward move
        if (!board[row + direction]?.[col]) {
          addMove(row + direction, col);
          // Initial two-square move
          if (row === startRow && !board[row + direction * 2]?.[col]) {
            addMove(row + direction * 2, col);
          }
        }

        // Captures
        for (const offset of [-1, 1]) {
          const targetRow = row + direction;
          const targetCol = col + offset;
          if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
            const targetPiece = board[targetRow][targetCol];
            if (targetPiece && targetPiece.color !== piece.color) {
              addMove(targetRow, targetCol);
            }
          }
        }
        break;

      case 'n':
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightMoves) {
          addMove(row + dr, col + dc);
        }
        break;

      case 'b':
      case 'r':
      case 'q':
        const directions = piece.type === 'r' 
          ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
          : piece.type === 'b'
          ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
          : [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dr, dc] of directions) {
          let r = row + dr;
          let c = col + dc;
          while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const targetPiece = board[r][c];
            if (!targetPiece) {
              addMove(r, c);
            } else {
              if (targetPiece.color !== piece.color) {
                addMove(r, c);
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        break;

      case 'k':
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        for (const [dr, dc] of kingMoves) {
          addMove(row + dr, col + dc);
        }
        break;
    }

    return moves;
  };

  const isSquareUnderAttack = (pos: Position, attackingColor: Color): boolean => {
    const [targetRow, targetCol] = pos.split(',').map(Number);
    
    // Check all squares for attacking pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === attackingColor) {
          const moves = getPieceMoves(`${row},${col}`, piece);
          if (moves.includes(pos)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleSquareClick = (pos: Position) => {
    const [row, col] = pos.split(',').map(Number);
    const piece = board[row][col];

    if (selectedPos) {
      const selectedPiece = board[Number(selectedPos.split(',')[0])][Number(selectedPos.split(',')[1])];
      if (selectedPiece && isValidMove(selectedPos, pos)) {
        makeMove(selectedPos, pos);
      }
      setSelectedPos(null);
    } else if (piece && piece.color === turn) {
      setSelectedPos(pos);
    }
  };

  const isValidMove = (from: Position, to: Position): boolean => {
    const [fromRow, fromCol] = from.split(',').map(Number);
    const piece = board[fromRow][fromCol];
    if (!piece || piece.color !== turn) return false;

    const validMoves = getPieceMoves(from, piece);
    return validMoves.includes(to);
  };

  const makeMove = (from: Position, to: Position) => {
    const [fromRow, fromCol] = from.split(',').map(Number);
    const [toRow, toCol] = to.split(',').map(Number);
    
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    if (!piece) return;

    // Check for pawn promotion
    if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
      setPromotionState({ from, to, color: piece.color });
      return;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[toRow][toCol] = { ...piece, hasMoved: true };
    newBoard[fromRow][fromCol] = null;

    if (targetPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [targetPiece.color]: [...prev[targetPiece.color], targetPiece]
      }));
    }

    setBoard(newBoard);
    setTurn(turn === 'w' ? 'b' : 'w');
    setMoveHistory(prev => [...prev, {
      startPos: from,
      endPos: to,
      piece,
      capturedPiece: targetPiece
    }]);
  };

  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionState) return;

    const [fromRow, fromCol] = promotionState.from.split(',').map(Number);
    const [toRow, toCol] = promotionState.to.split(',').map(Number);
    
    const newBoard = board.map(row => [...row]);
    newBoard[toRow][toCol] = { type: pieceType, color: promotionState.color };
    newBoard[fromRow][fromCol] = null;

    setBoard(newBoard);
    setTurn(turn === 'w' ? 'b' : 'w');
    setPromotionState(null);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    const [fromRow, fromCol] = lastMove.startPos.split(',').map(Number);
    const [toRow, toCol] = lastMove.endPos.split(',').map(Number);

    const newBoard = board.map(row => [...row]);
    newBoard[fromRow][fromCol] = lastMove.piece;
    newBoard[toRow][toCol] = lastMove.capturedPiece;

    if (lastMove.capturedPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [lastMove.capturedPiece!.color]: prev[lastMove.capturedPiece!.color].slice(0, -1)
      }));
    }

    setBoard(newBoard);
    setTurn(turn === 'w' ? 'b' : 'w');
    setMoveHistory(prev => prev.slice(0, -1));
    setIsCheck(false);
    setIsCheckmate(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Captured Pieces */}
      <div className="flex justify-between w-96 mb-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">Captured White:</h3>
          <div className="flex flex-wrap gap-1">
            {capturedPieces.w.map((piece, i) => (
              <img
                key={i}
                src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                alt={`${piece.color}${piece.type}`}
                className="w-6 h-6"
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Captured Black:</h3>
          <div className="flex flex-wrap gap-1">
            {capturedPieces.b.map((piece, i) => (
              <img
                key={i}
                src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                alt={`${piece.color}${piece.type}`}
                className="w-6 h-6"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-8 gap-0 border-2 border-gray-800">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const pos = `${rowIndex},${colIndex}` as Position;
            const isSelected = selectedPos === pos;
            const isValidTarget = selectedPos && isValidMove(selectedPos, pos);
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const isUnderAttack = piece && piece.color === turn && isSquareUnderAttack(pos, turn === 'w' ? 'b' : 'w');

            return (
              <div
                key={pos}
                className={`w-16 h-16 flex items-center justify-center
                  ${isDark ? 'bg-gray-600' : 'bg-gray-200'}
                  ${isSelected ? 'bg-blue-400' : ''}
                  ${isValidTarget ? 'bg-green-400' : ''}
                  ${isUnderAttack ? 'bg-red-400' : ''}
                  cursor-pointer
                `}
                onClick={() => handleSquareClick(pos)}
              >
                {piece && (
                  <img
                    src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                    alt={`${piece.color}${piece.type}`}
                    className="w-12 h-12"
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-4">
        <div className="text-xl font-bold">
          {turn === 'w' ? "White's turn" : "Black's turn"}
        </div>
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Undo
        </button>
      </div>

      {/* Promotion Modal */}
      {promotionState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Choose promotion piece:</h2>
            <div className="flex gap-4">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  <img
                    src={`/${promotionState.color}${type.toUpperCase()}.svg`}
                    alt={`${promotionState.color}${type}`}
                    className="w-16 h-16"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;