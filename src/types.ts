type Color = "w" | "b";
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type Position = `${number},${number}`;

interface Piece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

type Board = (Piece | null)[][];

type BoardTheme = {
    name: string;
    lightSquare: string;
    darkSquare: string;
    background: string;
    boardTexture?: string;
};

type TimeControl = {
    mode: 'blitz' | 'rapid' | 'classical';
    initialTime: number;
    increment: number;
};

export type { Color, PieceType, Position, Piece, Board, BoardTheme, TimeControl };
