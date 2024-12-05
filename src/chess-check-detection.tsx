
import { Board, Position, Piece, Color } from "./types";

// Helper function to simulate a move and test if it results in check
const simulateMove = (
    board: Board,
    from: Position,
    to: Position,
    piece: Piece
  ): Board => {
    const newBoard = board.map(row => [...row]);
    const [fromRow, fromCol] = from.split(",").map(Number);
    const [toRow, toCol] = to.split(",").map(Number);
    
    newBoard[fromRow][fromCol] = null;
    newBoard[toRow][toCol] = piece;
    
    return newBoard;
  };
  
  // Find the king's position for a given color
  const findKing = (board: Board, color: Color): Position => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === "k" && piece.color === color) {
          return `${row},${col}`;
        }
      }
    }
    throw new Error(`${color} king not found`);
  };
  
  // Get all valid moves for a piece without considering check
  const getRawPieceMoves = (pos: Position, piece: Piece, board: Board, lastMove?: { from: Position; to: Position }): Position[] => {
    const [row, col] = pos.split(",").map(Number);
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
      case "p":
      const direction = piece.color === "w" ? -1 : 1;
      const startRow = piece.color === "w" ? 6 : 1;


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
          
          // Regular capture
          if (targetPiece && targetPiece.color !== piece.color) {
            addMove(targetRow, targetCol);
          }
          
          // En passant
          if (lastMove) {
            const [lastFromRow, lastFromCol] = lastMove.from.split(",").map(Number);
            const [lastToRow, lastToCol] = lastMove.to.split(",").map(Number);
            
            // Check if the last move was a two-square pawn move
            if (
              board[lastToRow][lastToCol]?.type === 'p' &&
              Math.abs(lastFromRow - lastToRow) === 2 &&
              lastToCol === targetCol &&
              lastToRow === row
            ) {
              addMove(targetRow, targetCol);
            }
          }
        }
      }
      break;
  
      case "n":
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightMoves) {
          addMove(row + dr, col + dc);
        }
        break;
  
      case "b":
      case "r":
      case "q":
        const directions = piece.type === "r" 
          ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
          : piece.type === "b"
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
  
       case "k":
      // Regular king moves
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
      ];
      for (const [dr, dc] of kingMoves) {
        addMove(row + dr, col + dc);
      }
    
      // Castling moves
      if (!piece.hasMoved) {
        // Kingside castling
        if (
          board[row][7]?.type === 'r' &&
          board[row][7]?.color === piece.color &&
          !board[row][7]?.hasMoved &&
          !board[row][5] &&
          !board[row][6]
        ) {
          moves.push(`${row},6`);
        }
    
        // Queenside castling
        if (
          board[row][0]?.type === 'r' &&
          board[row][0]?.color === piece.color &&
          !board[row][0]?.hasMoved &&
          !board[row][1] &&
          !board[row][2] &&
          !board[row][3]
        ) {
          moves.push(`${row},2`);
        }
      }
      break;
    }
  
    return moves;
  };
  
  // Check if a move would put the moving player in check
  const wouldBeInCheck = (
    board: Board,
    from: Position,
    to: Position,
    movingColor: Color
  ): boolean => {
    const [fromRow, fromCol] = from.split(",").map(Number);
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
  
    // Simulate the move
    const simulatedBoard = simulateMove(board, from, to, piece);
    
    // Find the king's position after the move
    const kingPos = piece.type === "k" ? to : findKing(simulatedBoard, movingColor);
    
    // Check if any opponent piece can attack the king's position
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const attackingPiece = simulatedBoard[row][col];
        if (attackingPiece && attackingPiece.color !== movingColor) {
          const moves = getRawPieceMoves(`${row},${col}`, attackingPiece, simulatedBoard);
          if (moves.includes(kingPos)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };
  
  // Get all legal moves for a piece (considering check)
  const getLegalMoves = (
    pos: Position, 
    piece: Piece, 
    board: Board, 
    lastMove?: { from: Position; to: Position }
  ): Position[] => {
    const rawMoves = getRawPieceMoves(pos, piece, board, lastMove);
    
    // For kings, filter out castling moves if the king is in check or would pass through check
    if (piece.type === 'k') {
      return rawMoves.filter(move => {
        const [, toCol] = move.split(",").map(Number);
        const isCastling = Math.abs(toCol - Number(pos.split(",")[1])) === 2;
        
        if (isCastling) {
          // Don't allow castling if in check
          if (isInCheck(board, piece.color)) return false;
          
          // Check if passing through attacked square
          const row = Number(pos.split(",")[0]);
          const direction = toCol === 6 ? 1 : -1;
          const intermediateCol = Number(pos.split(",")[1]) + direction;
          if (isPositionUnderAttack(`${row},${intermediateCol}`, piece.color === 'w' ? 'b' : 'w', board)) {
            return false;
          }
        }
        
        return !wouldBeInCheck(board, pos, move, piece.color);
      });
    }
    
    // Filter out moves that would put the king in check
    return rawMoves.filter(move => !wouldBeInCheck(board, pos, move, piece.color));
  };
  
  // Check if a position is under attack by a specific color
  const isPositionUnderAttack = (
    pos: Position,
    attackingColor: Color,
    board: Board
  ): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === attackingColor) {
          // Pass false for checkCastling to avoid recursion
          const moves = getRawPieceMoves(`${row},${col}`, piece, board);
          if (moves.includes(pos)) {
            return true;
          }
        }
      }
    }
    return false;
  };
  
  // Check if a player is in check
  const isInCheck = (board: Board, color: Color): boolean => {
    const kingPos = findKing(board, color);
    return isPositionUnderAttack(kingPos, color === "w" ? "b" : "w", board);
  };
  
  // Check if a player is in checkmate
  const isInCheckmate = (board: Board, color: Color): boolean => {
    // First verify that the player is in check
    if (!isInCheck(board, color)) {
      return false;
    }
  
    // Try all possible moves for all pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          const pos = `${row},${col}` as `${number},${number}`;
          const legalMoves = getLegalMoves(pos, piece, board);
          
          // If there's at least one legal move, it's not checkmate
          if (legalMoves.length > 0) {
            return false;
          }
        }
      }
    }
  
    // If we get here, no legal moves were found
    return true;
  };
  
  // Export all the necessary functions
  export {
    getLegalMoves,
    isInCheck,
    isInCheckmate,
    wouldBeInCheck,
    findKing
  };