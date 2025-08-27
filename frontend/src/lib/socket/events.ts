export const SOCKET_EVENTS = {
  DISCONNECT: 'disconnect',
  JOIN_TEAM: 'join-team',
  LEAVE_TEAM: 'leave-team',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  TEAM_UPDATED: 'team-updated',
  JOIN_MATCHING_QUEUE: 'join-matching-queue',
  NAVIGATE_TO_MATCHING: 'navigate-to-matching',
  MATCH_FOUND: 'match-found',
  JOIN_GAME: 'join-game',
  GAME_INIT: 'game-init',
  GAME_START: 'game-start',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

