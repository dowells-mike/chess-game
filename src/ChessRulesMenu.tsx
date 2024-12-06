import React, { useState } from 'react';

interface PieceRule {
  icon: string;
  name: string;
  description: string;
  movementRules: string[];
  specialRules?: string[];
}


const PIECE_RULES: PieceRule[] = [
    {
      icon: "/wK.svg", // Use the path to your white king SVG
      name: "King",
      description: "The most important piece in chess. If the king is checkmated, the game is lost.",
      movementRules: [
        "Moves one square in any direction (horizontal, vertical, or diagonal)",
        "Cannot move into check",
        "Special move: Castling (under specific conditions)"
      ],
      specialRules: [
        "Cannot be captured",
        "Must always have a legal move to avoid checkmate"
      ]
    },
    {
      icon: "/wQ.svg", // White queen SVG
      name: "Queen",
      description: "The most powerful piece on the board with versatile movement.",
      movementRules: [
        "Moves any number of squares in any direction (horizontal, vertical, or diagonal)",
        "Can capture pieces along its path",
        "Cannot jump over other pieces"
      ]
    },
    {
      icon: "/wR.svg", // White rook SVG
      name: "Rook",
      description: "A powerful piece that controls ranks and files.",
      movementRules: [
        "Moves any number of squares horizontally or vertically",
        "Can capture pieces along its path",
        "Involved in castling with the king"
      ],
      specialRules: [
        "Particularly strong in open files",
        "Effective in controlling the center and edges of the board"
      ]
    },
    {
      icon: "/wB.svg", // White bishop SVG
      name: "Bishop",
      description: "A diagonal moving piece with unique movement patterns.",
      movementRules: [
        "Moves any number of squares diagonally",
        "Always stays on squares of its original color",
        "Cannot jump over other pieces"
      ],
      specialRules: [
        "Pair of bishops can control different color squares",
        "Most effective in open positions"
      ]
    },
    {
      icon: "/wN.svg", // White knight SVG
      name: "Knight",
      description: "The only piece that can jump over other pieces.",
      movementRules: [
        "Moves in an L-shape: 2 squares in one direction, then 1 square perpendicular",
        "Can jump over other pieces",
        "Unique movement makes it unpredictable"
      ],
      specialRules: [
        "Most complex piece to master",
        "Excellent for forks and tactical maneuvers"
      ]
    },
    {
      icon: "/wP.svg", // White pawn SVG
      name: "Pawn",
      description: "Small but crucial pieces with unique movement and promotion potential.",
      movementRules: [
        "Moves forward one square (two squares on first move)",
        "Captures diagonally one square forward",
        "Cannot move backward"
      ],
      specialRules: [
        "Can be promoted to any piece (except king) upon reaching the opposite end",
        "En passant capture is possible under specific conditions"
      ]
    }
  ];


const ChessRulesMenu: React.FC = () => {
  const [selectedPiece, setSelectedPiece] = useState<PieceRule | null>(PIECE_RULES[0]);
  const [activeSection, setActiveSection] = useState<'about' | 'rules'>('about');


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden">
        <div className="flex border-b">
          <button 
            className={`flex-1 p-4 ${activeSection === 'about' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveSection('about')}
          >
            About Me
          </button>
          <button 
            className={`flex-1 p-4 ${activeSection === 'rules' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveSection('rules')}
          >
            Chess Rules
          </button>
        </div>


        {activeSection === 'about' ? (
          <div className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">About the Chess App</h2>
            <p className="text-lg text-gray-700 mb-6">
              Welcome to an immersive chess experience designed to bring the classic game to life! 
              This app combines traditional chess mechanics with modern, interactive design.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold text-xl mb-2">Responsive Design</h3>
                <p>Fully responsive interface that works on all devices.</p>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Advanced Features</h3>
                <p>Time controls, move history, and theme customization.</p>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Intelligent Gameplay</h3>
                <p>Comprehensive move validation and check/checkmate detection.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex">
            {/* Piece Selection Sidebar */}
            <div className="w-1/4 bg-gray-100 p-4 border-r">
            {PIECE_RULES.map((piece) => (
  <button
    key={piece.name}
    className={`w-full flex items-center p-3 mb-2 rounded ${
      selectedPiece?.name === piece.name 
        ? 'bg-blue-500 text-white' 
        : 'hover:bg-gray-200'
    }`}
    onClick={() => setSelectedPiece(piece)}
  >
    <img 
      src={piece.icon} 
      alt={`${piece.name} icon`} 
      className="w-16 h-16" 
    />
    <span className="ml-4">{piece.name}</span>
  </button>
))}
            </div>


            {/* Piece Details */}
            {selectedPiece && (
              <div className="w-3/4 p-8">
                <div className="flex items-center mb-6">
                <img 
        src={selectedPiece.icon} 
        alt={`${selectedPiece.name} icon`} 
        className="w-16 h-16 mr-4" 
      />
                  <h2 className="text-3xl font-bold ml-4">{selectedPiece.name}</h2>
                </div>
                <p className="text-lg mb-4">{selectedPiece.description}</p>
                
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Movement Rules:</h3>
                  <ul className="list-disc pl-6">
                    {selectedPiece.movementRules.map((rule, index) => (
                      <li key={index} className="mb-2">{rule}</li>
                    ))}
                  </ul>
                </div>


                {selectedPiece.specialRules && (
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Special Rules:</h3>
                    <ul className="list-disc pl-6">
                      {selectedPiece.specialRules.map((rule, index) => (
                        <li key={index} className="mb-2">{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export default ChessRulesMenu;