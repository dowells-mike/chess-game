import React, { useState, useEffect, useRef } from "react";
import ChessRulesMenu from './ChessRulesMenu';
import { Clock, Settings, RotateCcw, RotateCw } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import {
  getLegalMoves,
  isInCheck,
  isInCheckmate,
  isInStalemate,
  hasInsufficientMaterial,
  isThreefoldRepetition,
  isFiftyMoveRule,
  generatePositionString,
  wouldBeInCheck,
  findKing
} from './chess-check-detection';
import { BoardTheme, TimeControl, CastlingRights, GameEndReason} from "./types";
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
  
  // New state for draw conditions
  const [isStalemate, setIsStalemate] = useState(false);
  const [isDraw, setIsDraw] = useState(false);
  const [drawReason, setDrawReason] = useState<GameEndReason | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [movesSinceLastCaptureOrPawnMove, setMovesSinceLastCaptureOrPawnMove] = useState(0);
  const [positionHistory, setPositionHistory] = useState<string[]>([]);
  const [castlingRights, setCastlingRights] = useState<CastlingRights>({
    wKingSide: true,
    wQueenSide: true,
    bKingSide: true,
    bQueenSide: true
  });
  const [enPassantTarget, setEnPassantTarget] = useState<string | null>(null);
  const [drawOfferPending, setDrawOfferPending] = useState<'white' | 'black' | null>(null);
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);
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

  // Background music management
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Track user interaction for autoplay policy compliance
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!backgroundMusicRef.current) {
      backgroundMusicRef.current = new Audio('/sounds/background-music.mp3');
      backgroundMusicRef.current.loop = true;
    }

    const audio = backgroundMusicRef.current;
    
    if (soundSettings.isMusicEnabled && hasUserInteracted) {
      audio.volume = soundSettings.musicVolume * soundSettings.masterVolume;
      audio.play().catch(error => {
        console.log('Background music autoplay prevented:', error);
      });
    } else {
      audio.pause();
    }
  }, [soundSettings.isMusicEnabled, soundSettings.musicVolume, soundSettings.masterVolume, hasUserInteracted]);

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
    
    // Determine next turn
    const nextTurn = turn === "w" ? "b" : "w";
    
    // Update castling rights
    const newCastlingRights = { ...castlingRights };
    if (piece.type === 'k') {
      if (piece.color === 'w') {
        newCastlingRights.wKingSide = false;
        newCastlingRights.wQueenSide = false;
      } else {
        newCastlingRights.bKingSide = false;
        newCastlingRights.bQueenSide = false;
      }
    } else if (piece.type === 'r') {
      if (piece.color === 'w') {
        if (fromCol === 0) newCastlingRights.wQueenSide = false;
        if (fromCol === 7) newCastlingRights.wKingSide = false;
      } else {
        if (fromCol === 0) newCastlingRights.bQueenSide = false;
        if (fromCol === 7) newCastlingRights.bKingSide = false;
      }
    }
    setCastlingRights(newCastlingRights);

    // Update en passant target
    let newEnPassantTarget: string | null = null;
    if (piece.type === 'p' && Math.abs(toRow - fromRow) === 2) {
      // Pawn moved two squares, set en passant target
      const middleRow = (fromRow + toRow) / 2;
      newEnPassantTarget = `${middleRow},${toCol}`;
    }
    setEnPassantTarget(newEnPassantTarget);

    // Update moves since last capture or pawn move
    const isCapture = targetPiece !== null;
    const isPawnMove = piece.type === 'p';
    const newMovesSinceLastCaptureOrPawnMove = (isCapture || isPawnMove) ? 0 : movesSinceLastCaptureOrPawnMove + 1;
    setMovesSinceLastCaptureOrPawnMove(newMovesSinceLastCaptureOrPawnMove);

    // Generate position string for repetition checking
    const positionString = generatePositionString(newBoard, nextTurn, newCastlingRights, newEnPassantTarget);
    const newPositionHistory = [...positionHistory, positionString];
    setPositionHistory(newPositionHistory);
    
    // Check if the opponent is in check or checkmate
    const isOpponentInCheck = isInCheck(newBoard, nextTurn);
    const isOpponentInCheckmate = isInCheckmate(newBoard, nextTurn);
    const isOpponentInStalemate = isInStalemate(newBoard, nextTurn);
    
    // Check for draw conditions
    const isInsufficientMaterial = hasInsufficientMaterial(newBoard);
    const isThreefold = isThreefoldRepetition(newPositionHistory);
    const isFiftyMove = isFiftyMoveRule(newMovesSinceLastCaptureOrPawnMove);
    
    // Store current game state (for history viewing)
    setCurrentGameBoard(newBoard);
    setCurrentGameTurn(nextTurn);
    
    // Play check sound
    if (isOpponentInCheck) {
      playCheckSound();
    }

    // Handle game end conditions
    if (isOpponentInCheckmate) {
      playCheckmateSound();
      const winner = turn === 'w' ? 'white' : 'black';
      setCheckmateWinner(winner);
      setShowCheckmateModal(true);
      endGame(winner);
    } else if (isOpponentInStalemate) {
      setIsStalemate(true);
      setIsDraw(true);
      setDrawReason('stalemate');
      setShowDrawModal(true);
      endGame('draw');
    } else if (isInsufficientMaterial) {
      setIsDraw(true);
      setDrawReason('insufficient-material');
      setShowDrawModal(true);
      endGame('draw');
    } else if (isThreefold) {
      setIsDraw(true);
      setDrawReason('threefold-repetition');
      setShowDrawModal(true);
      endGame('draw');
    } else if (isFiftyMove) {
      setIsDraw(true);
      setDrawReason('fifty-move-rule');
      setShowDrawModal(true);
      endGame('draw');
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
    
    // Reset draw condition states
    setIsStalemate(false);
    setIsDraw(false);
    setDrawReason(null);
    setShowDrawModal(false);
    setMovesSinceLastCaptureOrPawnMove(0);
    setPositionHistory([]);
    setCastlingRights({
      wKingSide: true,
      wQueenSide: true,
      bKingSide: true,
      bQueenSide: true
    });
    setEnPassantTarget(null);
    setDrawOfferPending(null);
    setShowDrawOfferModal(false);
    
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
  };

  const offerDraw = () => {
    if (gameState === "active") {
      const player = turn === 'w' ? 'white' : 'black';
      setDrawOfferPending(player);
      setShowDrawOfferModal(true);
    }
  };

  const acceptDraw = () => {
    setIsDraw(true);
    setDrawReason('draw-agreement');
    setShowDrawModal(true);
    setShowDrawOfferModal(false);
    setDrawOfferPending(null);
    endGame('draw');
  };

  const declineDraw = () => {
    setDrawOfferPending(null);
    setShowDrawOfferModal(false);
  };

  const resign = () => {
    const winner = turn === 'w' ? 'black' : 'white';
    setDrawReason('resignation');
    setCheckmateWinner(winner);
    setShowCheckmateModal(true);
    endGame(winner);
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
        setDrawReason('timeout');
        setCheckmateWinner('black');
        setShowCheckmateModal(true);
        endGame('black');
      }
      if (playerTimes.b <= 0) {
        // White wins on time
        stopTimer();
        setDrawReason('timeout');
        setCheckmateWinner('white');
        setShowCheckmateModal(true);
        endGame('white');
      }
    }
  }, [playerTimes, gameState]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRulesMenu) {
        setShowRulesMenu(false);
      }
    };

    const handleCloseRulesMenu = () => {
      setShowRulesMenu(false);
    };
  
    document.addEventListener('keydown', handleEscKey);
    window.addEventListener('closeRulesMenu', handleCloseRulesMenu);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      window.removeEventListener('closeRulesMenu', handleCloseRulesMenu);
      // Cleanup timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Cleanup background music on unmount
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
    };
  }, [showRulesMenu]);

  return (
    <div className={`min-h-screen ${currentTheme.background}`}>
      {/* Mobile Header */}
      <div className="lg:hidden flex justify-between items-center p-4 bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-lg font-semibold text-white text-sm ${
            isViewingHistory ? "bg-purple-500" :
            gameState === "inactive" ? "bg-gray-500" :
            gameState === "active" ? "bg-green-500" :
            gameState === "paused" ? "bg-yellow-500" :
            "bg-red-500"
          }`}>
            {isViewingHistory ? "History" :
             gameState === "inactive" ? "Not Started" :
             gameState === "active" ? "Active" :
             gameState === "paused" ? "Paused" :
             "Ended"}
          </div>
          
          {/* Mobile Timer Display */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
              turn === "w" ? "bg-black/15" : ""
            }`}>
              <span className="font-semibold">W:</span>
              <span className="font-mono">{formatTime(playerTimes.w)}</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
              turn === "b" ? "bg-black/15" : ""
            }`}>
              <span className="font-semibold">B:</span>
              <span className="font-mono">{formatTime(playerTimes.b)}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop and Mobile Layout Container */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:py-8">
        
        {/* Settings Button - Desktop Only */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="hidden lg:block absolute top-4 right-4 p-2 rounded-full bg-gray-200 hover:bg-gray-300"
        >
          <Settings className="w-6 h-6" />
        </button>

        {/* Main Game Area */}
        <div className="flex-1 lg:flex-none lg:order-2 px-4 lg:px-0">
          {/* Captured Pieces - Mobile Compact */}
          <div className="lg:hidden mb-4">
            <div className="flex justify-between items-center bg-white bg-opacity-90 rounded-lg p-3">
              <div className="flex-1">
                <h3 className="text-xs font-semibold mb-1">Captured White:</h3>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.w.map((piece, i) => (
                    <img
                      key={i}
                      src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                      alt={`${piece.color}${piece.type}`}
                      className="w-4 h-4"
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold mb-1">Captured Black:</h3>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.b.map((piece, i) => (
                    <img
                      key={i}
                      src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                      alt={`${piece.color}${piece.type}`}
                      className="w-4 h-4"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Captured Pieces - Desktop */}
          <div className="hidden lg:flex justify-between w-96 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Captured White:</h3>
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
              <h3 className="text-sm font-semibold mb-2">Captured Black:</h3>
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
          <div className="relative mx-auto" style={{ maxWidth: 'min(100vw - 2rem, 400px)' }}>
            {isViewingHistory && (
              <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded-lg z-10 flex items-center justify-center">
                <div className="bg-purple-600 text-white px-3 py-1 rounded-lg font-semibold text-sm shadow-lg">
                  History Mode - View Only
                </div>
              </div>
            )}
            
            <div 
              className="grid grid-cols-8 gap-0 border-2 border-gray-800 w-full aspect-square" 
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
                    className={`aspect-square flex items-center justify-center relative cursor-pointer group touch-manipulation
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
                        className="w-3/4 h-3/4 pointer-events-none"
                      />
                    )}
                    {/* File and rank labels - responsive sizing */}
                    {colIndex === 0 && (
                      <span className={`absolute left-0.5 lg:left-1 top-0.5 lg:top-1 text-xs font-semibold
                        ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                        {8 - rowIndex}
                      </span>
                    )}
                    {rowIndex === 7 && (
                      <span className={`absolute right-0.5 lg:right-1 bottom-0.5 lg:bottom-1 text-xs font-semibold
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

        {/* Mobile Bottom Controls */}
        <div className="lg:hidden p-4 bg-white bg-opacity-90 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {gameState === "inactive" && (
              <button
                onClick={startGame}
                className="col-span-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Start Game
              </button>
            )}
            
            {gameState === "active" && (
              <>
                <button
                  onClick={pauseGame}
                  className="bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  Pause
                </button>
                <button
                  onClick={() => endGame()}
                  className="bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  End Game
                </button>
              </>
            )}
            
            {gameState === "paused" && (
              <>
                <button
                  onClick={resumeGame}
                  className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Resume
                </button>
                <button
                  onClick={() => endGame()}
                  className="bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  End Game
                </button>
              </>
            )}
            
            {(gameState === "ended" || gameState === "paused" || gameState === "active") && (
              <button
                onClick={resetGame}
                className="bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Reset Game
              </button>
            )}

            {gameState === "active" && !isViewingHistory && (
              <>
                <button
                  onClick={offerDraw}
                  className="bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  Offer Draw
                </button>
                <button
                  onClick={resign}
                  className="bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Resign
                </button>
              </>
            )}

            <button
              onClick={() => setShowRulesMenu(true)}
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              About & Rules
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={moveHistory.length === 0 || gameState !== "active" || isViewingHistory}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center justify-center"
                title="Undo move"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleRedo}
                disabled={redoHistory.length === 0 || gameState !== "active" || isViewingHistory}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors flex items-center justify-center"
                title="Redo move"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isViewingHistory && (
            <button
              onClick={exitHistoryMode}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
            >
              Return to Current Game
            </button>
          )}

          {/* Mobile Time Control Settings */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-800">Time Control</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Mode</label>
                <select 
                  value={timeControl.mode}
                  disabled={gameState === "active" || gameState === "paused"}
                  onChange={(e) => {
                    const selectedMode = e.target.value as 'blitz' | 'rapid' | 'classical';
                    const defaultOption = TIME_CONTROL_OPTIONS[selectedMode][1];
                    const newTimeControl = {
                      mode: selectedMode,
                      initialTime: defaultOption.initialTime,
                      increment: defaultOption.increment
                    };
                    
                    stopTimer();
                    setTimeControl(newTimeControl);
                    setSelectedTimeControlOption(defaultOption.name);
                    setPlayerTimes({
                      w: defaultOption.initialTime,
                      b: defaultOption.initialTime
                    });

                    if (gameState === "active") {
                      timerRef.current = setInterval(() => {
                        setPlayerTimes(prev => ({
                          ...prev,
                          [turn]: Math.max(0, prev[turn] - 1)
                        }));
                      }, 1000);
                    }
                  }}
                  className={`px-2 py-1 border rounded text-xs ${
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
              
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Time</label>
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
                      
                      stopTimer();
                      setTimeControl(newTimeControl);
                      setSelectedTimeControlOption(selectedOption.name);
                      setPlayerTimes({
                        w: selectedOption.initialTime,
                        b: selectedOption.initialTime
                      });

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
                  className={`px-2 py-1 border rounded text-xs ${
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
            </div>
          </div>
          
          {/* Mobile Horizontal Move History */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2 text-gray-800">Move History</h3>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {moveHistory.length === 0 ? (
                <span className="text-gray-500 text-sm">No moves yet</span>
              ) : (
                moveHistory.map((move, index) => {
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
                    <button
                      key={index}
                      onClick={() => {
                        const historyTurn = move.piece.color === 'w' ? 'b' : 'w';
                        
                        enterHistoryMode(boardCopy, historyTurn, move);
                        setLastMove({
                          from: move.startPos,
                          to: move.endPos
                        });
                      }}
                      className={`flex-shrink-0 px-2 py-1 text-xs rounded transition-colors ${
                        selectedHistoryMove === move && isViewingHistory
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-700 hover:bg-blue-100"
                      }`}
                    >
                      {Math.floor(index / 2) + 1}.{index % 2 === 0 ? "" : ".."} {convertMoveToSAN(move, boardCopy, moveHistory.slice(0, index))}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Desktop Side Panel */}
        <div className="hidden lg:block w-64 h-[80vh] bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-sm p-4 overflow-y-auto lg:order-1">
          <div className="space-y-4">
            {/* Game Status */}
            <div className="text-center">
              <div className={`inline-block px-3 py-1 rounded-lg font-semibold text-white text-sm ${
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
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-xs"
                >
                  Return to Current Game
                </button>
              )}
            </div>

            {/* Black Player Section */}
            <div
              className={`p-3 rounded-lg transition-all duration-200 flex justify-between items-center ${
                turn === "b" ? "bg-black/15 scale-105" : ""
              }`}
            >
              <h2 className="text-lg font-semibold">Black Player</h2>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-base font-mono font-semibold">
                  {formatTime(playerTimes.b)}
                </span>
              </div>
            </div>

            {/* White Player Section */}
            <div
              className={`p-3 rounded-lg transition-all duration-200 flex justify-between items-center ${
                turn === "w" ? "bg-black/15 scale-105" : ""
              }`}
            >
              <h2 className="text-lg font-semibold">White Player</h2>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-base font-mono font-semibold">
                  {formatTime(playerTimes.w)}
                </span>
              </div>
            </div>

            {/* Time Control Section - Desktop Only */}
            <div className="border-t border-gray-300 pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-base font-medium">Time Control Mode</label>
                <select 
                  value={timeControl.mode}
                  disabled={gameState === "active" || gameState === "paused"}
                  onChange={(e) => {
                    const selectedMode = e.target.value as 'blitz' | 'rapid' | 'classical';
                    const defaultOption = TIME_CONTROL_OPTIONS[selectedMode][1];
                    const newTimeControl = {
                      mode: selectedMode,
                      initialTime: defaultOption.initialTime,
                      increment: defaultOption.increment
                    };
                    
                    stopTimer();
                    setTimeControl(newTimeControl);
                    setSelectedTimeControlOption(defaultOption.name);
                    setPlayerTimes({
                      w: defaultOption.initialTime,
                      b: defaultOption.initialTime
                    });

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
                      
                      stopTimer();
                      setTimeControl(newTimeControl);
                      setSelectedTimeControlOption(selectedOption.name);
                      setPlayerTimes({
                        w: selectedOption.initialTime,
                        b: selectedOption.initialTime
                      });

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
              <div className="space-y-2">
                {gameState === "inactive" && (
                  <button
                    onClick={startGame}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    Start Game
                  </button>
                )}
                
                {gameState === "active" && (
                  <div className="flex gap-2">
                    <button
                      onClick={pauseGame}
                      className="flex-1 bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 transition-colors text-xs"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => endGame()}
                      className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors text-xs"
                    >
                      End Game
                    </button>
                  </div>
                )}
                
                {gameState === "paused" && (
                  <div className="flex gap-2">
                    <button
                      onClick={resumeGame}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors text-xs"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => endGame()}
                      className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors text-xs"
                    >
                      End Game
                    </button>
                  </div>
                )}
                
                {(gameState === "ended" || gameState === "paused" || gameState === "active") && (
                  <button
                    onClick={resetGame}
                    className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    Reset Game
                  </button>
                )}

                {/* Draw and Resignation Buttons */}
                {gameState === "active" && !isViewingHistory && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={offerDraw}
                      className="flex-1 bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 transition-colors text-xs"
                    >
                      Offer Draw
                    </button>
                    <button
                      onClick={resign}
                      className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors text-xs"
                    >
                      Resign
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3 border-t border-gray-300">
                <button
                  onClick={() => setShowRulesMenu(true)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  About & Rules
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Move History Panel */}
        <div className="hidden lg:block w-64 h-[80vh] bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-sm p-4 lg:order-3">
          <h3 className="text-lg font-semibold mb-3">Move History</h3>
          <div className="h-[calc(80vh-80px)] overflow-y-auto border border-gray-200 rounded">
            {moveHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No moves yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-200">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs">Move</th>
                    <th className="px-2 py-1 text-left text-xs">Piece</th>
                  </tr>
                </thead>
                <tbody>
                  {moveHistory.map((move, index) => {
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
                          const historyTurn = move.piece.color === 'w' ? 'b' : 'w';
                          
                          enterHistoryMode(boardCopy, historyTurn, move);
                          setLastMove({
                            from: move.startPos,
                            to: move.endPos
                          });
                        }}
                      >
                        <td className="px-2 py-1 text-xs">
                          {convertMoveToSAN(move, boardCopy, moveHistory.slice(0, index))}
                        </td>
                        <td className="px-2 py-1">
                          <img
                            src={`/${move.piece.color}${move.piece.type.toUpperCase()}.svg`}
                            alt={`${move.piece.color}${move.piece.type}`}
                            className="w-4 h-4"
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
      </div>
  
      {isCheck && !isCheckmate && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg shadow-lg z-50 text-base lg:text-lg">
          Check!
        </div>
      )}

      {showCheckmateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 lg:p-12 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl lg:text-4xl font-bold mb-4 lg:mb-6 text-center">
              {drawReason === 'timeout' ? 'Time Out!' : 
               drawReason === 'resignation' ? 'Resignation!' : 'Checkmate!'}
            </h2>
            <p className="text-lg lg:text-2xl mb-6 lg:mb-8 text-center">
              {drawReason === 'timeout' 
                ? `${checkmateWinner === "white" ? "White" : "Black"} wins on time!`
                : drawReason === 'resignation'
                ? `${checkmateWinner === "white" ? "White" : "Black"} wins by resignation!`
                : `${checkmateWinner === "white" ? "White" : "Black"} wins!`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowCheckmateModal(false)}
                className="bg-gray-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-gray-700 text-base lg:text-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowCheckmateModal(false);
                  resetGame();
                }}
                className="bg-blue-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-blue-700 text-base lg:text-lg transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {showDrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 lg:p-12 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl lg:text-4xl font-bold mb-4 lg:mb-6 text-center">Draw!</h2>
            <p className="text-lg lg:text-2xl mb-6 lg:mb-8 text-center">
              {drawReason === 'stalemate' && 'Stalemate - No legal moves available'}
              {drawReason === 'insufficient-material' && 'Insufficient material to checkmate'}
              {drawReason === 'threefold-repetition' && 'Threefold repetition'}
              {drawReason === 'fifty-move-rule' && 'Fifty-move rule'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowDrawModal(false)}
                className="bg-gray-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-gray-700 text-base lg:text-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDrawModal(false);
                  resetGame();
                }}
                className="bg-blue-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-blue-700 text-base lg:text-lg transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
      {promotionState && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white p-4 lg:p-6 rounded-lg max-w-md w-full">
            <h2 className="text-lg lg:text-2xl font-bold mb-4 lg:mb-6 text-center">Choose promotion piece:</h2>
            <div className="grid grid-cols-2 lg:flex gap-4 lg:gap-6">
              {(["q", "r", "b", "n"] as PieceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  className="p-3 hover:bg-gray-300 rounded flex items-center justify-center"
                >
                  <img
                    src={`/${promotionState.color}${type.toUpperCase()}.svg`}
                    alt={`${promotionState.color}${type}`}
                    className="w-16 h-16 lg:w-24 lg:h-24"
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
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        boardThemes={BOARD_THEMES}
        showThreats={showThreats}
        onShowThreatsChange={setShowThreats}
      />

      {/* Rules Modal */}
      {showRulesMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-4">
          <div 
            className="absolute inset-0 bg-black opacity-50" 
            onClick={() => setShowRulesMenu(false)}
          ></div>
          <div className="relative z-60 w-full max-w-sm sm:max-w-md lg:max-w-5xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden">
            <ChessRulesMenu />
          </div>
        </div>
      )}

      {/* Draw Offer Modal */}
      {showDrawOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 lg:p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl lg:text-2xl font-bold mb-4 text-center">Draw Offer</h2>
            <p className="text-base lg:text-lg mb-6 text-center">
              {drawOfferPending === 'white' ? 'White' : 'Black'} offers a draw.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={declineDraw}
                className="bg-red-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-red-700 text-base lg:text-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={acceptDraw}
                className="bg-green-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded hover:bg-green-700 text-base lg:text-lg transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );  
};

export default App;
