// ドメインの型定義

export interface Team {
  id: string;
  // 6桁英数字でユーザー間共有用（重複防止のためRedis Setで管理）
  teamNumber: string;
  currentMembers: number;
  // リアルタイムゲーム性能維持のため4名上限設定
  maxMembers: number;
  status: TeamStatus;
  // リーダー表示用 (User ID)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum TeamStatus {
  // メンバー参加待機中（マッチング不可状態）
  WAITING = "WAITING",
  // 人数条件満足でマッチング開始可能
  READY = "READY",
  // 対戦相手検索中（他チームからの参加拒否）
  MATCHING = "MATCHING",
  // ゲーム進行中（メンバー変更不可）
  IN_GAME = "IN_GAME",
  // ゲーム終了（TTL後自動削除対象）
  FINISHED = "FINISHED",
}

export interface TeamMember {
  id: string;
  // セッション管理・重複参加防止用
  userId: string;
  role: MemberRole;
  joinedAt: string;
  status: MemberStatus;
  // WebSocket切断検知・再接続処理用
  socketId?: string;
}

export enum MemberRole {
  // チーム削除・ゲーム開始権限保持
  LEADER = "LEADER",
  MEMBER = "MEMBER",
}

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  // 一時切断中（30秒でタイムアウト・自動除名）
  DISCONNECTED = "DISCONNECTED",
}

export interface MatchingTeamInfo {
  teamId: string;
  memberCount: number;
  joinedAt: string; // ISO8601形式
}