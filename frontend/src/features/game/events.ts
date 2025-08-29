export const GAME_EVENTS = {
  JOIN_GAME: "join-game",
  GAME_INIT: "game-init",
  STATE_SYNC: "state-sync",
  GAME_START: "game-start",
} as const;

export type GameSocketEvent = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];

