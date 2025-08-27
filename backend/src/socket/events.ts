export const SOCKET_EVENTS = {
  DISCONNECT: 'disconnect',

  JOIN_TEAM: 'join-team',
  LEAVE_TEAM: 'leave-team',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  TEAM_UPDATED: 'team-updated',

  // マッチング関連
  JOIN_MATCHING_QUEUE: 'join-matching-queue',
  NAVIGATE_TO_MATCHING: 'navigate-to-matching',
  MATCH_FOUND: 'match-found',
  JOIN_GAME: 'join-game',
  GAME_INIT: 'game-init',
  GAME_START: 'game-start',

  // ゲーム中（M3範囲）
  PIECE_GRAB: 'piece-grab',
  PIECE_GRABBED: 'piece-grabbed',
  PIECE_GRAB_DENIED: 'piece-grab-denied',
  PIECE_MOVE: 'piece-move',
  PIECE_MOVED: 'piece-moved',
  PIECE_RELEASE: 'piece-release',
  PIECE_RELEASED: 'piece-released',

  // ゲーム中（M4 追加）
  PIECE_PLACE: 'piece-place',
  PIECE_PLACED: 'piece-placed',
  PIECE_PLACE_DENIED: 'piece-place-denied',
  // 進捗/終了（public）
  PROGRESS_UPDATE: 'progress-update',
  GAME_END: 'game-end',
  // タイマー（M5）
  TIMER_SYNC: 'timer-sync',
  // 同期（M6）
  REQUEST_GAME_INIT: 'request-game-init',
  STATE_SYNC: 'state-sync',
} as const;

export type SocketEvents = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export interface JoinTeamPayload {
  teamId: string;
  userId: string;
}

export interface LeaveTeamPayload {
  teamId: string;
  userId: string;
}

export interface MemberJoinedPayload {
  teamId: string;
  userId: string;
  socketId: string;
  timestamp: string;
}

export interface MemberLeftPayload {
  teamId: string;
  userId: string;
  timestamp: string;
}

export interface TeamUpdatedPayload {
  teamId: string;
  memberCount: number;
  timestamp: string;
}

export interface JoinMatchingQueuePayload {
  teamId: string;
  userId: string;
}

export interface NavigateToMatchingPayload {
  teamId: string;
  timestamp: string;
}

export interface MatchFoundPayload {
  // 対戦確定の一意識別子（フロント側で重複受信の排除・追跡に利用）
  matchId: string;
  self: {
    teamId: string;
    memberCount: number;
  };
  partner: {
    teamId: string;
    memberCount: number;
  };
  timestamp: string;
}

export interface JoinGamePayload {
  matchId: string;
  teamId: string;
  userId: string;
}

export interface GameStartPayload {
  matchId: string;
  timestamp: string;
}

export type { GameInitPayload } from "../model/game/init.js";

// ゲーム中イベントのPayload型（Zod定義はschemas.ts）
export type PieceGrabPayload = {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
};

export type PieceGrabbedPayload = {
  pieceId: string;
  byUserId: string;
};

export type PieceGrabDeniedReason = 'locked' | 'placed' | 'notFound';
export type PieceGrabDeniedPayload = {
  pieceId: string;
  reason: PieceGrabDeniedReason;
};

export type PieceMovePayload = {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  x: number;
  y: number;
  ts: number;
};

export type PieceMovedPayload = {
  pieceId: string;
  x: number;
  y: number;
  byUserId: string;
  ts: number;
};

export type PieceReleasePayload = {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  x: number;
  y: number;
};

export type PieceReleasedPayload = {
  pieceId: string;
  x: number;
  y: number;
  byUserId: string;
};

// M4 payload types（Zodはschemas.tsで定義）
export type PiecePlacePayload = {
  matchId: string;
  teamId: string;
  userId: string;
  pieceId: string;
  row: number;
  col: number;
  x: number;
  y: number;
};

export type PiecePlacedPayload = {
  pieceId: string;
  row: number;
  col: number;
  byUserId: string;
};

export type PiecePlaceDeniedReason = 'notFound' | 'placed' | 'notHolder' | 'invalidCell';
export type PiecePlaceDeniedPayload = {
  pieceId: string;
  reason: PiecePlaceDeniedReason;
};

export type ProgressUpdatePayload = {
  placedByTeam: Record<string, number>;
};

export type GameEndPayload = {
  reason: 'completed' | 'timeout' | 'forfeit';
  winnerTeamId: string | null;
  scores: Record<string, number>;
  finishedAt: string;
};

export type TimerSyncPayload = {
  nowIso: string;
  startedAt: string | null;
  durationMs: number | null;
  remainingMs: number;
};

// M6
export type RequestGameInitPayload = {
  matchId: string;
  teamId: string;
  userId: string;
};

export type StateSyncPayload = {
  board: { rows: number; cols: number };
  pieces: any[]; // Piece type is declared in model layer; runtime payload uses schema
  score: { placedByTeam: Record<string, number> };
  timer: { startedAt: string; durationMs: number } | null;
  matchStatus: string;
};
