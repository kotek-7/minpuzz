export type Piece = {
  id: string;
  x: number;
  y: number;
  placed: boolean;
  row?: number;
  col?: number;
  holder?: string; // userId of current holder
  // solution position (正解セル): 配置判定用にサーバ保持
  solRow?: number;
  solCol?: number;
};

export type Score = {
  placedByTeam: Record<string, number>; // teamId -> placed count
};

export type Timer = {
  startedAt: string; // ISO string
  durationMs: number; // milliseconds
};

export type TeamSummary = {
  teamId: string;
  memberCount: number;
};

export type MatchRecord = {
  id: string;
  teamA: TeamSummary;
  teamB: TeamSummary;
  status: string; // 'PREPARING' | 'READY' | 'FINISHED' etc.
  createdAt: string; // ISO string
};
