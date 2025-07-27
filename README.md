# Chess Game with AI Opponent

A modern, responsive chess game built with React and TypeScript, featuring Human vs Human and Human vs AI gameplay with multiple difficulty levels.

## Features

### Game Modes
- **Human vs Human**: Traditional two-player chess
- **Human vs AI**: Play against a computer opponent with configurable difficulty levels

### AI Opponent
- **Multiple Difficulty Levels**: Easy, Medium, Hard, Expert
- **Time-Aware Decision Making**: AI considers time pressure and remaining time
- **Professional Chess Evaluation**: Uses piece-square tables and minimax with alpha-beta pruning
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

## How to Play

1. **Start a New Game**: Click the blue "Play" button
2. **Choose Mode**: Select Human vs Human or Human vs AI
3. **AI Settings**: If playing against AI, choose difficulty and your color
4. **Make Moves**: Click pieces to select and move them
5. **Special Features**: Use undo/redo, export PGN, or adjust time controls

## AI Implementation

The AI opponent uses a sophisticated chess engine featuring:
- **Minimax Algorithm** with alpha-beta pruning for move selection
- **Piece-Square Tables** for positional evaluation
- **Time Management** that adapts to remaining time and increments
- **Multiple Difficulty Levels** with different search depths and randomness
- **Standard Chess Practices** following professional engine design

## Technologies Used

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling framework
- **Radix UI** - Accessible UI components
- **Lucide React** - Beautiful icon library
- **Custom Chess Engine** - Professional AI implementation

## License

This project is open source and available under the MIT License.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
