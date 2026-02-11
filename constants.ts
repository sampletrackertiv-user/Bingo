import { GameConfig } from './types';

export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

export const DEFAULT_CONFIG: GameConfig = {
  autoCall: true,
  callSpeed: 4, // seconds
  language: 'vi'
};

export const TOTAL_NUMBERS = 75;

export const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'
];

export const BOT_NAMES = [
  'An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khánh', 'Lan', 'Minh', 'Nga',
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Jamie'
];

export const WINNING_PATTERNS = {
  ROW: 'Hàng Ngang',
  COL: 'Hàng Dọc',
  DIAGONAL: 'Đường Chéo',
  FULL_HOUSE: 'Full House'
};

export const UI_TEXT = {
  vi: {
    title: 'BingoHub',
    enterName: 'Nhập tên của bạn',
    joinGame: 'Tham Gia Ngay',
    createRoom: 'Tạo Phòng (Host)',
    playNow: 'Chơi Ngay',
    hostMode: 'Chế độ Host',
    playerMode: 'Chế độ Người Chơi',
    waitingForGame: 'Đang chờ bắt đầu...',
    gameInProgress: 'Trò chơi đang diễn ra',
    lastCalled: 'Số vừa gọi',
    previous: 'Số trước đó',
    chat: 'Trò chuyện',
    players: 'Người chơi',
    bingo: 'BINGO!',
    autoPlay: 'Tự động gọi',
    manualCall: 'Gọi số tiếp theo',
    gameOver: 'Trò chơi kết thúc',
    winner: 'Người chiến thắng:',
    restart: 'Chơi lại',
    settings: 'Cài đặt',
    speed: 'Tốc độ gọi (giây)',
    language: 'Ngôn ngữ'
  },
  en: {
    title: 'BingoHub',
    enterName: 'Enter your name',
    joinGame: 'Join Game',
    createRoom: 'Create Room (Host)',
    playNow: 'Play Now',
    hostMode: 'Host Mode',
    playerMode: 'Player Mode',
    waitingForGame: 'Waiting to start...',
    gameInProgress: 'Game in progress',
    lastCalled: 'Last Called',
    previous: 'Previous',
    chat: 'Chat',
    players: 'Players',
    bingo: 'BINGO!',
    autoPlay: 'Auto Call',
    manualCall: 'Call Next Number',
    gameOver: 'Game Over',
    winner: 'Winner:',
    restart: 'Play Again',
    settings: 'Settings',
    speed: 'Call Speed (sec)',
    language: 'Language'
  }
};
