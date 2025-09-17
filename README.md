# Chess Game with AI Opponent

A modern, responsive chess game built with React and TypeScript, featuring Human vs Human and Human vs AI gameplay with multiple difficulty levels.

## Features

### Game Modes
- **Human vs Human**: Traditional two-player chess
- **Human vs AI**: Play against a computer opponent with configurable difficulty levels (Built-in or Stockfish engine)

### AI Opponent
- **Multiple Difficulty Levels**: Easy, Medium, Hard, Expert
- **Engine Choice**: Built-in (fast, lightweight) or Stockfish (strong, GPLv3)
- **Time-Aware Decision Making**: AI considers time pressure and remaining time
- **Professional Chess Evaluation**: Uses piece-square tables and minimax with alpha-beta pruning (built-in engine)
- **Smart Promotion**: AI can promote pawns to different pieces

### Chess Features
- **Full Chess Rules**: Complete implementation including special moves
- **Algebraic Notation**: Standard SAN notation for all moves
- **PGN Export**: Download games or copy to clipboard
- **Undo/Redo**: Full move history with replay functionality
- **Time Controls**: Various time formats (Blitz, Rapid, Classical)
- **Game Analysis**: Move history, captured pieces, and game state tracking

### User Interface
- **Responsive Design**: Works on mobile and desktop
- **Multiple Themes**: Classic, Wooden, Marble, Vintage, Dark Mode
- **Sound Effects**: Move sounds, check alerts, and background music
- **Visual Feedback**: Highlighted moves, check indicators, and threat display

## Deployment

### Live Demo
The app is deployed on Render: [Chess Game](https://chess-game-ai.onrender.com/)

### Deploy Your Own
1. Fork this repository
2. Connect to Render and create a new Static Site
3. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Node Version**: 18+

## Local Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd chess-game
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production
```bash
npm run build
```

Builds the app for production to the `build` folder with optimized performance.

## Engine Selection
In Settings > Display tab, choose between:
- Basic: bundled evaluation engine (MIT)
- Stockfish: stronger open-source engine (GPLv3)

When Stockfish is selected the bundle includes the Stockfish WASM module and GPL obligations apply to distribution.

## How to Play

1. **Start a New Game**: Click the blue "Play" button
2. **Choose Mode**: Select Human vs Human or Human vs AI
3. **AI Settings**: If playing against AI, choose difficulty and your color
4. **Make Moves**: Click pieces to select and move them
5. **Special Features**: Use undo/redo, export PGN, or adjust time controls

## AI Implementation (Built-in Engine)
- Minimax with alpha-beta pruning
- Piece-Square positional tables
- Basic SAN generation
- Time-adaptive move selection

## Stockfish Integration
- Uses official `stockfish` WASM build via UCI commands
- Sends FEN + clock times (wtime/btime + increments)
- Movetime caps per difficulty for responsiveness

## Technologies Used

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling framework
- **Radix UI** - Accessible UI components
- **Lucide React** - Beautiful icon library
- **Custom Built-in Chess Engine** - Professional AI implementation
- **Optional Stockfish Engine (WASM)** - Strong open-source chess engine

## Engine & Licensing
Stockfish is licensed under the GNU General Public License v3 (GPLv3). If you distribute a build that includes Stockfish you must:
- Provide corresponding source code (including build scripts)
- Preserve copyright and license notices
- Not impose further restrictions beyond the GPL

Project Strategy:
- Default code (excluding Stockfish) is MIT licensed
- Selecting Stockfish dynamically loads the GPLv3 engine
- Distributing the combined bundle triggers GPL obligations

Avoiding GPL distribution duties:
1. Ship only the basic engine (remove Stockfish import & selector before build)
2. Or provide Stockfish via a separate service with clear licensing boundaries

Attribution:
- Stockfish (https://stockfishchess.org/) © Stockfish developers (GPLv3)

## License

The project code (excluding the Stockfish engine) is MIT licensed. See LICENSE file. Stockfish remains under GPLv3.

---
Generated with create-react-app. Standard CRA scripts for test/build/eject remain available.
