export enum GameStatus {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED'
}

export enum GameMode {
  HOST = 'HOST', // User calls numbers
  PLAYER = 'PLAYER' // User plays a card
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isBot: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'system' | 'win';
}

export interface BingoNumber {
  value: number;
  called: boolean;
  phrase?: string; // AI generated phrase
}

export interface BingoCell {
  value: number | 'FREE';
  daubed: boolean;
  colIndex: number; // 0-4 (B-I-N-G-O)
  rowIndex: number;
}

export type BingoCardState = BingoCell[][];

export interface GameConfig {
  autoCall: boolean;
  callSpeed: number; // seconds
  language: 'vi' | 'en';
}
