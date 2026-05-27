export interface GameRoom {
  id: string;
  grid: string[][];
  players: { [socketId: string]: PlayerState };
  gameStarted: boolean;
  gameOver: boolean;
  timerDuration: number; // seconds
  startTime?: number;
}

export interface PlayerState {
  name: string;
  score: number;
  foundWords: string[];
  color: string;
}

export interface ServerToClientEvents {
  room_joined: (data: { roomId: string; playerId: string; grid: string[][]; timerDuration: number }) => void;
  game_start: (data: { grid: string[][]; startTime: number; timerDuration: number }) => void;
  game_over: (data: { players: { [id: string]: PlayerState } }) => void;
  player_update: (data: { playerId: string; state: PlayerState }) => void;
  player_left: (data: { playerId: string }) => void;
  error: (msg: string) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { playerName: string; timerDuration: number }) => void;
  join_room: (data: { roomId: string; playerName: string }) => void;
  word_found: (data: { roomId: string; word: string; score: number }) => void;
  start_game: (data: { roomId: string }) => void;
}
