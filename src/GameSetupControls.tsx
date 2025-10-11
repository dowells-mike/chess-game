import React from "react";
import { GameMode, AIDifficulty, Color } from "./types";
import { Bot, User, Play } from "lucide-react";

interface GameSetupControlsProps {
  pendingGameMode: GameMode;
  pendingAiDifficulty: AIDifficulty;
  pendingPlayerColor: Color;
  isGameRunning: boolean;
  onGameModeChange: (mode: GameMode) => void;
  onAiDifficultyChange: (difficulty: AIDifficulty) => void;
  onPlayerColorChange: (color: Color) => void;
  onStart: () => void;
}

const LABELS: Record<GameMode, string> = {
  "human-vs-human": "Human vs Human",
  "human-vs-ai": "Human vs AI",
};

const GameSetupControls: React.FC<GameSetupControlsProps> = ({
  pendingGameMode,
  pendingAiDifficulty,
  pendingPlayerColor,
  isGameRunning,
  onGameModeChange,
  onAiDifficultyChange,
  onPlayerColorChange,
  onStart,
}) => {
  const buttonBase =
    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors";

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:flex-1">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Opponents
            </span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(["human-vs-human", "human-vs-ai"] as GameMode[]).map((mode) => {
                const isActive = pendingGameMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onGameModeChange(mode)}
                    className={`${buttonBase} ${
                      isActive
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <User className="w-4 h-4" />
                      <span>vs</span>
                      {mode === "human-vs-ai" ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-normal">
                      {LABELS[mode]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {pendingGameMode === "human-vs-ai" && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:ml-6">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  Difficulty
                </span>
                <select
                  value={pendingAiDifficulty}
                  onChange={(event) =>
                    onAiDifficultyChange(event.target.value as AIDifficulty)
                  }
                  className="mt-1 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  You Play As
                </span>
                <div className="mt-1 flex rounded-md border border-gray-300 overflow-hidden">
                  {(["w", "b"] as Color[]).map((color) => {
                    const isSelected = pendingPlayerColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onPlayerColorChange(color)}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        } ${color === "w" ? "border-r border-gray-300" : ""}`}
                      >
                        {color === "w" ? "White" : "Black"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          {isGameRunning ? "Restart Game" : "Start Game"}
        </button>
      </div>

      {isGameRunning && (
        <p className="mt-4 text-xs text-gray-600">
          Changes take effect after you restart the game.
        </p>
      )}
    </div>
  );
};

export default GameSetupControls;
