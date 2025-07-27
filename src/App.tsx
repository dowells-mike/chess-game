import React, { useState, useEffect, useRef } from "react";
import ChessRulesMenu from './ChessRulesMenu';
import { Clock, Settings, RotateCcw, RotateCw } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import {
  getLegalMoves,
  isInCheck,
  isInCheckmate,
  wouldBeInCheck,
  findKing
} from './chess-check-detection';
import { BoardTheme, TimeControl} from "./types";
import SettingsModal, { SoundSettings } from "./SettingsModal";
import { useSoundManager } from "./useSoundManager";


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
type GameState = "inactive" | "active" | "paused" | "ended";

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

const BOARD_THEMES: BoardTheme[] = [
  {
    name: "Classic",
    lightSquare: "bg-gray-200",
    darkSquare: "bg-gray-600",
    background: "bg-gray-100",
  },
  {
    name: "Wooden",
    lightSquare: "bg-[#f0d9b5]",
    darkSquare: "bg-[#b58863]",
    background: "bg-[#e7d5b4]",
    boardTexture: "wood-texture", // You'll need to add this image
  },
  {
    name: "Marble",
    lightSquare: "bg-[#f0f0f0]",
    darkSquare: "bg-[#a0a0a0]",
    background: "bg-[#e0e0e0]",
    boardTexture: "marble-texture",
  },
  {
    name: "Vintage",
    lightSquare: "bg-[#eeeed2]",
    darkSquare: "bg-[#769656]",
    background: "bg-[#dfdfdf]",
  },
  {
    name: "Dark Mode",
    lightSquare: "bg-gray-700",
    darkSquare: "bg-gray-900",
    background: "bg-gray-800",
  },
];

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

// Timer modes - Following online chess standards
const TIME_CONTROLS: TimeControl[] = [
  { mode: 'blitz', initialTime: 180, increment: 2 },     // 3+2 (3 minutes, 2 sec increment)
  { mode: 'rapid', initialTime: 600, increment: 5 },     // 10+5 (10 minutes, 5 sec increment) 
  { mode: 'classical', initialTime: 1800, increment: 30 } // 30+30 (30 minutes, 30 sec increment)
];

// Additional time control options for each category
const TIME_CONTROL_OPTIONS = {
  blitz: [
    { name: '1+0', initialTime: 60, increment: 0 },
    { name: '1+1', initialTime: 60, increment: 1 },
    { name: '3+0', initialTime: 180, increment: 0 },
    { name: '3+2', initialTime: 180, increment: 2 },
    { name: '5+0', initialTime: 300, increment: 0 },
    { name: '5+3', initialTime: 300, increment: 3 }
  ],
  rapid: [
    { name: '10+0', initialTime: 600, increment: 0 },
    { name: '10+5', initialTime: 600, increment: 5 },
    { name: '15+10', initialTime: 900, increment: 10 },
    { name: '20+0', initialTime: 1200, increment: 0 },
    { name: '25+10', initialTime: 1500, increment: 10 }
  ],
  classical: [
    { name: '30+0', initialTime: 1800, increment: 0 },
    { name: '30+20', initialTime: 1800, increment: 20 },
    { name: '45+45', initialTime: 2700, increment: 45 },
    { name: '60+30', initialTime: 3600, increment: 30 },
    { name: '90+30', initialTime: 5400, increment: 30 }
  ]
};

