import React, { useState, useEffect, useRef, useCallback } from "react";
import ChessRulesMenu from './ChessRulesMenu';
import GameSetupControls from './GameSetupControls';
import { Clock, Settings, RotateCcw, RotateCw, Play, User, Bot, Pause, Flag, Handshake, Download, Copy as CopyIcon, ChevronDown } from "lucide-react";
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
import { 
  Color, 
  PieceType, 
  Position, 
  Piece, 
  Board, 
  BoardTheme, 
  TimeControl, 
  CastlingRights, 
  GameEndReason,
  Move,
  GameMode,
  AIDifficulty
} from "./types";
import SettingsModal, { SoundSettings } from "./SettingsModal";
import { useSoundManager } from "./useSoundManager";
import aiEngine from "./ai-engine";
import stockfishEngine from './stockfish-engine';

type GameState = "inactive" | "active" | "paused" | "ended";

interface LastMove {
  from: Position;
  to: Position;
}
interface PromotionState {
  from: Position;
  to: Position;
  color: Color;
}

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

const BOARD_THEMES: BoardTheme[] = [
  {
    name: "Classic",
    lightSquareColor: "#e5e7eb",
    darkSquareColor: "#4b5563",
    backgroundColor: "#f3f4f6",
  },
  {
    name: "Wooden",
    lightSquareColor: "#f0d9b5",
    darkSquareColor: "#b58863",
    backgroundColor: "#e7d5b4",
    boardTexture: "wood-texture", // You'll need to add this image
  },
  {
    name: "Marble",
    lightSquareColor: "#f0f0f0",
    darkSquareColor: "#a0a0a0",
    backgroundColor: "#e0e0e0",
    boardTexture: "marble-texture",
  },
  {
    name: "Vintage",
    lightSquareColor: "#eeeed2",
    darkSquareColor: "#769656",
    backgroundColor: "#dfdfdf",
  },
  {
    name: "Dark Mode",
    lightSquareColor: "#374151",
    darkSquareColor: "#111827",
    backgroundColor: "#1f2937",
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

interface ExpandableSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  defaultOpen = true,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 lg:cursor-default"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform lg:hidden ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`px-4 pb-4 space-y-3 ${isOpen ? "block" : "hidden"} lg:block`}>
        {children}
      </div>
    </div>
  );
};

interface GameControlPanelProps {
  gameState: GameState;
  isViewingHistory: boolean;
  onExitHistory: () => void;
  turn: Color;
  playerTimes: { w: number; b: number };
  formatTime: (seconds: number) => string;
  timeControl: TimeControl;
  selectedTimeControlOption: string;
  onTimeModeChange: (mode: 'blitz' | 'rapid' | 'classical') => void;
  onTimePresetChange: (optionName: string) => void;
  isTimeControlLocked: boolean;
  onStartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onEndGame: () => void;
  onResetGame: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onOpenRules: () => void;
  onDownloadPgn: () => void;
  onCopyPgn: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canOfferDraw: boolean;
  canResign: boolean;
  canReset: boolean;
  moveHistoryCount: number;
  timeControlOptions: typeof TIME_CONTROL_OPTIONS;
  moveHistory: Move[];
  onSelectHistoryMove: (index: number) => void;
  selectedHistoryMove: Move | null;
  isAiThinking: boolean;
}

