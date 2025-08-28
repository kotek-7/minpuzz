export const GAME_EVENTS = {
  // クライアント → サーバ
  JOIN_GAME: "join-game",
  REQUEST_GAME_INIT: "request-game-init",
  PIECE_GRAB: "piece-grab",
  PIECE_MOVE: "piece-move",
  PIECE_RELEASE: "piece-release",
  PIECE_PLACE: "piece-place",
  CURSOR_MOVE: "cursor-move",
  REQUEST_STATE_SYNC: "request-state-sync",

  // サーバ → クライアント
  GAME_INIT: "game-init",
  STATE_SYNC: "state-sync",
  GAME_START: "game-start",
  PIECE_GRABBED: "piece-grabbed",
  PIECE_GRAB_DENIED: "piece-grab-denied",
  PIECE_MOVED: "piece-moved",
  PIECE_RELEASED: "piece-released",
  PIECE_PLACED: "piece-placed",
  PIECE_PLACE_DENIED: "piece-place-denied",
  PROGRESS_UPDATE: "progress-update",
  TIMER_SYNC: "timer-sync",
  GAME_END: "game-end",
} as const;

export type GameSocketEvent = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];

// イベントペイロードの型定義
export interface GameInitPayload {
  matchId?: string;
  board: { rows: number; cols: number };
  pieces: Array<{
    id: string;
    x: number;
    y: number;
    placed?: boolean;
    row?: number;
    col?: number;
    holder?: string;
  }>;
  startedAt?: string | null;
  durationMs?: number | null;
  myUserId?: string;
}

export interface StateSyncPayload extends GameInitPayload {
  score: { placedByTeam: Record<string, number> };
  timer?: { startedAt: string; durationMs: number } | null;
  matchStatus?: string;
}

export interface PieceGrabPayload {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
}

export interface PieceMovePayload {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  x: number;
  y: number;
  ts: number;
}

export interface PieceReleasePayload {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  x: number;
  y: number;
}

export interface PiecePlacePayload {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  row: number;
  col: number;
  x: number;
  y: number;
}

export interface CursorMovePayload {
  matchId: string;
  teamId: string;
  userId: string;
  x: number;
  y: number;
  ts: number;
}

export interface RequestStateSyncPayload {
  matchId: string;
  teamId: string;
  userId: string;
}

export interface PieceGrabbedPayload {
  pieceId: string;
  byUserId: string;
}

export interface PieceGrabDeniedPayload {
  pieceId: string;
  reason: 'locked' | 'placed' | 'notFound';
}

export interface PieceMovedPayload {
  pieceId: string;
  x: number;
  y: number;
  byUserId: string;
  ts: number;
}

export interface PieceReleasedPayload {
  pieceId: string;
  x: number;
  y: number;
  byUserId: string;
}

export interface PiecePlacedPayload {
  pieceId: string;
  row: number;
  col: number;
  byUserId: string;
}

export interface PiecePlaceDeniedPayload {
  pieceId: string;
  reason: 'notFound' | 'placed' | 'notHolder' | 'invalidCell';
}

export interface ProgressUpdatePayload {
  placedByTeam: Record<string, number>;
}

export interface TimerSyncPayload {
  serverNow: string;
  startedAt: string;
  duration: number;
  remainingMs?: number;
}

export interface GameEndPayload {
  reason: 'completed' | 'timeout' | 'forfeit';
  winnerTeamId: string | null;
  scores: Record<string, number>;
  finishedAt: string;
}

