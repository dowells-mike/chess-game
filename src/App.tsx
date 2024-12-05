import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import {
  getLegalMoves,
  isInCheck,
  isInCheckmate,
  wouldBeInCheck,
  findKing
} from './chess-check-detection';


// Switch component implementation
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input bg-gray-200 data-[state=checked]:bg-blue-600"
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

type Color = "w" | "b";
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
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

interface LastMove {
  from: Position;
  to: Position;
}
interface PromotionState {
  from: Position;
  to: Position;
  color: Color;
}


const INITIAL_BOARD: Board = [
  [
    { type: "r", color: "b", hasMoved: false },
    { type: "n", color: "b", hasMoved: false },
    { type: "b", color: "b", hasMoved: false },
    { type: "q", color: "b", hasMoved: false },
    { type: "k", color: "b", hasMoved: false },
    { type: "b", color: "b", hasMoved: false },
    { type: "n", color: "b", hasMoved: false },
    { type: "r", color: "b", hasMoved: false },
  ],
  Array(8)
    .fill(null)
    .map(() => ({ type: "p", color: "b" })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8)
    .fill(null)
    .map(() => ({ type: "p", color: "w" })),
  [
    { type: "r", color: "w" },
    { type: "n", color: "w" },
    { type: "b", color: "w" },
    { type: "q", color: "w" },
    { type: "k", color: "w" },
    { type: "b", color: "w" },
    { type: "n", color: "w" },
    { type: "r", color: "w" },
  ],
];

