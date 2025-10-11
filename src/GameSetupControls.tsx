import React from "react";
import { GameMode, AIDifficulty, Color } from "./types";
import { Bot, User } from "lucide-react";

interface GameSetupControlsProps {
  pendingGameMode: GameMode;
  pendingAiDifficulty: AIDifficulty;
  pendingPlayerColor: Color;
  engineType: "basic" | "stockfish";
  onGameModeChange: (mode: GameMode) => void;
  onAiDifficultyChange: (difficulty: AIDifficulty) => void;
  onPlayerColorChange: (color: Color) => void;
  onEngineTypeChange: (engine: "basic" | "stockfish") => void;
}

const LABELS: Record<GameMode, string> = {
  "human-vs-human": "Human vs Human",
  "human-vs-ai": "Human vs AI",
};

const GameSetupControls: React.FC<GameSetupControlsProps> = ({
  pendingGameMode,
  pendingAiDifficulty,
  pendingPlayerColor,
  engineType,
  onGameModeChange,
  onAiDifficultyChange,
  onPlayerColorChange,
  onEngineTypeChange,
}) => {
  const [aiOptionsOpen, setAiOptionsOpen] = React.useState(false);

  React.useEffect(() => {
    if (pendingGameMode !== "human-vs-ai") {
      setAiOptionsOpen(false);
    }
  }, [pendingGameMode]);

  const buttonBase =
    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors";

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:flex-1">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Opponents
            </span>
            <div className="flex bg-gray-100 rounded-lg p-1 flex-wrap gap-1">
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
            <div className="flex flex-col gap-3 lg:ml-6">
              <button
                type="button"
                onClick={() => setAiOptionsOpen((prev) => !prev)}
                className="inline-flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <span>AI Options</span>
                <span className="text-xs font-medium">
                  {`${pendingAiDifficulty}, ${engineType === "basic" ? "Basic" : "Stockfish"}, ${pendingPlayerColor === "w" ? "You play White" : "You play Black"}`}
                </span>
              </button>
              <div
                className={`grid gap-3 transition-all duration-200 ${
                  aiOptionsOpen ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3 max-h-0 overflow-hidden pt-0"
                }`}
              >
                <div className={`flex flex-col min-w-[160px] ${aiOptionsOpen ? "" : "opacity-0"}`}>
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

                <div className={`flex flex-col min-w-[160px] ${aiOptionsOpen ? "" : "opacity-0"}`}>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Engine
                  </span>
                  <select
                    value={engineType}
                    onChange={(event) =>
                      onEngineTypeChange(event.target.value as "basic" | "stockfish")
                    }
                    className="mt-1 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="basic">Basic (Built-in)</option>
                    <option value="stockfish">Stockfish</option>
                  </select>
                </div>

                <div className={`flex flex-col min-w-[160px] ${aiOptionsOpen ? "" : "opacity-0"}`}>
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
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Use the controls on the left to start or restart the game after adjusting these settings.
      </p>
    </div>
  );
};

export default GameSetupControls;