const GameControlPanel: React.FC<GameControlPanelProps> = ({
  gameState,
  isViewingHistory,
  onExitHistory,
  turn,
  playerTimes,
  formatTime,
  timeControl,
  selectedTimeControlOption,
  onTimeModeChange,
  onTimePresetChange,
  isTimeControlLocked,
  onStartGame,
  onPauseGame,
  onResumeGame,
  onEndGame,
  onResetGame,
  onOfferDraw,
  onResign,
  onOpenRules,
  onDownloadPgn,
  onCopyPgn,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canOfferDraw,
  canResign,
  canReset,
  moveHistoryCount,
  timeControlOptions,
  moveHistory,
  onSelectHistoryMove,
  selectedHistoryMove,
  isAiThinking
}) => {
  const statusConfig = isViewingHistory
    ? { label: "Viewing History", tone: "bg-purple-500" }
    : gameState === "inactive"
    ? { label: "Not Started", tone: "bg-gray-500" }
    : gameState === "active"
    ? { label: "In Progress", tone: "bg-green-600" }
    : gameState === "paused"
    ? { label: "Paused", tone: "bg-yellow-500" }
    : { label: "Finished", tone: "bg-red-600" };

  const activeTurnLabel = turn === "w" ? "White to move" : "Black to move";

  const actionButtons: Array<{
    key: string;
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    className: string;
    disabled?: boolean;
    colSpan?: string;
  }> = [];

  if (gameState === "inactive") {
    actionButtons.push({
      key: "start",
      label: "Start Game",
      onClick: onStartGame,
      icon: Play,
      className: "bg-green-600 hover:bg-green-700 text-white col-span-2"
    });
  }

  if (gameState === "active") {
    actionButtons.push(
      {
        key: "pause",
        label: "Pause",
        onClick: onPauseGame,
        icon: Pause,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white"
      },
      {
        key: "end",
        label: "End Game",
        onClick: onEndGame,
        className: "bg-red-600 hover:bg-red-700 text-white"
      }
    );
  }

  if (gameState === "paused") {
    actionButtons.push(
      {
        key: "resume",
        label: "Resume",
        onClick: onResumeGame,
        icon: Play,
        className: "bg-green-600 hover:bg-green-700 text-white"
      },
      {
        key: "end",
        label: "End Game",
        onClick: onEndGame,
        className: "bg-red-600 hover:bg-red-700 text-white"
      }
    );
  }

  if (canReset) {
    actionButtons.push({
      key: "reset",
      label: "Reset Game",
      onClick: onResetGame,
      className: "bg-slate-100 text-slate-700 hover:bg-slate-200 col-span-2"
    });
  }

  const secondaryButtons: Array<{
    key: string;
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    className: string;
    disabled?: boolean;
  }> = [
    {
      key: "offer-draw",
      label: "Offer Draw",
      onClick: onOfferDraw,
      icon: Handshake,
      className: "bg-blue-100 text-blue-700 hover:bg-blue-200",
      disabled: !canOfferDraw
    },
    {
      key: "resign",
      label: "Resign",
      onClick: onResign,
      icon: Flag,
      className: "bg-red-100 text-red-700 hover:bg-red-200",
      disabled: !canResign
    }
  ];

  const buttonBase =
    "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const renderButton = (
    button: typeof actionButtons[number],
    index: number
  ) => {
    const Icon = button.icon;
    return (
      <button
        key={button.key}
        onClick={button.onClick}
        disabled={button.disabled}
        className={`${buttonBase} ${button.className} ${button.colSpan ?? ""}`}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {button.label}
      </button>
    );
  };

  return (
    <div className="w-full lg:w-72 order-3 lg:order-1 lg:sticky lg:top-24 lg:col-start-1">
      <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-xl backdrop-blur-sm overflow-hidden lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white ${statusConfig.tone}`}
            >
              {statusConfig.label}
            </span>
            <span className="text-xs font-medium text-slate-500">{activeTurnLabel}</span>
          </div>

          {isAiThinking && (
            <div className="text-xs font-medium text-blue-600">
              AI is calculating the next move…
            </div>
          )}

          {isViewingHistory && (
            <button
              onClick={onExitHistory}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Return to Current Game
            </button>
          )}
        </div>

        <ExpandableSection title="Players & Clocks" defaultOpen>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className={`rounded-xl border px-4 py-3 transition ${turn === "b" ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Black</span>
                {turn === "b" && <span className="text-xs uppercase text-blue-600">To move</span>}
              </div>
              <div className="mt-3 flex items-center gap-2 text-lg font-mono">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{formatTime(playerTimes.b)}</span>
              </div>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 transition ${turn === "w" ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>White</span>
                {turn === "w" && <span className="text-xs uppercase text-blue-600">To move</span>}
              </div>
              <div className="mt-3 flex items-center gap-2 text-lg font-mono">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{formatTime(playerTimes.w)}</span>
              </div>
            </div>
          </div>
        </ExpandableSection>

        <ExpandableSection title="Game Actions" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {actionButtons.map(renderButton)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {secondaryButtons.map(({ key, label, onClick, icon: Icon, className, disabled }) => (
              <button
                key={key}
                onClick={onClick}
                disabled={disabled}
                className={`${buttonBase} ${className}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>
        </ExpandableSection>

        <ExpandableSection title="Move Tools" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`${buttonBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
            >
              <RotateCcw className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`${buttonBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
            >
              <RotateCw className="w-4 h-4" />
              Redo
            </button>
          </div>
        </ExpandableSection>

        <ExpandableSection title="Time Control">
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Mode
              </label>
              <select
                value={timeControl.mode}
                onChange={(event) => onTimeModeChange(event.target.value as 'blitz' | 'rapid' | 'classical')}
                disabled={isTimeControlLocked}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
                <option value="classical">Classical</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                Preset
              </label>
              <select
                value={selectedTimeControlOption}
                onChange={(event) => onTimePresetChange(event.target.value)}
                disabled={isTimeControlLocked}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                {timeControlOptions[timeControl.mode].map(option => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Initial Time: {Math.floor(timeControl.initialTime / 60)}m{" "}
                {timeControl.initialTime % 60 > 0 ? `${timeControl.initialTime % 60}s` : ""}
              </span>
              <span>Increment: {timeControl.increment}s</span>
            </div>
          </div>
        </ExpandableSection>

        <ExpandableSection title="Utilities" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenRules}
              className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700 col-span-2`}
            >
              <Settings className="w-4 h-4" />
              About & Rules
            </button>
            <button
              onClick={onDownloadPgn}
              disabled={moveHistoryCount === 0}
              className={`${buttonBase} bg-purple-600 text-white hover:bg-purple-700 disabled:hover:bg-purple-600`}
            >
              <Download className="w-4 h-4" />
              Export PGN
            </button>
            <button
              onClick={onCopyPgn}
              disabled={moveHistoryCount === 0}
              className={`${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600`}
            >
              <CopyIcon className="w-4 h-4" />
              Copy PGN
            </button>
          </div>
        </ExpandableSection>

        <div className="lg:hidden">
          <ExpandableSection title="Move History" defaultOpen={false}>
            {moveHistory.length === 0 ? (
              <span className="text-sm text-slate-500">No moves yet</span>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {moveHistory.map((move, index) => (
                  <button
                    key={`${move.startPos}-${move.endPos}-${index}`}
                    onClick={() => onSelectHistoryMove(index)}
                    className={`flex-shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      selectedHistoryMove === move && isViewingHistory
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-blue-100"
                    }`}
                  >
                    {Math.floor(index / 2) + 1}.{index % 2 === 0 ? "" : ".."} {move.san}
                  </button>
                ))}
              </div>
            )}
          </ExpandableSection>
        </div>
      </div>
    </div>
  );
};

// Helper to convert moves to simple SAN (basic, no full disambiguation)
function convertMoveToSAN(move: Move, previousBoard: Board, isCheck: boolean, isCheckmate: boolean): string {
  // Castling
  if (move.isCastling) {
    const [, toCol] = move.endPos.split(',').map(Number);
    return toCol === 6 ? 'O-O' + (isCheckmate ? '#' : isCheck ? '+' : '') : 'O-O-O' + (isCheckmate ? '#' : isCheck ? '+' : '');
  }
  const pieceLetter = move.piece.type === 'p' ? '' : move.piece.type.toUpperCase();
  const capture = move.capturedPiece ? 'x' : '';
  const [toRow, toCol] = move.endPos.split(',').map(Number);
  const file = String.fromCharCode(97 + toCol);
  const rank = 8 - toRow;
  let san = '';
  if (move.piece.type === 'p' && move.capturedPiece) {
    // Pawn capture needs file of origin
    const fromCol = Number(move.startPos.split(',')[1]);
    san += String.fromCharCode(97 + fromCol);
  } else {
    san += pieceLetter;
  }
  san += capture + file + rank;
  if (move.promotionPiece) {
    san += '=' + move.promotionPiece.toUpperCase();
  }
  if (isCheckmate) san += '#';
  else if (isCheck) san += '+';
  return san;
}

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

  // AI and game mode state
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-human');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<Color>('w'); // human player's color
  const [pendingGameMode, setPendingGameMode] = useState<GameMode>('human-vs-human');
  const [pendingAiDifficulty, setPendingAiDifficulty] = useState<AIDifficulty>('medium');
  const [pendingPlayerColor, setPendingPlayerColor] = useState<Color>('w');
  const aiColor: Color = playerColor === 'w' ? 'b' : 'w'; // AI color derived from player color
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMoveTimeout, setAiMoveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [engineType, setEngineType] = useState<'basic' | 'stockfish'>('basic');
  const [pendingEngineType, setPendingEngineType] = useState<'basic' | 'stockfish'>('basic');

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
    setPendingEngineType(engineType);
  }, [engineType]);

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
    if (gameState !== "active" || isViewingHistory || (gameMode === 'human-vs-ai' && turn === aiColor)) return;
    
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

  const handleSquarePress = (pos: Position) => {
    if (gameState !== "active" || isViewingHistory || (gameMode === 'human-vs-ai' && turn === aiColor)) return;
    
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

  const handleTouchStart = (pos: Position) => {
    if (gameState !== "active" || isViewingHistory || (gameMode === 'human-vs-ai' && turn === aiColor)) return;
    
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
    
    // Create the move object with algebraic notation
    const isEnPassantMove = piece.type === 'p' && Math.abs(fromCol - toCol) === 1 && !targetPiece;
    const isCastlingMove = piece.type === 'k' && Math.abs(toCol - fromCol) === 2;
    
    const move: Move = {
      startPos: from,
      endPos: to,
      piece,
      capturedPiece: targetPiece,
      san: '', // Will be set below
      isCheck: isOpponentInCheck,
      isCheckmate: isOpponentInCheckmate,
      isCastling: isCastlingMove,
      isEnPassant: isEnPassantMove
    };
    
    // Generate algebraic notation
    move.san = convertMoveToSAN(move, board, isOpponentInCheck, isOpponentInCheckmate);
    
    setMoveHistory((prev) => [...prev, move]);
    // Remove fallback direct trigger; rely on effect only
    // Clear redo history when a new move is made
    setRedoHistory([]);
  };
  
  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionState) return;

    const [fromRow, fromCol] = promotionState.from.split(",").map(Number);
    const [toRow, toCol] = promotionState.to.split(",").map(Number);

    const newBoard = board.map((row) => [...row]);
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    newBoard[toRow][toCol] = { type: pieceType, color: promotionState.color };
    newBoard[fromRow][fromCol] = null;

    // Check if the opponent will be in check after promotion
    const nextTurn = turn === "w" ? "b" : "w";
    const isOpponentInCheck = isInCheck(newBoard, nextTurn);
    const isOpponentInCheckmate = isInCheckmate(newBoard, nextTurn);
    
    // Create the move object with promotion info
    const move: Move = {
      startPos: promotionState.from,
      endPos: promotionState.to,
      piece: piece!,
      capturedPiece: targetPiece,
      san: '',
      promotionPiece: pieceType,
      isCheck: isOpponentInCheck,
      isCheckmate: isOpponentInCheckmate,
      isCastling: false,
      isEnPassant: false
    };
    
    // Generate algebraic notation for promotion
    move.san = convertMoveToSAN(move, board, isOpponentInCheck, isOpponentInCheckmate);
    
    setBoard(newBoard);
    setTurn(nextTurn);
    setPromotionState(null);
    
    // Add the promotion move to history
    setMoveHistory((prev) => [...prev, move]);
    
    // Handle check/checkmate after promotion
    setIsCheck(isOpponentInCheck);
    setIsCheckmate(isOpponentInCheckmate);
    
    if (isOpponentInCheckmate) {
      playCheckmateSound();
      const winner = turn === 'w' ? 'white' : 'black';
      setCheckmateWinner(winner);
      setShowCheckmateModal(true);
      endGame(winner);
    } else if (isOpponentInCheck) {
      playCheckSound();
    }
  };

  const handleUndo = () => {
    // Prevent undo during AI thinking or if it's AI's turn in AI mode
    if (isAiThinking || (gameMode === 'human-vs-ai' && turn === aiColor)) {
      return;
    }
    
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
    
    // Clear AI timeout if it was thinking
    if (aiMoveTimeout) {
      clearTimeout(aiMoveTimeout);
      setAiMoveTimeout(null);
      setIsAiThinking(false);
    }
  };

  const handleRedo = () => {
    // Prevent redo during AI thinking or if it's AI's turn in AI mode
    if (isAiThinking || (gameMode === 'human-vs-ai' && turn === aiColor)) {
      return;
    }
    
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
    setPendingGameMode(gameMode);
    setPendingAiDifficulty(aiDifficulty);
    setPendingPlayerColor(playerColor);
    
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

  const handleMobileHistoryJump = (index: number) => {
    const targetMove = moveHistory[index];
    if (!targetMove) return;

    const boardCopy: Board = INITIAL_BOARD.map(row =>
      row.map(piece => (piece ? { ...piece } : null))
    );

    for (let i = 0; i <= index; i++) {
      const historicalMove = moveHistory[i];
      const [fromRow, fromCol] = historicalMove.startPos.split(',').map(Number);
      const [toRow, toCol] = historicalMove.endPos.split(',').map(Number);

      const movingPiece: Piece = {
        ...historicalMove.piece,
        ...(historicalMove.promotionPiece ? { type: historicalMove.promotionPiece } : {}),
        hasMoved: true
      };

      boardCopy[fromRow][fromCol] = null;

      if (historicalMove.isEnPassant) {
        const captureRow = historicalMove.piece.color === 'w' ? toRow + 1 : toRow - 1;
        if (captureRow >= 0 && captureRow < 8) {
          boardCopy[captureRow][toCol] = null;
        }
      }

      boardCopy[toRow][toCol] = movingPiece;

      if (historicalMove.isCastling) {
        if (toCol === 6) {
          boardCopy[toRow][5] = boardCopy[toRow][7];
          boardCopy[toRow][7] = null;
        } else if (toCol === 2) {
          boardCopy[toRow][3] = boardCopy[toRow][0];
          boardCopy[toRow][0] = null;
        }
      }
    }

    const historyTurn: Color = targetMove.piece.color === 'w' ? 'b' : 'w';
    enterHistoryMode(boardCopy, historyTurn, targetMove);
    setLastMove({ from: targetMove.startPos, to: targetMove.endPos });
  };

  // AI move execution
  const executeAiMove = useCallback(async () => {
    // Guard: only proceed if it's currently the AI's turn
    if (turn !== aiColor || isCheckmate || isStalemate || isAiThinking) {
      console.log('AI move skipped', { gameMode, turn, aiColor, isCheckmate, isStalemate, isAiThinking });
      return;
    }
    console.log('AI thinking start', { engineType, aiColor, turn, difficulty: aiDifficulty, gameMode });
    setIsAiThinking(true);

    const aiRemainingTime = playerTimes[aiColor];
    const timeIncrement = timeControl.increment;

    if (engineType === 'basic') {
      let baseDelay = aiDifficulty === 'easy' ? 500 : aiDifficulty === 'medium' ? 1000 : aiDifficulty === 'hard' ? 1500 : 2000;
      if (aiRemainingTime < 30) {
        baseDelay = Math.min(baseDelay, aiRemainingTime * 1000 * 0.1);
      }
      const timeout = setTimeout(async () => {
        try {
          const aiMove = await aiEngine.getBestMove(
            board,
            turn,
            aiDifficulty,
            5000,
            aiRemainingTime,
            timeIncrement
          );
          if (aiMove) {
            const { from, to, promotion } = aiMove;
            if (promotion) {
              handleAiPromotion(from, to, promotion);
            } else {
              const [toRow] = to.split(',').map(Number);
              const [fromRow, fromCol] = from.split(',').map(Number);
              const piece = board[fromRow][fromCol];
              if (piece && piece.type === 'p' && (toRow === 0 || toRow === 7)) {
                handleAiPromotion(from, to, 'q');
              } else {
                makeMove(from, to);
              }
            }
          }
        } catch (e) {
          console.error('Basic AI error', e);
        } finally {
          setIsAiThinking(false);
        }
      }, baseDelay);
      setAiMoveTimeout(timeout);
      return;
    }

    try {
      const fen = aiEngine.boardToFEN(
        board,
        turn,
        castlingRights,
        enPassantTarget,
        0,
        Math.floor(moveHistory.length / 2) + 1
      );
      console.log('Stockfish FEN', fen);
      const wtime = playerTimes.w * 1000;
      const btime = playerTimes.b * 1000;
      const incMs = timeControl.increment * 1000;
      const moveString = await stockfishEngine.getBestMove(fen, {
        wtime,
        btime,
        winc: incMs,
        binc: incMs,
        movetime: aiDifficulty === 'easy' ? 300 : aiDifficulty === 'medium' ? 600 : aiDifficulty === 'hard' ? 1000 : 1500
      });

      if (moveString && moveString.length >= 4) {
        const fileToCol = (f: string) => f.charCodeAt(0) - 97;
        const rankToRow = (r: string) => 8 - parseInt(r, 10);
        const fromFile = moveString[0];
        const fromRank = moveString[1];
        const toFile = moveString[2];
        const toRank = moveString[3];
        const promotionChar = moveString[4];
        const fromPos = `${rankToRow(fromRank)},${fileToCol(fromFile)}` as Position;
        const toPos = `${rankToRow(toRank)},${fileToCol(toFile)}` as Position;
        console.log('Stockfish bestmove', moveString, { fromPos, toPos });
        if (promotionChar) {
          handleAiPromotion(fromPos, toPos, promotionChar as PieceType);
        } else {
          makeMove(fromPos, toPos);
        }
      } else {
        console.warn('Stockfish returned invalid move string', moveString);
      }
    } catch (e) {
      console.warn('Stockfish failed; falling back to basic AI', e);
      try {
        const aiMove = await aiEngine.getBestMove(
          board,
            turn,
            aiDifficulty,
            3000,
            playerTimes[aiColor],
            timeControl.increment
        );
        if (aiMove) {
          const { from, to, promotion } = aiMove;
          if (promotion) {
            handleAiPromotion(from, to, promotion);
          } else {
            makeMove(from, to);
          }
        }
      } catch (be) {
        console.error('Fallback basic AI also failed', be);
      }
    } finally {
      setIsAiThinking(false);
    }
  }, [turn, aiColor, isCheckmate, isStalemate, isAiThinking, engineType, aiDifficulty, playerTimes, timeControl, board, castlingRights, enPassantTarget, moveHistory]);

  // Trigger AI move when it becomes the AI's turn
  useEffect(() => {
    if (
      gameMode === 'human-vs-ai' &&
      gameState === 'active' &&
      turn === aiColor &&
      !isAiThinking &&
      !isViewingHistory &&
      !isCheckmate &&
      !isStalemate &&
      !promotionState
    ) {
      console.log('AI turn detected (effect).', { engineType, aiColor, playerColor, turn });
      executeAiMove();
    }
  }, [turn, gameMode, gameState, aiColor, playerColor, isAiThinking, isViewingHistory, isCheckmate, isStalemate, promotionState, engineType, executeAiMove]);

  // Restored helper: handle AI promotion moves
  const handleAiPromotion = (from: Position, to: Position, promotionPiece: string) => {
    const [fromRow, fromCol] = from.split(',').map(Number);
    const [toRow, toCol] = to.split(',').map(Number);
    const piece = board[fromRow][fromCol];
    if (!piece) return;
    const targetPiece = board[toRow][toCol];
    const newBoard = board.map(row => [...row]);
    newBoard[fromRow][fromCol] = null;
    newBoard[toRow][toCol] = { type: promotionPiece as PieceType, color: piece.color };
    const nextPlayer = turn === 'w' ? 'b' : 'w';
    const newIsCheck = isInCheck(newBoard, nextPlayer);
    const newIsCheckmate = newIsCheck && isInCheckmate(newBoard, nextPlayer);
    const newIsStalemate = !newIsCheck && isInStalemate(newBoard, nextPlayer);
    const move: Move = {
      piece,
      startPos: from,
      endPos: to,
      capturedPiece: targetPiece,
      promotionPiece: promotionPiece as PieceType,
      isCastling: false,
      isEnPassant: false,
      san: ''
    };
    move.san = convertMoveToSAN(move, board, newIsCheck, newIsCheckmate);
    setBoard(newBoard);
    setTurn(nextPlayer);
    setMoveHistory(prev => [...prev, move]);
    setRedoHistory([]);
    if (targetPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [targetPiece.color]: [...prev[targetPiece.color], targetPiece]
      }));
    }
    setIsCheck(newIsCheck);
    setIsCheckmate(newIsCheckmate);
    setIsStalemate(newIsStalemate);
    if (newIsCheckmate) {
      setCheckmateWinner(turn === 'w' ? 'white' : 'black');
      setShowCheckmateModal(true);
      setGameState('ended');
      playCheckmateSound();
    } else if (newIsStalemate) {
      setIsDraw(true);
      setDrawReason('stalemate');
      setShowDrawModal(true);
      setGameState('ended');
    } else {
      if (newIsCheck) playCheckSound(); else playMoveSound();
      playTurnSwitchSound();
    }
    setSelectedPos(null);
  };

  const startNewGame = (
    mode: GameMode,
    difficulty?: AIDifficulty,
    playerClr?: Color,
    engine?: 'basic' | 'stockfish'
  ) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setGameMode(mode);
    if (difficulty) setAiDifficulty(difficulty);
    if (playerClr) setPlayerColor(playerClr);
    if (engine) setEngineType(engine);
    setBoard(INITIAL_BOARD);
    setTurn('w');
    setSelectedPos(null);
    setLastMove(null);
    setCapturedPieces({ w: [], b: [] });
    setPromotionState(null);
    setMoveHistory([]);
    setRedoHistory([]);
    setIsCheck(false);
    setIsCheckmate(false);
    setIsStalemate(false);
    setIsDraw(false);
    setDrawReason(null);
    setShowCheckmateModal(false);
    setShowDrawModal(false);
    setPlayerTimes({ w: timeControl.initialTime, b: timeControl.initialTime });
    setCastlingRights({ wKingSide: true, wQueenSide: true, bKingSide: true, bQueenSide: true });
    setEnPassantTarget(null);
    setPositionHistory([]);
    setMovesSinceLastCaptureOrPawnMove(0);
    setGameState('active');
    setIsViewingHistory(false);
    setSelectedHistoryMove(null);
    setCurrentGameBoard(INITIAL_BOARD);
    setCurrentGameTurn('w');
    setAnimatingPiece(null);
    setDrawOfferPending(null);
    setShowDrawOfferModal(false);
    timerRef.current = setInterval(() => {
      setPlayerTimes(prev => ({ ...prev, w: Math.max(0, prev.w - 1) }));
    }, 1000);
    setPendingGameMode(mode);
    if (difficulty) {
      setPendingAiDifficulty(difficulty);
    }
    if (playerClr) {
      setPendingPlayerColor(playerClr);
    }
    if (engine) {
      setPendingEngineType(engine);
    }
    
    // Handle AI first move for when human plays as black
    if (mode === 'human-vs-ai') {
      const finalPlayerColor = playerClr || playerColor;
      if (finalPlayerColor === 'b') {
        // Player chose black, so AI (white) moves first
        // Use longer timeout to ensure all state updates have completed
        setTimeout(() => {
          executeAiMove();
        }, 150);
      }
    }
  };

  const isGameRunning = () => gameState === 'active' || gameState === 'paused';

  const handleGameModeSelection = (mode: GameMode) => {
    setPendingGameMode(mode);
  };

  const handleAiDifficultyChange = (difficulty: AIDifficulty) => {
    setPendingAiDifficulty(difficulty);
  };

  const handleEngineTypeChange = (engine: 'basic' | 'stockfish') => {
    setPendingEngineType(engine);
  };

  const handlePlayerColorSelection = (color: Color) => {
    setPendingPlayerColor(color);
  };

  const handleStartNewGameRequest = () => {
    if (isGameRunning()) {
      const confirmRestart = window.confirm('Restart the current game? Ongoing progress will be lost.');
      if (!confirmRestart) return;
    }
    if (pendingGameMode === 'human-vs-ai') {
      startNewGame('human-vs-ai', pendingAiDifficulty, pendingPlayerColor, pendingEngineType);
    } else {
      startNewGame('human-vs-human');
    }
  };

  // Timer helpers (restored)
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  };

  const handleTimeControlModeChange = (selectedMode: 'blitz' | 'rapid' | 'classical') => {
    const options = TIME_CONTROL_OPTIONS[selectedMode];
    const defaultOption = options[1] ?? options[0];
    if (!defaultOption) return;

    stopTimer();
    const newTimeControl = {
      mode: selectedMode,
      initialTime: defaultOption.initialTime,
      increment: defaultOption.increment
    };
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
  };

  const handleTimeControlPresetChange = (presetName: string) => {
    const selectedOption = TIME_CONTROL_OPTIONS[timeControl.mode].find(
      option => option.name === presetName
    );
    if (!selectedOption) return;

    stopTimer();
    const newTimeControl = {
      mode: timeControl.mode,
      initialTime: selectedOption.initialTime,
      increment: selectedOption.increment
    };
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
  };

  // PGN Export helpers (restored)
  const exportToPGN = (): string => {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '.');
    const timeControlString = `${Math.floor(timeControl.initialTime / 60)}+${timeControl.increment}`;
    let pgn = '[Event "Local Chess Game"]\n';
    pgn += '[Site "Chess App"]\n';
    pgn += `[Date "${formattedDate}"]\n`;
    pgn += '[Round "1"]\n';
    pgn += '[White "Player 1"]\n';
    pgn += '[Black "Player 2"]\n';
    let result = '*';
    if (gameState === 'ended') {
      if (checkmateWinner === 'white') result = '1-0';
      else if (checkmateWinner === 'black') result = '0-1';
      else if (isDraw) result = '1/2-1/2';
    }
    pgn += `[Result "${result}"]\n`;
    pgn += `[TimeControl "${timeControlString}"]\n`;
    pgn += `[Mode "${timeControl.mode}"]\n`;
    if (drawReason) pgn += `[Termination "${drawReason}"]\n`;
    pgn += '\n';
    if (moveHistory.length === 0) { pgn += result; return pgn; }
    for (let i=0;i<moveHistory.length;i+=2){
      const moveNumber = Math.floor(i/2)+1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i+1];
      pgn += `${moveNumber}.`;
      if (whiteMove) pgn += ` ${whiteMove.san}`;
      if (blackMove) pgn += ` ${blackMove.san}`;
      pgn += ' ';
      if (moveNumber % 8 === 0) pgn += '\n';
    }
    pgn += result; return pgn;
  };
  const downloadPGN = () => {
    const pgnContent = exportToPGN();
    const blob = new Blob([pgnContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `chess-game-${new Date().toISOString().split('T')[0]}.pgn`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };
  const copyPGNToClipboard = async () => {
    const pgn = exportToPGN();
    try { await navigator.clipboard.writeText(pgn); } catch {
      const ta = document.createElement('textarea'); ta.value = pgn; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  };

  const isTimeControlLocked = gameState === 'active' || gameState === 'paused';
  const canUndoMove = moveHistory.length > 0 && gameState === 'active' && !isViewingHistory && !isAiThinking && !(gameMode === 'human-vs-ai' && turn === aiColor);
  const canRedoMove = redoHistory.length > 0 && gameState === 'active' && !isViewingHistory && !isAiThinking && !(gameMode === 'human-vs-ai' && turn === aiColor);
  const canOfferDrawAction = gameState === 'active' && !isViewingHistory;
  const canResignAction = gameState === 'active' && !isViewingHistory;
  const canResetGame = gameState !== 'inactive';

  const indicatorMode = gameState === 'inactive' ? pendingGameMode : gameMode;

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentTheme.backgroundColor }}>
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
          
          {/* Game Mode Indicator */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-lg">
            {indicatorMode === 'human-vs-human' ? (
              <>
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">vs</span>
                <User className="w-4 h-4 text-blue-600" />
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">vs</span>
                <Bot className="w-4 h-4 text-red-600" />
                {isAiThinking && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1"></div>
                )}
              </>
            )}
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
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStartNewGameRequest}
            className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            title="Start or restart game"
          >
            <Play className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop and Mobile Layout Container */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)_16rem] lg:items-start lg:justify-items-center lg:gap-8 lg:py-8 lg:max-w-6xl lg:mx-auto">
        
        {/* Desktop Control Buttons */}
        <div className="hidden lg:flex absolute top-4 right-4 space-x-2">
          <button
            onClick={handleStartNewGameRequest}
            className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            title="Start or restart game"
          >
            <Play className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <GameControlPanel
          gameState={gameState}
          isViewingHistory={isViewingHistory}
          onExitHistory={exitHistoryMode}
          turn={turn}
          playerTimes={playerTimes}
          formatTime={formatTime}
          timeControl={timeControl}
          selectedTimeControlOption={selectedTimeControlOption}
          onTimeModeChange={handleTimeControlModeChange}
          onTimePresetChange={handleTimeControlPresetChange}
          isTimeControlLocked={isTimeControlLocked}
          onStartGame={startGame}
          onPauseGame={pauseGame}
          onResumeGame={resumeGame}
          onEndGame={() => endGame()}
          onResetGame={resetGame}
          onOfferDraw={offerDraw}
          onResign={resign}
          onOpenRules={() => setShowRulesMenu(true)}
          onDownloadPgn={downloadPGN}
          onCopyPgn={copyPGNToClipboard}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndoMove}
          canRedo={canRedoMove}
          canOfferDraw={canOfferDrawAction}
          canResign={canResignAction}
          canReset={canResetGame}
          moveHistoryCount={moveHistory.length}
          timeControlOptions={TIME_CONTROL_OPTIONS}
          moveHistory={moveHistory}
          onSelectHistoryMove={handleMobileHistoryJump}
          selectedHistoryMove={selectedHistoryMove}
          isAiThinking={isAiThinking}
        />

        {/* Main Game Area */}
        <div className="flex-1 lg:col-start-2 lg:row-start-1 px-4 lg:px-0 w-full max-w-3xl mx-auto flex flex-col items-center">
          <div className="w-full max-w-2xl">
            <GameSetupControls
              pendingGameMode={pendingGameMode}
              pendingAiDifficulty={pendingAiDifficulty}
              pendingPlayerColor={pendingPlayerColor}
              engineType={pendingEngineType}
              onGameModeChange={handleGameModeSelection}
              onAiDifficultyChange={handleAiDifficultyChange}
              onPlayerColorChange={handlePlayerColorSelection}
              onEngineTypeChange={handleEngineTypeChange}
            />
          </div>
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

                const baseSquareColor = isDark ? currentTheme.darkSquareColor : currentTheme.lightSquareColor;
                const highlightState: { color: string; pulse?: boolean; opacity?: number } | null = (() => {
                  if (isKingInCheck) {
                    return { color: isDark ? '#ef4444' : '#fecaca', pulse: true };
                  }
                  if (isAttackableBySelected) {
                    return { color: isDark ? '#b91c1c' : '#f87171' };
                  }
                  if (isSelected) {
                    return { color: isDark ? '#2563eb' : '#93c5fd' };
                  }
                  if (isValidTarget && !isAttackableBySelected) {
                    return { color: isDark ? '#16a34a' : '#86efac' };
                  }
                  if ((isLastMoveFrom || isLastMoveTo) && !isAttackableBySelected) {
                    return { color: isDark ? '#facc15' : '#fef08a' };
                  }
                  if (isUnderAttack) {
                    return { color: isDark ? '#dc2626' : '#fca5a5' };
                  }
                  return null;
                })();
                const hoverHighlightColor = isCurrentPlayerPiece ? (isDark ? '#3b82f6' : '#bfdbfe') : null;

                return (
                  <div
                    key={pos}
                    className="aspect-square flex items-center justify-center relative cursor-pointer group touch-manipulation"
                    style={{ backgroundColor: baseSquareColor }}
                    onClick={() => handleSquareClick(pos)}
                  >
                    {highlightState && (
                      <span
                        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${highlightState.pulse ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: highlightState.color, opacity: highlightState.opacity ?? 1, zIndex: 20 }}
                      />
                    )}
                    {hoverHighlightColor && (
                      <span
                        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-60"
                        style={{ backgroundColor: hoverHighlightColor, zIndex: 30 }}
                      />
                    )}
                    {piece && (
                      <img
                        src={`/${piece.color}${piece.type.toUpperCase()}.svg`}
                        alt={`${piece.color}${piece.type}`}
                        className="w-3/4 h-3/4 pointer-events-none relative z-40"
                      />
                    )}
                    {/* File and rank labels - responsive sizing */}
                    {colIndex === 0 && (
                      <span
                        className={`absolute left-0.5 lg:left-1 top-0.5 lg:top-1 text-xs font-semibold z-30 ${
                          isDark ? 'text-gray-200' : 'text-gray-600'
                        }`}
                      >
                        {8 - rowIndex}
                      </span>
                    )}
                    {rowIndex === 7 && (
                      <span
                        className={`absolute right-0.5 lg:right-1 bottom-0.5 lg:bottom-1 text-xs font-semibold z-30 ${
                          isDark ? 'text-gray-200' : 'text-gray-600'
                        }`}
                      >
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
        {/* Desktop Move History Panel */}
        <div className="hidden lg:block w-64 h-[80vh] bg-white bg-opacity-90 rounded-xl shadow-lg backdrop-blur-sm p-4 lg:col-start-3 lg:row-start-1">
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
                    <th className="px-2 py-1 text-left text-xs">#</th>
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
                        <td className="px-2 py-1 text-xs font-mono">
                          {Math.floor(index / 2) + 1}.{index % 2 === 0 ? "" : ".."}
                        </td>
                        <td className="px-2 py-1 text-xs font-mono">
                          {move.san}
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
