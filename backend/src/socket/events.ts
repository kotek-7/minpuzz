export const SOCKET_EVENTS = {
  DISCONNECT: 'disconnect',

  JOIN_TEAM: 'join-team',
  LEAVE_TEAM: 'leave-team',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  TEAM_UPDATED: 'team-updated',
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