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
  const [activeSection, setActiveSection] = useState<'about' | 'pieces' | 'rules'>('about');

  return (
    <div className="bg-white shadow-2xl rounded-2xl w-full max-w-5xl overflow-hidden">
      {/* Header with integrated close button */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h1 className="text-2xl font-bold">Chess Guide & Information</h1>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('closeRulesMenu'))}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button 
          className={`flex-1 p-4 font-medium transition-all duration-200 ${
            activeSection === 'about' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
          onClick={() => setActiveSection('about')}
        >
          About Me
        </button>
        <button 
          className={`flex-1 p-4 font-medium transition-all duration-200 ${
            activeSection === 'pieces' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
          onClick={() => setActiveSection('pieces')}
        >
          Chess Pieces
        </button>
        <button 
          className={`flex-1 p-4 font-medium transition-all duration-200 ${
            activeSection === 'rules' 
              ? 'bg-blue-500 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
          onClick={() => setActiveSection('rules')}
        >
          Chess Rules
        </button>
      </div>


      {/* Content Area */}
      <div className="max-h-[75vh] overflow-y-auto">
        {activeSection === 'about' && (
          <div className="p-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3 text-gray-800">About Me</h2>
              <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-8 shadow-sm">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column - Personal Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Contact & Location</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        <a 
                          href="mailto:mikedowells150@gmail.com" 
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          mikedowells150@gmail.com
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-gray-700">Dublin, Ireland</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Connect With Me</h3>
                    <div className="space-y-3">
                      <a 
                        href="https://www.linkedin.com/in/dowellsmike/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-blue-600 hover:text-blue-800 transition-colors group"
                      >
                        <svg className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd"/>
                        </svg>
                        <span>LinkedIn</span>
                      </a>
                      <a 
                        href="https://github.com/dowells-mike" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 transition-colors group"
                      >
                        <svg className="w-5 h-5 text-gray-700 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
                        </svg>
                        <span>GitHub</span>
                      </a>
                      <a 
                        href="https://www.instagram.com/dowee.y/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-pink-600 hover:text-pink-800 transition-colors group"
                      >
                        <svg className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 0C7.284 0 6.944.012 5.877.06 4.814.107 4.086.277 3.45.525a5.566 5.566 0 00-2.011 1.309A5.566 5.566 0 00.13 3.845C-.118 4.481-.288 5.209-.335 6.272-.383 7.339-.395 7.679-.395 10.395s.012 3.056.06 4.123c.047 1.063.217 1.791.465 2.427a5.566 5.566 0 001.309 2.011 5.566 5.566 0 002.011 1.309c.636.248 1.364.418 2.427.465 1.067.048 1.407.06 4.123.06s3.056-.012 4.123-.06c1.063-.047 1.791-.217 2.427-.465a5.566 5.566 0 002.011-1.309 5.566 5.566 0 001.309-2.011c.248-.636.418-1.364.465-2.427.048-1.067.06-1.407.06-4.123s-.012-3.056-.06-4.123c-.047-1.063-.217-1.791-.465-2.427a5.566 5.566 0 00-1.309-2.011A5.566 5.566 0 0016.555.525C15.919.277 15.191.107 14.128.06 13.061.012 12.721 0 10.005 0H10zm0 1.802c2.67 0 2.987.01 4.042.059.976.045 1.505.207 1.858.344.467.182.8.398 1.15.748.35.35.566.683.748 1.15.137.353.3.882.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.976-.207 1.505-.344 1.858a3.097 3.097 0 01-.748 1.15c-.35.35-.683.566-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.045-1.505-.207-1.858-.344a3.097 3.097 0 01-1.15-.748 3.098 3.098 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.976.207-1.505.344-1.858.182-.467.398-.8.748-1.15.35-.35.683-.566 1.15-.748.353-.137.882-.3 1.857-.344C7.018 1.812 7.333 1.802 10.003 1.802H10zm0 3.058a5.14 5.14 0 100 10.28 5.14 5.14 0 000-10.28zm0 8.477a3.337 3.337 0 110-6.674 3.337 3.337 0 010 6.674zm5.338-8.67a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" clipRule="evenodd"/>
                        </svg>
                        <span>Instagram</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column - Bio & Projects */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">About</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Computing student with a passion for software and mobile development. 
                      Experienced with JavaScript, Python, and other modern web technologies 
                      through academic projects and internship experience. Seeking opportunities 
                      to grow as a software developer.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Featured Project</h3>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <a 
                        href="https://promptvault-web.onrender.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <h4 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                          PromptVault
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          A web application for managing and organizing AI prompts
                        </p>
                        <div className="flex items-center mt-3 text-blue-600 text-sm group-hover:text-blue-800 transition-colors">
                          <span>View Project</span>
                          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Chess App Info */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">About This Chess App</h4>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    An immersive chess experience built with React and TypeScript, featuring 
                    comprehensive game mechanics, multiple time controls, and modern UI design.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'pieces' && (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3 text-gray-800">Chess Pieces</h2>
              <p className="text-gray-600">Learn about each piece and how they move</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PIECE_RULES.map((piece) => (
                <div 
                  key={piece.name}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPiece(piece)}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src={piece.icon} 
                      alt={`${piece.name} icon`} 
                      className="w-12 h-12 mr-3" 
                    />
                    <h3 className="text-xl font-semibold text-gray-800">{piece.name}</h3>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{piece.description}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800 text-sm">Key Moves:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {piece.movementRules.slice(0, 2).map((rule, index) => (
                        <li key={index}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {piece.specialRules && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium">Special abilities available</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Detailed Piece View */}
            {selectedPiece && (
              <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center mb-6">
                  <img 
                    src={selectedPiece.icon} 
                    alt={`${selectedPiece.name} icon`} 
                    className="w-16 h-16 mr-4" 
                  />
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{selectedPiece.name}</h3>
                    <p className="text-gray-600">{selectedPiece.description}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-800">Movement Rules</h4>
                    <ul className="space-y-2">
                      {selectedPiece.movementRules.map((rule, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedPiece.specialRules && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-gray-800">Special Rules</h4>
                      <ul className="space-y-2">
                        {selectedPiece.specialRules.map((rule, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-gray-700">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'rules' && (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3 text-gray-800">Chess Rules</h2>
              <p className="text-gray-600">Complete guide to playing chess</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {/* Basic Rules */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                  Basic Rules
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Game Objective</h4>
                    <p className="text-gray-600 mb-4">Checkmate your opponent's king by placing it under attack with no escape.</p>
                    
                    <h4 className="font-semibold text-gray-800 mb-2">Turn Order</h4>
                    <p className="text-gray-600">White always moves first, then players alternate turns.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Piece Movement</h4>
                    <p className="text-gray-600 mb-4">Each piece has unique movement patterns. You must move when it's your turn.</p>
                    
                    <h4 className="font-semibold text-gray-800 mb-2">Capturing</h4>
                    <p className="text-gray-600">Capture opponent pieces by moving to their square.</p>
                  </div>
                </div>
              </div>

              {/* Special Moves */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                  Special Moves
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Castling</h4>
                    <p className="text-gray-600 text-sm mb-2">King and rook move simultaneously for safety.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• King hasn't moved</li>
                      <li>• Rook hasn't moved</li>
                      <li>• No pieces between them</li>
                      <li>• King not in check</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">En Passant</h4>
                    <p className="text-gray-600 text-sm mb-2">Special pawn capture move.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Opponent pawn moves 2 squares</li>
                      <li>• Your pawn is on same rank</li>
                      <li>• Capture immediately</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Promotion</h4>
                    <p className="text-gray-600 text-sm mb-2">Pawn reaches opposite end.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Choose Queen, Rook, Bishop, or Knight</li>
                      <li>• Usually choose Queen</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Game End Conditions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                  Game End Conditions
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Winning Conditions</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Checkmate</p>
                          <p className="text-sm text-gray-600">King is attacked and cannot escape</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Resignation</p>
                          <p className="text-sm text-gray-600">Opponent gives up</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Time Out</p>
                          <p className="text-sm text-gray-600">Opponent runs out of time</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Draw Conditions</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Stalemate</p>
                          <p className="text-sm text-gray-600">No legal moves, king not in check</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Insufficient Material</p>
                          <p className="text-sm text-gray-600">Cannot achieve checkmate</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">50-Move Rule</p>
                          <p className="text-sm text-gray-600">50 moves without capture/pawn move</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                        <div>
                          <p className="font-medium text-gray-800">Threefold Repetition</p>
                          <p className="text-sm text-gray-600">Same position occurs 3 times</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy Tips */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm mr-3">💡</span>
                  Quick Strategy Tips
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Opening</h4>
                    <p className="text-sm text-gray-600">Control the center, develop pieces, castle early</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Middle Game</h4>
                    <p className="text-sm text-gray-600">Improve piece positions, create threats, coordinate attacks</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Endgame</h4>
                    <p className="text-sm text-gray-600">Activate your king, promote pawns, simplify advantageous positions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ChessRulesMenu;