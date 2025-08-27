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
