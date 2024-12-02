// App.tsx
import { useState } from 'react';

type Piece = {
  type: string;
  color: 'w' | 'b';
};

type Square = Piece | null;
type Board = Square[][];
type Position = `${number},${number}`;

type Move = {
  startPos: Position;
  endPos: Position;
  movedPiece: Piece;
  capturedPiece: Piece | null;
};

const initialBoard = (): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Set up pawns
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'P', color: 'b' };
    board[6][i] = { type: 'P', color: 'w' };
  }

  // Set up other pieces
  const backRow = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let i = 0; i < 8; i++) {
    board[0][i] = { type: backRow[i], color: 'b' };
    board[7][i] = { type: backRow[i], color: 'w' };
  }

  return board;
};

const isValidMove = (
  board: Board,
  startPos: Position,
  endPos: Position,
  piece: Piece
): boolean => {
  const [startRow, startCol] = startPos.split(',').map(Number);
  const [endRow, endCol] = endPos.split(',').map(Number);

  // Can't capture your own piece
  if (board[endRow][endCol]?.color === piece.color) return false;

  // Movement validation based on piece type
  switch (piece.type) {
    case 'P': { // Pawn
      const direction = piece.color === 'w' ? -1 : 1;
      const startingRow = piece.color === 'w' ? 6 : 1;

      // Regular forward move
      if (startCol === endCol && board[endRow][endCol] === null) {
        // One square forward
        if (endRow === startRow + direction) return true;

        // Two squares forward from starting position
        if (
          startRow === startingRow &&
          endRow === startRow + 2 * direction &&
          board[startRow + direction][startCol] === null
        ) {
          return true;
        }
      }

      // Diagonal capture
      if (
        Math.abs(startCol - endCol) === 1 &&
        endRow === startRow + direction &&
        board[endRow][endCol]?.color !== piece.color &&
        board[endRow][endCol] !== null
      ) {
        return true;
      }

      return false;
    }

    case 'R': { // Rook
      // Must move horizontally or vertically
      if (startRow !== endRow && startCol !== endCol) return false;

      // Check for pieces in the path
      const rowStep = startRow === endRow ? 0 : endRow > startRow ? 1 : -1;
      const colStep = startCol === endCol ? 0 : endCol > startCol ? 1 : -1;

      let currentRow = startRow + rowStep;
      let currentCol = startCol + colStep;

      while (currentRow !== endRow || currentCol !== endCol) {
        if (board[currentRow][currentCol] !== null) return false;
        currentRow += rowStep;
        currentCol += colStep;
      }

      return true;
    }

    case 'N': { // Knight
      const rowDiff = Math.abs(endRow - startRow);
      const colDiff = Math.abs(endCol - startCol);

      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    case 'B': { // Bishop
      const rowDiff = Math.abs(endRow - startRow);
      const colDiff = Math.abs(endCol - startCol);

      // Must move diagonally
      if (rowDiff !== colDiff) return false;

      const rowStep = endRow > startRow ? 1 : -1;
      const colStep = endCol > startCol ? 1 : -1;

      let currentRow = startRow + rowStep;
      let currentCol = startCol + colStep;

      while (currentRow !== endRow && currentCol !== endCol) {
        if (board[currentRow][currentCol] !== null) return false;
        currentRow += rowStep;
        currentCol += colStep;
      }

      return true;
    }

    case 'Q': { // Queen
      const rowDiff = Math.abs(endRow - startRow);
      const colDiff = Math.abs(endCol - startCol);

      // Queen can move like Rook or Bishop
      if (startRow === endRow || startCol === endCol) {
        // Rook-like movement
        const rowStep = startRow === endRow ? 0 : endRow > startRow ? 1 : -1;
        const colStep = startCol === endCol ? 0 : endCol > startCol ? 1 : -1;

        let currentRow = startRow + rowStep;
        let currentCol = startCol + colStep;

        while (currentRow !== endRow || currentCol !== endCol) {
          if (board[currentRow][currentCol] !== null) return false;
          currentRow += rowStep;
          currentCol += colStep;
        }

        return true;
      } else if (rowDiff === colDiff) {
        // Bishop-like movement
        const rowStep = endRow > startRow ? 1 : -1;
        const colStep = endCol > startCol ? 1 : -1;

        let currentRow = startRow + rowStep;
        let currentCol = startCol + colStep;

        while (currentRow !== endRow && currentCol !== endCol) {
          if (board[currentRow][currentCol] !== null) return false;
          currentRow += rowStep;
          currentCol += colStep;
        }

        return true;
      }

      return false;
    }

    case 'K': { // King
      const rowDiff = Math.abs(endRow - startRow);
      const colDiff = Math.abs(endCol - startCol);

      // King moves one square in any direction
      if (rowDiff <= 1 && colDiff <= 1) return true;

      return false;
    }

    default:
      return false; // Disallow any unrecognized pieces
  }
};

const App = () => {
  const [board, setBoard] = useState<Board>(initialBoard());
  const [draggedPiece, setDraggedPiece] = useState<Position | null>(null);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [invalidMove, setInvalidMove] = useState<Position | null>(null);

  // New state variables for selected piece and its legal moves
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);

  // New state variables for captured pieces
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);

  // New state for move history
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  // Function to get all legal moves for a piece at a given position
  const getLegalMoves = (pos: Position): Position[] => {
    const piece = board[parseInt(pos.split(',')[0])][parseInt(pos.split(',')[1])];
    if (!piece) return [];

    const moves: Position[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const targetPos = `${row},${col}` as Position;
        if (isValidMove(board, pos, targetPos, piece)) {
          moves.push(targetPos);
        }
      }
    }

    return moves;
  };

  // Function to execute a move from startPos to endPos
  const executeMove = (startPos: Position, endPos: Position) => {
    const [startRow, startCol] = startPos.split(',').map(Number);
    const [endRow, endCol] = endPos.split(',').map(Number);
    const piece = board[startRow][startCol];
    const targetPiece = board[endRow][endCol];
    
    if (piece && isValidMove(board, startPos, endPos, piece)) {
      const newBoard = board.map(row => [...row]);
      newBoard[endRow][endCol] = piece;
      newBoard[startRow][startCol] = null;
      
      setBoard(newBoard);
      setIsWhiteTurn(!isWhiteTurn);
      
      // Handle captured pieces
      if (targetPiece) {
        if (targetPiece.color === 'w') {
          setCapturedWhite(prev => [...prev, targetPiece]);
        } else {
          setCapturedBlack(prev => [...prev, targetPiece]);
        }
      }
      
      // Store move in history
      const move: Move = {
        startPos,
        endPos,
        movedPiece: piece,
        capturedPiece: targetPiece ? targetPiece : null,
      };
      setMoveHistory(prev => [...prev, move]);
      
      // Clear selection after move
      setSelectedPiece(null);
      setLegalMoves([]);
    } else {
      // Invalid move attempt via click
      setInvalidMove(endPos);
      setTimeout(() => setInvalidMove(null), 500);
    }
  };

  // Function to handle undoing the last move
  const handleUndo = () => {
    if (moveHistory.length === 0) return; // No moves to undo
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const { startPos, endPos, movedPiece, capturedPiece } = lastMove;
    
    const [startRow, startCol] = startPos.split(',').map(Number);
    const [endRow, endCol] = endPos.split(',').map(Number);
    
    const newBoard = board.map(row => [...row]);
    
    // Move the piece back to its original position
    newBoard[startRow][startCol] = movedPiece;
    
    // Restore the captured piece (if any)
    newBoard[endRow][endCol] = capturedPiece;
    
    setBoard(newBoard);
    
    // Remove the last captured piece from the captured lists
    if (capturedPiece) {
      if (capturedPiece.color === 'w') {
        setCapturedWhite(prev => prev.slice(0, -1));
      } else {
        setCapturedBlack(prev => prev.slice(0, -1));
      }
    }
    
    // Remove the last move from history
    setMoveHistory(prev => prev.slice(0, -1));
    
    // Toggle the turn back
    setIsWhiteTurn(!isWhiteTurn);
    
    // Clear any selection and highlights
    setSelectedPiece(null);
    setLegalMoves([]);
  };

  // Update handleDragStart to set selectedPiece and legalMoves
  const handleDragStart = (e: React.DragEvent, position: Position) => {
    const [row, col] = position.split(',').map(Number);
    const piece = board[row][col];

    if (
      piece &&
      ((piece.color === 'w' && isWhiteTurn) ||
        (piece.color === 'b' && !isWhiteTurn))
    ) {
      setDraggedPiece(position);
      setSelectedPiece(position); // Set the selected piece
      setLegalMoves(getLegalMoves(position)); // Calculate legal moves

      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.5';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 32, 32);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    } else {
      e.preventDefault();
    }
  };

  // Handle click to select a piece or move to a legal square
  const handleClick = (position: Position) => {
    const [row, col] = position.split(',').map(Number);
    const piece = board[row][col];

    if (selectedPiece) {
      // If the clicked position is a legal move, execute the move
      if (legalMoves.includes(position)) {
        executeMove(selectedPiece, position);
        return;
      }

      // If clicking on another piece of the same color, change selection
      if (
        piece &&
        ((piece.color === 'w' && isWhiteTurn) ||
          (piece.color === 'b' && !isWhiteTurn))
      ) {
        setSelectedPiece(position);
        setLegalMoves(getLegalMoves(position));
        return;
      }

      // Clicking on an invalid square or opponent's piece clears selection
      setSelectedPiece(null);
      setLegalMoves([]);
    } else {
      // No piece is currently selected
      if (
        piece &&
        ((piece.color === 'w' && isWhiteTurn) ||
          (piece.color === 'b' && !isWhiteTurn))
      ) {
        setSelectedPiece(position);
        setLegalMoves(getLegalMoves(position));
      }
    }
  };

  // Handle dropping a piece via drag-and-drop
  const handleDrop = (e: React.DragEvent, dropPosition: Position) => {
    e.preventDefault();

    if (!draggedPiece) return;

    const [startRow, startCol] = draggedPiece.split(',').map(Number);
    const piece = board[startRow][startCol];

    if (piece && isValidMove(board, draggedPiece, dropPosition, piece)) {
      executeMove(draggedPiece, dropPosition);
    } else {
      // Visual feedback for invalid move
      setInvalidMove(dropPosition);
      setTimeout(() => setInvalidMove(null), 500);
    }

    setDraggedPiece(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Captured Pieces Display */}
      <div className="flex mb-4">
        {/* Captured White Pieces */}
        <div className="mr-8">
          <h2 className="text-lg font-semibold mb-2">Captured White Pieces:</h2>
          <div className="flex flex-wrap">
            {capturedWhite.map((piece, index) => (
              <img
                key={`w-capture-${index}`}
                src={`/${piece.color}${piece.type}.svg`}
                alt={`${piece.color}${piece.type}`}
                className="w-8 h-8 mr-1 mb-1"
              />
            ))}
          </div>
        </div>
        
        {/* Captured Black Pieces */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Captured Black Pieces:</h2>
          <div className="flex flex-wrap">
            {capturedBlack.map((piece, index) => (
              <img
                key={`b-capture-${index}`}
                src={`/${piece.color}${piece.type}.svg`}
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
                  ${isHighlighted ? 'bg-green-400 bg-opacity-25' : ''} {/* Reduced opacity */}
                  ${isSelected ? 'border-2 border-blue-500' : ''}
                `}
                onDrop={e => handleDrop(e, position)}
                onDragOver={handleDragOver}
                onClick={() => handleClick(position)} // Click handler for click-to-move
              >
                {piece && (
                  <img
                    src={`/${piece.color}${piece.type}.svg`}
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
          {isWhiteTurn ? "White's turn" : "Black's turn"}
        </div>
        
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none ${
            moveHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={moveHistory.length === 0} // Disable if no moves to undo
          title="Undo Last Move"
        >
          ↺ Undo
        </button>
      </div>
    </div>
  );
};

export default App;