export const GAME_EVENTS = {
  JOIN_GAME: "join-game",
  GAME_INIT: "game-init",
  STATE_SYNC: "state-sync",
  GAME_START: "game-start",
  // re-sync
  REQUEST_GAME_INIT: "request-game-init",
  // in-game (click placement)
  PIECE_PLACE: "piece-place",
  PIECE_PLACED: "piece-placed",
  PIECE_PLACE_DENIED: "piece-place-denied",
  PROGRESS_UPDATE: "progress-update",
  TIMER_SYNC: "timer-sync",
  GAME_END: "game-end",
} as const;

export type GameSocketEvent = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];