const App: React.FC = () => {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [turn, setTurn] = useState<Color>('w');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{ w: Piece[], b: Piece[] }>({ w: [], b: [] });
  const [promotionState, setPromotionState] = useState<PromotionState | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [redoHistory, setRedoHistory] = useState<Move[]>([]);
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [checkmateWinner, setCheckmateWinner] = useState<'white' | 'black' | null>(null);
  const [showCheckmateModal, setShowCheckmateModal] = useState(false);
  const [gameState, setGameState] = useState<GameState>("inactive");
  const [showThreats, setShowThreats] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [animatingPiece, setAnimatingPiece] = useState<{
    piece: Piece;
    from: Position;
    to: Position;
  } | null>(null);
  const [selectedHistoryMove, setSelectedHistoryMove] = useState<Move | null>(null);
  const [currentGameBoard, setCurrentGameBoard] = useState<Board>(INITIAL_BOARD);
  const [currentGameTurn, setCurrentGameTurn] = useState<Color>('w');
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(BOARD_THEMES[0]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showRulesMenu, setShowRulesMenu] = useState(false); // New state for rules menu
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    masterVolume: 0.5,
    moveVolume: 0.7,
    checkVolume: 0.7,
    musicVolume: 0.3,
    isMusicEnabled: false,
    areSoundEffectsEnabled: true
  });

  // Use the sound manager
  const { 
    playMoveSound, 
    playCheckSound, 
    playCheckmateSound, 
    playTurnSwitchSound 
  } = useSoundManager(soundSettings);

  const [timeControl, setTimeControl] = useState<TimeControl>({
    mode: 'rapid',
    initialTime: 600, // 10 minutes
    increment: 5 // 5 seconds increment
  });

  const [selectedTimeControlOption, setSelectedTimeControlOption] = useState<string>('10+5');

  const [playerTimes, setPlayerTimes] = useState({
    w: timeControl.initialTime,
    b: timeControl.initialTime
  });


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
    // Prevent moves if game is not active or if viewing history
    if (gameState !== "active" || isViewingHistory) return;
    
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

    // Set game to active on first move
    if (gameState === "inactive") {
      setGameState("active");
    }
  
    const newBoard = board.map((row) => [...row]);
  
    // Play move sound
    playMoveSound();
  
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


          // Play capture sound for en passant
          playMoveSound(); // or potentially a separate capture sound
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


      // Play castling sound (you might want to add a specific castling sound)
      playMoveSound();
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


      // Play capture sound
      playMoveSound(); // or a separate capture sound
    }
  
    // Update the board first
    setBoard(newBoard);
    
    // Check if the opponent is in check or checkmate
    const nextTurn = turn === "w" ? "b" : "w";
    const isOpponentInCheck = isInCheck(newBoard, nextTurn);
    const isOpponentInCheckmate = isInCheckmate(newBoard, nextTurn);
    
    // Store current game state (for history viewing)
    setCurrentGameBoard(newBoard);
    setCurrentGameTurn(nextTurn);
    
    // Play check sound
    if (isOpponentInCheck) {
      playCheckSound();
    }


    // Play checkmate sound
    if (isOpponentInCheckmate) {
      playCheckmateSound();
      const winner = turn === 'w' ? 'white' : 'black';
      setCheckmateWinner(winner);
      setShowCheckmateModal(true);
      endGame(winner);
    }
    
    setIsCheck(isOpponentInCheck);
    setIsCheckmate(isOpponentInCheckmate);
    
    // Stop the current timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Add time increment for the current player (who just moved)
    setPlayerTimes(prev => ({
      ...prev,
      [turn]: prev[turn] + timeControl.increment
    }));
    
    // Start timer for the next player
    timerRef.current = setInterval(() => {
      setPlayerTimes(prev => ({
        ...prev,
        [nextTurn]: Math.max(0, prev[nextTurn] - 1)
      }));
    }, 1000);
    
    // Play turn switch sound
    playTurnSwitchSound();
    
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
    
    // Clear redo history when a new move is made
    setRedoHistory([]);
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
    
    // Add the undone move to redo history
    setRedoHistory((prev) => [...prev, lastMove]);
    
    // Remove the last move from move history
    setMoveHistory((prev) => prev.slice(0, -1));
    
    // Reset check and checkmate state
    setIsCheck(isInCheck(newBoard, turn === "w" ? "b" : "w"));
    setIsCheckmate(false);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
  
    const moveToRedo = redoHistory[redoHistory.length - 1];
    const [fromRow, fromCol] = moveToRedo.startPos.split(",").map(Number);
    const [toRow, toCol] = moveToRedo.endPos.split(",").map(Number);
  
    const newBoard = board.map((row) => [...row]);
  
    // Redo castling
    if (moveToRedo.piece.type === 'k' && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) { // Kingside castling
        newBoard[fromRow][5] = newBoard[fromRow][7]; // Move rook
        newBoard[fromRow][7] = null;
        newBoard[fromRow][5]!.hasMoved = true;
      } else if (toCol === 2) { // Queenside castling
        newBoard[fromRow][3] = newBoard[fromRow][0]; // Move rook
        newBoard[fromRow][0] = null;
        newBoard[fromRow][3]!.hasMoved = true;
      }
    }
  
    // En passant capture redo
    if (moveToRedo.piece.type === 'p') {
      const direction = moveToRedo.piece.color === 'w' ? -1 : 1;
      if (Math.abs(fromCol - toCol) === 1 && !moveToRedo.capturedPiece) {
        // Remove the captured pawn for en passant
        newBoard[toRow - direction][toCol] = null;
        
        // Find the captured en passant pawn and add it back to captured pieces
        const capturedEnPassantPawn = { type: 'p' as PieceType, color: moveToRedo.piece.color === 'w' ? 'b' as Color : 'w' as Color };
        setCapturedPieces((prev) => ({
          ...prev,
          [capturedEnPassantPawn.color]: [...prev[capturedEnPassantPawn.color], capturedEnPassantPawn],
        }));
      }
    }
  
    newBoard[toRow][toCol] = { ...moveToRedo.piece, hasMoved: true };
    newBoard[fromRow][fromCol] = null;
  
    if (moveToRedo.capturedPiece) {
      setCapturedPieces((prev) => ({
        ...prev,
        [moveToRedo.capturedPiece!.color]: [...prev[moveToRedo.capturedPiece!.color], moveToRedo.capturedPiece!],
      }));
    }
  
    setBoard(newBoard);
    setTurn(turn === "w" ? "b" : "w");
    
    // Add the redone move back to move history
    setMoveHistory((prev) => [...prev, moveToRedo]);
    
    // Remove the move from redo history
    setRedoHistory((prev) => prev.slice(0, -1));
    
    // Update check and checkmate state
    const nextTurn = turn === "w" ? "b" : "w";
    const isOpponentInCheck = isInCheck(newBoard, nextTurn);
    const isOpponentInCheckmate = isInCheckmate(newBoard, nextTurn);
    
    setIsCheck(isOpponentInCheck);
    setIsCheckmate(isOpponentInCheckmate);
  };

  // Game Control Functions
  const startGame = () => {
    setGameState("active");
    // Start timer for white player
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setPlayerTimes(prev => ({
          ...prev,
          w: Math.max(0, prev.w - 1)
        }));
      }, 1000);
    }
  };

  const pauseGame = () => {
    if (gameState === "active") {
      setGameState("paused");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeGame = () => {
    if (gameState === "paused") {
      setGameState("active");
      // Resume timer for current player
      timerRef.current = setInterval(() => {
        setPlayerTimes(prev => ({
          ...prev,
          [turn]: Math.max(0, prev[turn] - 1)
        }));
      }, 1000);
    }
  };

  const resetGame = () => {
    // Stop current timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset all game state
    setBoard(INITIAL_BOARD);
    setTurn("w");
    setSelectedPos(null);
    setLastMove(null);
    setCapturedPieces({ w: [], b: [] });
    setMoveHistory([]);
    setRedoHistory([]);
    setIsCheck(false);
    setIsCheckmate(false);
    setCheckmateWinner(null);
    setShowCheckmateModal(false);
    setGameState("inactive");
    setPromotionState(null);
    setAnimatingPiece(null);
    setSelectedHistoryMove(null);
    setIsViewingHistory(false);
    setCurrentGameBoard(INITIAL_BOARD);
    setCurrentGameTurn('w');
    
    // Reset player times
    setPlayerTimes({
      w: timeControl.initialTime,
      b: timeControl.initialTime
    });
    
    // Play sound
    playTurnSwitchSound();
  };

  const endGame = (winner?: 'white' | 'black' | 'draw') => {
    setGameState("ended");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // You can add additional end game logic here
    // such as showing a modal with the result
  };

  const enterHistoryMode = (historyBoard: Board, historyTurn: Color, historyMove: Move) => {
    if (!isViewingHistory) {
      // Store current game state before entering history mode
      setCurrentGameBoard(board);
      setCurrentGameTurn(turn);
      
      // Pause the timer when entering history mode during an active game
      if (gameState === "active" && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    setIsViewingHistory(true);
    setBoard(historyBoard);
    setTurn(historyTurn);
    setSelectedHistoryMove(historyMove);
    setSelectedPos(null); // Clear any selected piece
  };

  const exitHistoryMode = () => {
    setIsViewingHistory(false);
    setBoard(currentGameBoard);
    setTurn(currentGameTurn);
    setSelectedHistoryMove(null);
    setLastMove(moveHistory.length > 0 ? {
      from: moveHistory[moveHistory.length - 1].startPos,
      to: moveHistory[moveHistory.length - 1].endPos
    } : null);
    
    // Resume the timer when exiting history mode if game was active
    if (gameState === "active" && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setPlayerTimes(prev => ({
          ...prev,
          [currentGameTurn]: Math.max(0, prev[currentGameTurn] - 1)
        }));
      }, 1000);
    }
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

  // Start the timer when the game begins or a move is made
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);


    timerRef.current = setInterval(() => {
      setPlayerTimes(prev => ({
        ...prev,
        [turn]: Math.max(0, prev[turn] - 1)
      }));
    }, 1000);
  };

  // Stop the timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const addTimeIncrement = () => {
    setPlayerTimes(prev => ({
      ...prev,
      [turn]: prev[turn] + timeControl.increment
    }));
  };

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Reset timer when starting a new game
  const resetTimer = () => {
    stopTimer();
    setPlayerTimes({
      w: timeControl.initialTime,
      b: timeControl.initialTime
    });
    
    // Start timer for white player
    timerRef.current = setInterval(() => {
      setPlayerTimes(prev => ({
        ...prev,
        w: Math.max(0, prev.w - 1)
      }));
    }, 1000);
  };

  // Check for time out
  useEffect(() => {
    if (gameState === "active") {
      if (playerTimes.w <= 0) {
        // Black wins on time
        stopTimer();
        endGame('black');
        alert("White ran out of time. Black wins!");
      }
      if (playerTimes.b <= 0) {
        // White wins on time
        stopTimer();
        endGame('white');
        alert("Black ran out of time. White wins!");
      }
    }
  }, [playerTimes, gameState]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRulesMenu) {
        setShowRulesMenu(false);
      }
    };
  
  
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      // Cleanup timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showRulesMenu]);

  return (
    <div className={`flex items-start justify-center gap-8 min-h-screen py-8 ${currentTheme.background}`}>
       {/* Settings Button */}
       <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 hover:bg-gray-300"
      >
        <Settings className="w-6 h-6" />
      </button>

      <div>
        {/* Captured Pieces */}
        <div className="flex justify-between w-128 mb-6">
          <div>
            <h3 className="text-base font-semibold mb-2">Captured White:</h3>
            <div className="flex flex-wrap gap-2">
              {capturedPieces.w.map((piece, i) => (
                <img
                  key={i}
                  src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                  alt={`${piece.color}${piece.type}`}
                  className="w-8 h-8"
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold mb-2">Captured Black:</h3>
            <div className="flex flex-wrap gap-2">
              {capturedPieces.b.map((piece, i) => (
                <img
                  key={i}
                  src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                  alt={`${piece.color}${piece.type}`}
                  className="w-8 h-8"
                />
              ))}
            </div>
          </div>
        </div>
  
        {/* Board */}
        <div className="relative">
          {isViewingHistory && (
            <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded-lg z-10 flex items-center justify-center">
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-lg shadow-lg">
                History Mode - View Only
              </div>
            </div>
          )}
          
          <div 
            className="grid grid-cols-8 gap-0 border-4 border-gray-800" 
            style={currentTheme.boardTexture ? {
              backgroundImage: `url(/${currentTheme.boardTexture}.jpg)`,
              backgroundSize: 'cover',
              backgroundBlendMode: 'multiply'
            } : {}}
          >
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
              const isKingInCheck = 
                piece && 
                piece.type === 'k' && 
                isCheck && 
                piece.color === turn;
  
              return (
                <div
                  key={pos}
                  className={`w-24 h-24 flex items-center justify-center relative cursor-pointer group
                    ${isDark ? currentTheme.darkSquare : currentTheme.lightSquare}
                    ${isUnderAttack ? 
                      (isDark ? "!bg-red-600" : "!bg-red-300") : ""}
                    ${isValidTarget && !isAttackableBySelected ? 
                      (isDark ? "!bg-green-600" : "!bg-green-300") : ""}
                    ${isSelected ? 
                      (isDark ? "!bg-blue-600" : "!bg-blue-300") : ""}
                    ${(isLastMoveFrom || isLastMoveTo) && !isAttackableBySelected ? 
                      (isDark ? "!bg-yellow-400" : "!bg-yellow-200") : ""}
                    ${isAttackableBySelected ? 
                      (isDark ? "!bg-red-700" : "!bg-red-400") : ""}
                    ${isCurrentPlayerPiece ? 
                      (isDark ? "hover:!bg-blue-500" : "hover:!bg-blue-200") : ""}
                    ${isKingInCheck ? 
                      (isDark ? "!bg-red-500 animate-pulse" : "!bg-red-200 animate-pulse") : ""}
                    transition-colors duration-300
                  `}
                  onClick={() => handleSquareClick(pos)}
                >
                  {piece && (
                    <img
                      src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                      alt={`${piece.color}${piece.type}`}
                      className="w-16 h-16 pointer-events-none"
                    />
                  )}
                  {/* File and rank labels */}
                  {colIndex === 0 && (
                    <span className={`absolute left-2 top-2 text-base font-semibold
                      ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                      {8 - rowIndex}
                    </span>
                  )}
                  {rowIndex === 7 && (
                    <span className={`absolute right-2 bottom-2 text-base font-semibold
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
      </div>
  
      {isCheck && !isCheckmate && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-lg">
          Check!
        </div>
      )}
  
      {showCheckmateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-12 rounded-lg shadow-xl max-w-md">
            <h2 className="text-4xl font-bold mb-6 text-center">Checkmate!</h2>
            <p className="text-2xl mb-8 text-center">
              {checkmateWinner === "white" ? "White" : "Black"} wins!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowCheckmateModal(false)}
                className="bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700 text-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowCheckmateModal(false);
                  resetGame();
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 text-lg transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Side Panel */}
      <div className="w-80 h-[90vh] bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-sm p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Game Status */}
          <div className="text-center">
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold text-white ${
              isViewingHistory ? "bg-purple-500" :
              gameState === "inactive" ? "bg-gray-500" :
              gameState === "active" ? "bg-green-500" :
              gameState === "paused" ? "bg-yellow-500" :
              "bg-red-500"
            }`}>
              {isViewingHistory ? "Viewing History" :
               gameState === "inactive" ? "Game Not Started" :
               gameState === "active" ? "Game Active" :
               gameState === "paused" ? "Game Paused" :
               "Game Ended"}
            </div>
            
            {isViewingHistory && (
              <button
                onClick={exitHistoryMode}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Return to Current Game
              </button>
            )}
          </div>

          {/* Black Player Section */}
    <div
      className={`p-4 rounded-lg transition-all duration-200 flex justify-between items-center ${
        turn === "b" ? "bg-black/15 scale-105" : ""
      }`}
    >
      <h2 className="text-2xl font-semibold">Black Player</h2>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span className="text-xl font-mono font-semibold">
              {formatTime(playerTimes.b)}
            </span>
            </div>
          </div>
  


          {/* White Player Section */}
    <div
      className={`p-4 rounded-lg transition-all duration-200 flex justify-between items-center ${
        turn === "w" ? "bg-black/15 scale-105" : ""
      }`}
    >
      <h2 className="text-2xl font-semibold">White Player</h2>
      <div className="flex items-center space-x-2">
        <Clock className="w-5 h-5" />
        <span className="text-xl font-mono font-semibold">
          {formatTime(playerTimes.w)}
        </span>
      </div>
    </div>


    {/* Time Control Section */}
    <div className="border-t border-gray-300 pt-4">
  <div className="flex items-center justify-between mb-4">
    <label className="text-base font-medium">Time Control Mode</label>
    <select 
      value={timeControl.mode}
      disabled={gameState === "active" || gameState === "paused"}
      onChange={(e) => {
        const selectedMode = e.target.value as 'blitz' | 'rapid' | 'classical';
        const defaultOption = TIME_CONTROL_OPTIONS[selectedMode][1]; // Select second option as default
        const newTimeControl = {
          mode: selectedMode,
          initialTime: defaultOption.initialTime,
          increment: defaultOption.increment
        };
        
        // Stop the current timer
        stopTimer();

        // Update time control
        setTimeControl(newTimeControl);
        setSelectedTimeControlOption(defaultOption.name);

        // Reset player times to the new initial time
        setPlayerTimes({
          w: defaultOption.initialTime,
          b: defaultOption.initialTime
        });

        // Only restart timer if game is already active
        if (gameState === "active") {
          timerRef.current = setInterval(() => {
            setPlayerTimes(prev => ({
              ...prev,
              [turn]: Math.max(0, prev[turn] - 1)
            }));
          }, 1000);
        }
      }}
      className={`px-3 py-2 border rounded text-base ${
        gameState === "active" || gameState === "paused" 
          ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
          : ""
      }`}
    >
      <option value="blitz">Blitz</option>
      <option value="rapid">Rapid</option>
      <option value="classical">Classical</option>
    </select>
  </div>
  
  <div className="flex items-center justify-between mb-4">
    <label className="text-base font-medium">Time Control</label>
    <select 
      value={selectedTimeControlOption}
      disabled={gameState === "active" || gameState === "paused"}
      onChange={(e) => {
        const selectedOption = TIME_CONTROL_OPTIONS[timeControl.mode].find(
          option => option.name === e.target.value
        );
        
        if (selectedOption) {
          const newTimeControl = {
            mode: timeControl.mode,
            initialTime: selectedOption.initialTime,
            increment: selectedOption.increment
          };
          
          // Stop the current timer
          stopTimer();

          // Update time control
          setTimeControl(newTimeControl);
          setSelectedTimeControlOption(selectedOption.name);

          // Reset player times to the new initial time
          setPlayerTimes({
            w: selectedOption.initialTime,
            b: selectedOption.initialTime
          });

          // Only restart timer if game is already active
          if (gameState === "active") {
            timerRef.current = setInterval(() => {
              setPlayerTimes(prev => ({
                ...prev,
                [turn]: Math.max(0, prev[turn] - 1)
              }));
            }, 1000);
          }
        }
      }}
      className={`px-3 py-2 border rounded text-base ${
        gameState === "active" || gameState === "paused" 
          ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
          : ""
      }`}
    >
      {TIME_CONTROL_OPTIONS[timeControl.mode].map(option => (
        <option key={option.name} value={option.name}>
          {option.name}
        </option>
      ))}
    </select>
  </div>
  
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm text-gray-600">
      Initial Time: {Math.floor(timeControl.initialTime / 60)} min {timeControl.initialTime % 60 > 0 ? `${timeControl.initialTime % 60}s` : ''}
    </span>
    <span className="text-sm text-gray-600">
      Increment: {timeControl.increment} sec
    </span>
  </div>
    </div>
    
  
          <div className="space-y-6 p-6 border-t border-gray-300">
  
            <div className="flex items-center justify-between mb-4">
              <label className="text-base font-medium">Theme</label>
              <select 
                value={currentTheme.name}
                onChange={(e) => {
                  const selectedTheme = BOARD_THEMES.find(theme => theme.name === e.target.value);
                  if (selectedTheme) setCurrentTheme(selectedTheme);
                }}
                className="px-3 py-2 border rounded text-base"
              >
                {BOARD_THEMES.map(theme => (
                  <option key={theme.name} value={theme.name}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
  
            <div className="flex items-center justify-between">
              <label className="text-base font-medium">Show Threats</label>
              <Switch checked={showThreats} onCheckedChange={setShowThreats} />
            </div>
  
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleUndo}
                disabled={moveHistory.length === 0 || gameState !== "active" || isViewingHistory}
                className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors group relative"
                title="Undo move"
              >
                <RotateCcw className="w-6 h-6" />
                <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-sm py-1 px-3 rounded -top-10 left-1/2 transform -translate-x-1/2">
                  Undo move
                </span>
              </button>

              <button
                onClick={handleRedo}
                disabled={redoHistory.length === 0 || gameState !== "active" || isViewingHistory}
                className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors group relative"
                title="Redo move"
              >
                <RotateCw className="w-6 h-6" />
                <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-sm py-1 px-3 rounded -top-10 left-1/2 transform -translate-x-1/2">
                  Redo move
                </span>
              </button>
            </div>

            {/* Game Control Buttons */}
            <div className="space-y-3">
              {gameState === "inactive" && (
                <button
                  onClick={startGame}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
                >
                  Start Game
                </button>
              )}
              
              {gameState === "active" && (
                <div className="flex gap-2">
                  <button
                    onClick={pauseGame}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => endGame()}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    End Game
                  </button>
                </div>
              )}
              
              {gameState === "paused" && (
                <div className="flex gap-2">
                  <button
                    onClick={resumeGame}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => endGame()}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    End Game
                  </button>
                </div>
              )}
              
              {(gameState === "ended" || gameState === "paused" || gameState === "active") && (
                <button
                  onClick={resetGame}
                  className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Reset Game
                </button>
              )}
            </div>

            <div className="space-y-6 p-6 border-t border-gray-300">
           {/* Existing buttons */}
          <button
            onClick={() => setShowRulesMenu(true)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Chess Rules & Help
          </button>
        </div>

          </div>
        </div>
      </div>

      {/* Move History Panel */}
      <div className="w-80 h-[90vh] bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-sm p-6">
        <h3 className="text-2xl font-semibold mb-4">Move History</h3>
        <div className="h-[calc(90vh-120px)] overflow-y-auto border border-gray-200 rounded">
          {moveHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No moves yet
            </div>
          ) : (
            <table className="w-full text-base">
              <thead className="sticky top-0 bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Move</th>
                  <th className="px-4 py-2 text-left">Piece</th>
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
                      className={`cursor-pointer hover:bg-gray-200 ${
                        selectedHistoryMove === move ? 'bg-blue-200' : ''
                      }`}
                      onClick={() => {
                        // Determine the turn at this point in history
                        const historyTurn = move.piece.color === 'w' ? 'b' : 'w'; // Turn after this move
                        
                        enterHistoryMode(boardCopy, historyTurn, move);
                        setLastMove({
                          from: move.startPos,
                          to: move.endPos
                        });
                      }}
                    >
                      <td className="px-4 py-2">
                        {convertMoveToSAN(move, boardCopy, moveHistory.slice(0, index))}
                      </td>
                      <td className="px-4 py-2">
                        <img
                          src={`/${move.piece.color}${move.piece.type.toUpperCase()}.svg`}
                          alt={`${move.piece.color}${move.piece.type}`}
                          className="w-6 h-6"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
  
      {promotionState && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Choose promotion piece:</h2>
            <div className="flex gap-6">
              {(["q", "r", "b", "n"] as PieceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  className="p-3 hover:bg-gray-300 rounded"
                >
                  <img
                    src={`/${promotionState.color}${type.toUpperCase()}.svg`}
                    alt={`${promotionState.color}${type}`}
                    className="w-24 h-24"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={soundSettings}
        onSettingsChange={setSoundSettings}
      />

      {/* Rules Modal - Add this just before the closing </div> */}
      {showRulesMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50" 
            onClick={() => setShowRulesMenu(false)}
          ></div>
          <div className="relative z-60 w-full max-w-6xl max-h-[90vh] overflow-auto">
            <ChessRulesMenu />
            <button 
              onClick={() => setShowRulesMenu(false)}
              className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );  
};

export default App;