const App: React.FC = () => {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [turn, setTurn] = useState<Color>('w');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{ w: Piece[], b: Piece[] }>({ w: [], b: [] });
  const [promotionState, setPromotionState] = useState<PromotionState | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [animatingPiece, setAnimatingPiece] = useState<{
    piece: Piece;
    from: Position;
    to: Position;
  } | null>(null);
  const [selectedHistoryMove, setSelectedHistoryMove] = useState<Move | null>(null);


  // Replace the existing getPieceMoves function with this one
  const getPieceMoves = (pos: Position, piece: Piece): Position[] => {
    const lastMove: LastMove | undefined = 
      moveHistory.length > 0 
        ? { 
            from: moveHistory[moveHistory.length - 1].startPos, 
            to: moveHistory[moveHistory.length - 1].endPos 
          } 
        : undefined;
    
    return getLegalMoves(pos, piece, board, lastMove);
  };

  const isSquareUnderAttack = (
    pos: Position,
    attackingColor: Color
  ): boolean => {
    const [targetRow, targetCol] = pos.split(",").map(Number);

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
    const [row, col] = pos.split(",").map(Number);
    const piece = board[row][col];

    if (selectedPos) {
      const selectedPiece =
        board[Number(selectedPos.split(",")[0])][
          Number(selectedPos.split(",")[1])
        ];
      if (selectedPiece && isValidMove(selectedPos, pos)) {
        const [fromRow, fromCol] = selectedPos.split(",").map(Number);
        const [toRow, toCol] = pos.split(",").map(Number);

        // Start animation
        setAnimatingPiece({
          piece: selectedPiece,
          from: selectedPos,
          to: pos,
        });

        // Set last move for trail highlighting
        setLastMove({ from: selectedPos, to: pos });

        // Delay the actual move to allow animation to complete
        setTimeout(() => {
          makeMove(selectedPos, pos);
          setAnimatingPiece(null);
        }, 300); // Match this with CSS transition duration
      }
      setSelectedPos(null);
    } else if (piece && piece.color === turn) {
      setSelectedPos(pos);
    }
  };

  const isValidMove = (from: Position, to: Position): boolean => {
    const [fromRow, fromCol] = from.split(",").map(Number);
    const piece = board[fromRow][fromCol];
    if (!piece || piece.color !== turn) return false;

    const validMoves = getPieceMoves(from, piece);
    return validMoves.includes(to);
  };

  const makeMove = (from: Position, to: Position) => {
    const [fromRow, fromCol] = from.split(",").map(Number);
    const [toRow, toCol] = to.split(",").map(Number);
  
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
  
    if (!piece) return;

    const newBoard = board.map((row) => [...row]);

    // En passant capture
    if (piece.type === 'p') {
      const direction = piece.color === 'w' ? -1 : 1;
      if (Math.abs(fromCol - toCol) === 1 && !targetPiece) {
        // Remove the captured pawn
        newBoard[toRow - direction][toCol] = null;
        
        // Update captured pieces
        const capturedEnPassantPawn = board[toRow - direction][toCol];
        if (capturedEnPassantPawn) {
          setCapturedPieces((prev) => ({
            ...prev,
            [capturedEnPassantPawn.color]: [...prev[capturedEnPassantPawn.color], capturedEnPassantPawn],
          }));
        }
      }
    }
    
    // handle castling movement
    if (piece.type === 'k' && Math.abs(toCol - fromCol) === 2) {
      // Kingside castling
      if (toCol === 6) {
        newBoard[fromRow][5] = newBoard[fromRow][7]; // Move rook
        newBoard[fromRow][7] = null;
        newBoard[fromRow][5]!.hasMoved = true;
      }
      // Queenside castling
      else if (toCol === 2) {
        newBoard[fromRow][3] = newBoard[fromRow][0]; // Move rook
        newBoard[fromRow][0] = null;
        newBoard[fromRow][3]!.hasMoved = true;
      }
    }
  
    // Check for pawn promotion
    if (piece.type === "p" && (toRow === 0 || toRow === 7)) {
      setPromotionState({ from, to, color: piece.color });
      return;
    }
  
    newBoard[toRow][toCol] = { ...piece, hasMoved: true };
    newBoard[fromRow][fromCol] = null;
  
    if (targetPiece) {
      setCapturedPieces((prev) => ({
        ...prev,
        [targetPiece.color]: [...prev[targetPiece.color], targetPiece],
      }));
    }
  
    // Update the board first
    setBoard(newBoard);
    
    // Check if the opponent is in check or checkmate
    const nextTurn = turn === "w" ? "b" : "w";
    const isOpponentInCheck = isInCheck(newBoard, nextTurn);
    const isOpponentInCheckmate = isInCheckmate(newBoard, nextTurn);
    
    setIsCheck(isOpponentInCheck);
    setIsCheckmate(isOpponentInCheckmate);
    
    // Update turn and move history
    setTurn(nextTurn);
    setMoveHistory((prev) => [
      ...prev,
      {
        startPos: from,
        endPos: to,
        piece,
        capturedPiece: targetPiece,
      },
    ]);
  };
  
  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionState) return;

    const [fromRow, fromCol] = promotionState.from.split(",").map(Number);
    const [toRow, toCol] = promotionState.to.split(",").map(Number);

    const newBoard = board.map((row) => [...row]);
    newBoard[toRow][toCol] = { type: pieceType, color: promotionState.color };
    newBoard[fromRow][fromCol] = null;

    setBoard(newBoard);
    setTurn(turn === "w" ? "b" : "w");
    setPromotionState(null);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;
  
    const lastMove = moveHistory[moveHistory.length - 1];
    const [fromRow, fromCol] = lastMove.startPos.split(",").map(Number);
    const [toRow, toCol] = lastMove.endPos.split(",").map(Number);
  
    const newBoard = board.map((row) => [...row]);
    newBoard[fromRow][fromCol] = { ...lastMove.piece, hasMoved: false };
    newBoard[toRow][toCol] = lastMove.capturedPiece;
  
    // Undo castling
    if (lastMove.piece.type === 'k' && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) { // Kingside
        newBoard[fromRow][7] = newBoard[fromRow][5];
        newBoard[fromRow][5] = null;
        const kingsSideRook = newBoard[fromRow][7];
        if (kingsSideRook && 'hasMoved' in kingsSideRook) {
          kingsSideRook.hasMoved = false;
        }
      } else if (toCol === 2) { // Queenside
        newBoard[fromRow][0] = newBoard[fromRow][3];
        newBoard[fromRow][3] = null;
        const queensSideRook = newBoard[fromRow][0];
        if (queensSideRook && 'hasMoved' in queensSideRook) {
          queensSideRook.hasMoved = false;
        }
      }
    }
  
    if (lastMove.capturedPiece) {
      setCapturedPieces((prev) => ({
        ...prev,
        [lastMove.capturedPiece!.color]: prev[
          lastMove.capturedPiece!.color
        ].slice(0, -1),
      }));
    }
  
    setBoard(newBoard);
    setTurn(turn === "w" ? "b" : "w");
    setMoveHistory((prev) => prev.slice(0, -1));
    
    // Reset check and checkmate state
    setIsCheck(isInCheck(newBoard, turn === "w" ? "b" : "w"));
    setIsCheckmate(false);
  };

  const convertMoveToSAN = (move: Move, board: Board, moveHistory: Move[]): string => {
    const { piece, startPos, endPos, capturedPiece } = move;
    const [fromRow, fromCol] = startPos.split(',').map(Number);
    const [toRow, toCol] = endPos.split(',').map(Number);
    
    // Convert numeric coordinates to chess notation
    const fromFile = String.fromCharCode(97 + fromCol);
    const fromRank = 8 - fromRow;
    const toFile = String.fromCharCode(97 + toCol);
    const toRank = 8 - toRow;
    
    // Handle special moves
    switch (piece.type) {
      case 'k':
        // Castling
        if (Math.abs(fromCol - toCol) === 2) {
          return toCol > fromCol ? 'O-O' : 'O-O-O';
        }
        break;
      
      case 'p':
        // En passant
        if (Math.abs(fromCol - toCol) === 1 && !capturedPiece) {
          return `${fromFile}x${toFile}${toRank} e.p.`;
        }
        
        // Promotion
        if (toRow === 0 || toRow === 7) {
          // Determine promotion piece (you might need to pass this information)
          const promotionPiece = 'q'; // Default to queen, adjust as needed
          return `${fromFile}${toRank}=${promotionPiece.toUpperCase()}`;
        }
        break;
    }
    
    // Disambiguate moves when multiple pieces of the same type can move to the same square
    const disambiguateMove = () => {
      let disambiguator = '';
      
      // Find all pieces of the same type and color that can move to the target square
      const similarPieces = board.flatMap((row, rowIndex) => 
        row.map((boardPiece, colIndex) => ({
          piece: boardPiece,
          pos: `${rowIndex},${colIndex}` as Position
        }))
        .filter(({ piece: boardPiece, pos }) => 
          boardPiece?.type === piece.type && 
          boardPiece.color === piece.color && 
          pos !== startPos && 
          getLegalMoves(pos, boardPiece, board).includes(endPos)
        )
      );
      
      if (similarPieces.length > 0) {
        // Disambiguate by file or rank
        const sameFileConflicts = similarPieces.filter(
          ({ pos }) => pos.split(',')[1] === fromCol.toString()
        );
        const sameRankConflicts = similarPieces.filter(
          ({ pos }) => pos.split(',')[0] === fromRow.toString()
        );
        
        if (sameFileConflicts.length > 0) {
          disambiguator = fromRank.toString();
        } else if (sameRankConflicts.length > 0) {
          disambiguator = fromFile;
        } else {
          disambiguator = fromFile + fromRank;
        }
      }
      
      return disambiguator;
    };
    
    // Construct the move notation
    const pieceSymbol = piece.type === 'p' ? '' : piece.type.toUpperCase();
    const captureSymbol = capturedPiece ? 'x' : '';
    const disambiguator = piece.type !== 'p' ? disambiguateMove() : '';
    
    // Check
    const boardAfterMove = board.map(row => [...row]);
    boardAfterMove[toRow][toCol] = { ...piece, hasMoved: true };
    boardAfterMove[fromRow][fromCol] = null;
    
    const isCheck = isInCheck(boardAfterMove, piece.color === 'w' ? 'b' : 'w');
    const isCheckmate = isInCheckmate(boardAfterMove, piece.color === 'w' ? 'b' : 'w');
    
    const checkSymbol = isCheckmate ? '#' : (isCheck ? '+' : '');
    
    return `${pieceSymbol}${disambiguator}${captureSymbol}${toFile}${toRank}${checkSymbol}`;
  };

  return (
    <div className="flex items-center justify-center gap-8 min-h-screen bg-gray-100">
      <div>
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
              const isValidTarget =
                selectedPos && isValidMove(selectedPos, pos);
              const isDark = (rowIndex + colIndex) % 2 === 1;
              const isUnderAttack =
                showThreats &&
                piece &&
                piece.color === turn &&
                isSquareUnderAttack(pos, turn === "w" ? "b" : "w");
              const isAttackableBySelected =
                selectedPos &&
                piece &&
                piece.color !== turn &&
                isValidMove(selectedPos, pos);
              const isLastMoveFrom = lastMove?.from === pos;
              const isLastMoveTo = lastMove?.to === pos;
              const isCurrentPlayerPiece = piece && piece.color === turn;

              return (
                <div
                  key={pos}
                  className={`w-16 h-16 flex items-center justify-center relative cursor-pointer group
                    ${isDark ? "bg-gray-600" : "bg-gray-200"}
                    ${isLastMoveFrom || isLastMoveTo ? "!bg-yellow-200" : ""}
                    ${isUnderAttack ? "!bg-red-400" : ""}
                    ${isSelected ? "!bg-blue-400" : ""}
                    ${isValidTarget && !isAttackableBySelected ? "!bg-green-400" : ""}
                    ${isAttackableBySelected ? "!bg-red-600" : ""}
                    ${isCurrentPlayerPiece ? "hover:!bg-blue-300" : ""}
                    transition-colors duration-300
                  `}
                  onClick={() => handleSquareClick(pos)}
                >
                  {piece && (
                    <img
                      src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                      alt={`${piece.color}${piece.type}`}
                      className="w-12 h-12 pointer-events-none"
                    />
                  )}
                  {/* File and rank labels */}
                  {colIndex === 0 && (
                    <span className={`absolute left-1 top-1 text-xs font-semibold
                      ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                      {8 - rowIndex}
                    </span>
                  )}
                  {rowIndex === 7 && (
                    <span className={`absolute right-1 bottom-1 text-xs font-semibold
                      ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                      {String.fromCharCode(97 + colIndex)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {isCheck && !isCheckmate && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
    Check!
  </div>
)}

{isCheckmate && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold mb-4">Checkmate!</h2>
      <p className="text-xl mb-6">
        {turn === "w" ? "Black" : "White"} wins!
      </p>
      <button
        onClick={() => {
          setBoard(INITIAL_BOARD);
          setTurn("w");
          setSelectedPos(null);
          setLastMove(null);
          setCapturedPieces({ w: [], b: [] });
          setMoveHistory([]);
          setIsCheck(false);
          setIsCheckmate(false);
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        New Game
      </button>
    </div>
  </div>
)}

      {/* Side Panel */}
      <div className="w-64 bg-white bg-opacity-80 rounded-xl shadow-lg backdrop-blur-sm p-4">
  <div className="space-y-4">
    <div
      className={`p-4 rounded-lg transition-all duration-200 ${
        turn === "b" ? "bg-black/10 scale-105" : ""
      }`}
    >
      <h2 className="text-lg font-semibold mb-2">Black Player</h2>
    </div>


    <div
      className={`p-4 rounded-lg transition-all duration-200 ${
        turn === "w" ? "bg-black/10 scale-105" : ""
      }`}
    >
      <h2 className="text-lg font-semibold mb-2">White Player</h2>
    </div>


    <div className="space-y-4 p-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Show Threats</label>
        <Switch checked={showThreats} onCheckedChange={setShowThreats} />
      </div>


      <button
        onClick={handleUndo}
        disabled={moveHistory.length === 0}
        className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors group relative"
        title="Undo move"
      >
        <RotateCcw className="w-5 h-5" />
        <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs py-1 px-2 rounded -top-8 left-1/2 transform -translate-x-1/2">
          Undo move
        </span>
      </button>
    </div>


    {/* Move History Section */}
    {moveHistory.length > 0 && (
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold mb-2">Move History</h3>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">Move</th>
                <th className="px-2 py-1 text-left">Piece</th>
              </tr>
            </thead>
            <tbody>
              {moveHistory.map((move, index) => {
                // Reconstruct the board state up to this move
                const boardCopy = INITIAL_BOARD.map(row => [...row]);
                for (let i = 0; i <= index; i++) {
                  const historicalMove = moveHistory[i];
                  const [fromRow, fromCol] = historicalMove.startPos.split(',').map(Number);
                  const [toRow, toCol] = historicalMove.endPos.split(',').map(Number);
                  
                  boardCopy[toRow][toCol] = { ...historicalMove.piece, hasMoved: true };
                  boardCopy[fromRow][fromCol] = null;
                }


                return (
                  <tr 
                    key={index} 
                    className={`cursor-pointer hover:bg-gray-100 ${
                      selectedHistoryMove === move ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => {
                      setBoard(boardCopy);
                      setSelectedHistoryMove(move);
                      setLastMove({
                        from: move.startPos,
                        to: move.endPos
                      });
                    }}
                  >
                    <td className="px-2 py-1">
                      {convertMoveToSAN(move, boardCopy, moveHistory.slice(0, index))}
                    </td>
                    <td className="px-2 py-1">
                      <img
                        src={`/${move.piece.color}${move.piece.type.toUpperCase()}.svg`}
                        alt={`${move.piece.color}${move.piece.type}`}
                        className="w-5 h-5"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
      </div>

      {promotionState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Choose promotion piece:</h2>
            <div className="flex gap-4">
              {(["q", "r", "b", "n"] as PieceType[]).map((type) => (
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
