import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square as ChessSquare, Color, PieceSymbol } from 'chess.js';

// Define types
type Piece = {
  type: PieceSymbol;
  color: Color;
};

type Position = `${number},${number}`;

type Move = {
  startPos: Position;
  endPos: Position;
  piece: Piece;
  capturedPiece: Piece | null;
};

const App: React.FC = () => {
  // Initialize chess.js instance
  const chessRef = useRef<Chess>(new Chess());
  
  // State for the board
  const [board, setBoard] = useState<(Piece | null)[][]>(getInitialBoard());
  
  // State for captured pieces
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  
  // State for move history
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  
  // State for game status
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isCheckmate, setIsCheckmate] = useState<boolean>(false);
  const [winner, setWinner] = useState<Color | null>(null);
  
  // State for selection and legal moves
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  
  // State for drag-and-drop
  const [draggedPiece, setDraggedPiece] = useState<Position | null>(null);
  
  // State for invalid move feedback
  const [invalidMove, setInvalidMove] = useState<Position | null>(null);

  // Initialize board from chess.js state
  function getInitialBoard(): (Piece | null)[][] {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = `${String.fromCharCode(97 + j)}${8 - i}` as ChessSquare;
        const piece = chessRef.current.get(square);
        if (piece) {
          board[i][j] = {
            type: piece.type,
            color: piece.color
          };
        }
      }
    }
    return board;
  }

  // Initialize board on component mount
  useEffect(() => {
    updateBoard();
  }, []);

  // Function to update board from chess.js
  const updateBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = `${String.fromCharCode(97 + j)}${8 - i}` as ChessSquare;
        const piece = chessRef.current.get(square);
        if (piece) {
          newBoard[i][j] = {
            type: piece.type,
            color: piece.color
          };
        }
      }
    }
    setBoard(newBoard);
  };

  // Convert between our position format and chess.js square format
  const positionToSquare = (position: Position): ChessSquare => {
    const [row, col] = position.split(',').map(Number);
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    return `${file}${rank}` as ChessSquare;
  };

  const squareToPosition = (square: ChessSquare): Position => {
    const file = square.charAt(0);
    const rank = parseInt(square.charAt(1));
    const col = file.charCodeAt(0) - 97;
    const row = 8 - rank;
    return `${row},${col}` as Position;
  };

  // Get legal moves for a piece
  const getLegalMoves = (pos: Position): Position[] => {
    const square = positionToSquare(pos);
    const moves = chessRef.current.moves({ square, verbose: true });
    return moves.map(move => squareToPosition(move.to));
  };

  // Execute a move
  const executeMove = (from: Position, to: Position) => {
    const fromSquare = positionToSquare(from);
    const toSquare = positionToSquare(to);
    const piece = chessRef.current.get(fromSquare);

    try {
      const moveResult = chessRef.current.move({
        from: fromSquare,
        to: toSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (!moveResult) {
        setInvalidMove(to);
        setTimeout(() => setInvalidMove(null), 500);
        return;
      }

      // Update board
      updateBoard();

      // Handle captured piece
      if (moveResult.captured) {
        const capturedPiece: Piece = {
          type: moveResult.captured,
          color: moveResult.color === 'w' ? 'b' : 'w'
        };
        if (capturedPiece.color === 'w') {
          setCapturedWhite(prev => [...prev, capturedPiece]);
        } else {
          setCapturedBlack(prev => [...prev, capturedPiece]);
        }
      }

      // Update move history
      const move: Move = {
        startPos: from,
        endPos: to,
        piece: {
          type: moveResult.piece,
          color: moveResult.color
        },
        capturedPiece: moveResult.captured ? {
          type: moveResult.captured,
          color: moveResult.color === 'w' ? 'b' : 'w'
        } : null
      };
      setMoveHistory(prev => [...prev, move]);

      // Update game status
      setIsCheck(chessRef.current.isCheck());
      setIsCheckmate(chessRef.current.isCheckmate());
      if (chessRef.current.isCheckmate()) {
        setWinner(moveResult.color);
      }

      // Clear selection
      setSelectedPiece(null);
      setLegalMoves([]);
    } catch (error) {
      setInvalidMove(to);
      setTimeout(() => setInvalidMove(null), 500);
    }
  };

  // Handle undoing a move
  const handleUndo = () => {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    chessRef.current.undo();
    
    // Update board
    updateBoard();

    // Remove last move from history
    setMoveHistory(prev => prev.slice(0, -1));

    // Handle captured pieces
    if (lastMove.capturedPiece) {
      if (lastMove.capturedPiece.color === 'w') {
        setCapturedWhite(prev => prev.slice(0, -1));
      } else {
        setCapturedBlack(prev => prev.slice(0, -1));
      }
    }

    // Update game status
    setIsCheck(chessRef.current.isCheck());
    setIsCheckmate(chessRef.current.isCheckmate());
    if (!chessRef.current.isCheckmate()) {
      setWinner(null);
    }

    // Clear selection
    setSelectedPiece(null);
    setLegalMoves([]);
  };

  // Click handler
  const handleClick = (position: Position) => {
    const square = positionToSquare(position);
    const piece = chessRef.current.get(square);

    if (selectedPiece) {
      executeMove(selectedPiece, position);
      return;
    }

    if (piece && piece.color === chessRef.current.turn()) {
      setSelectedPiece(position);
      setLegalMoves(getLegalMoves(position));
    } else {
      setSelectedPiece(null);
      setLegalMoves([]);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, position: Position) => {
    const square = positionToSquare(position);
    const piece = chessRef.current.get(square);

    if (piece && piece.color === chessRef.current.turn()) {
      setDraggedPiece(position);
      setSelectedPiece(position);
      setLegalMoves(getLegalMoves(position));

      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.5';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 32, 32);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    } else {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent, position: Position) => {
    e.preventDefault();
    if (!draggedPiece) return;

    executeMove(draggedPiece, position);
    setDraggedPiece(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Captured Pieces Display */}
      <div className="flex mb-4">
        <div className="mr-8">
          <h2 className="text-lg font-semibold mb-2">Captured White Pieces:</h2>
          <div className="flex flex-wrap">
            {capturedWhite.map((piece, index) => (
              <img
                key={`w-capture-${index}`}
                src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                alt={`${piece.color}${piece.type}`}
                className="w-8 h-8 mr-1 mb-1"
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Captured Black Pieces:</h2>
          <div className="flex flex-wrap">
            {capturedBlack.map((piece, index) => (
              <img
                key={`b-capture-${index}`}
                src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                alt={`${piece.color}${piece.type}`}
                className="w-8 h-8 mr-1 mb-1"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chessboard */}
      <div className="grid grid-cols-8 gap-0 border-2 border-gray-800">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isBlackSquare = (rowIndex + colIndex) % 2 === 1;
            const position = `${rowIndex},${colIndex}` as Position;
            const isInvalid = invalidMove === position;
            const isHighlighted = legalMoves.includes(position);
            const isSelected = selectedPiece === position;

            return (
              <div
                key={position}
                className={`w-16 h-16 flex items-center justify-center
                  ${isBlackSquare ? 'bg-gray-600' : 'bg-gray-200'}
                  ${draggedPiece === position ? 'opacity-50' : ''}
                  ${isInvalid ? 'bg-red-400' : ''}
                  ${isHighlighted ? 'bg-green-400 bg-opacity-25' : ''}
                  ${isSelected ? 'border-2 border-blue-500' : ''}
                `}
                onDrop={e => handleDrop(e, position)}
                onDragOver={handleDragOver}
                onClick={() => handleClick(position)}
              >
                {piece && (
                  <img
                    src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                    alt={`${piece.color}${piece.type}`}
                    className="w-12 h-12 cursor-grab"
                    draggable
                    onDragStart={e => handleDragStart(e, position)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Turn Indicator and Undo Button */}
      <div className="mt-4 flex items-center">
        <div className="text-xl font-bold mr-4">
          {chessRef.current.turn() === 'w' ? "White's turn" : "Black's turn"}
        </div>

        <button
          onClick={handleUndo}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none ${
            moveHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={moveHistory.length === 0}
          title="Undo Last Move"
        >
          ↺ Undo
        </button>
      </div>

      {/* Notifications */}
      {isCheck && !isCheckmate && (
        <div className="mt-4 text-red-600 font-semibold">
          {chessRef.current.turn() === 'w' ? "Black is in Check!" : "White is in Check!"}
        </div>
      )}

      {isCheckmate && winner && (
        <div className="mt-4 text-red-800 font-bold text-2xl">
          {winner === 'w' ? "White Wins by Checkmate!" : "Black Wins by Checkmate!"}
        </div>
      )}
    </div>
  );
};

export default App;