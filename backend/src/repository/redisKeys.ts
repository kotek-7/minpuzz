import { RedisHashKey, RedisSetKey, RedisStringKey } from "./redisKeyTypes";

/**
 * Redis のキー定義
 * 
 * 【重要】キー操作時の必須ルール:
 * 
 * ■ チーム作成時:
 *   team() + teamByNumber() + teamNumbers() を必ずセットで作成
 * 
 * ■ チーム削除時:
 *   team() + teamByNumber() + teamMembers() + teamNumbers() を必ずセットで削除
 * 
 * ■ ソケット接続時:
 *   socketToUser() + userToSocket() を必ずセットで作成
 * 
 * ■ ソケット切断時:
 *   socketToUser() + userToSocket() を必ずセットで削除
 */
export const redisKeys = {
  // チーム基本情報
  team: (teamId: string) => RedisStringKey(`team:${teamId}`),
  // チーム番号の一意性保証とO(1)検索用インデックス
  teamByNumber: (teamNumber: string) => RedisStringKey(`team:number:${teamNumber}`),
  // チームのメンバー管理
  teamMembers: (teamId: string) => RedisHashKey(`team:${teamId}:members`),
  teamMember: (teamId: string, memberId: string) => RedisStringKey(`team:${teamId}:member:${memberId}`),
  // Setでアクティブチーム番号重複防止
  teamNumbers: () => RedisSetKey("active:team:numbers"),
  
  // ユーザー情報
  userName: (userId: string) => RedisStringKey(`user:${userId}:name`),
  
  // WebSocketセッション管理：複数サーバー間での共有セッション対応
  socketToUser: (socketId: string) => RedisStringKey(`socket:${socketId}:user`),
  userToSocket: (userId: string) => RedisStringKey(`user:${userId}:socket`),

  // マッチング待機チーム管理
  matchingQueue: () => RedisSetKey(`matching:queue`),
  matchingTeam: (teamId: string) => RedisStringKey(`matching:team:${teamId}`),

  // マッチ情報
  match: (matchId: string) => RedisStringKey(`match:${matchId}`),
  matchTeamConnections: (matchId: string, teamId: string) => RedisSetKey(`match:${matchId}:team:${teamId}:connected`),

  // マッチングの軽量ロック/クレーム管理
  matchTeamLocks: () => RedisSetKey(`match:locks:teams`),
  matchTeamLock: (teamId: string) => RedisStringKey(`match:lock:team:${teamId}`),
  matchPairClaims: () => RedisSetKey(`match:claims:pairs`),
  matchPairClaim: (pairKey: string) => RedisStringKey(`match:claim:pair:${pairKey}`),

  // ゲーム中状態（M2以降）
  matchPieces: (matchId: string) => RedisHashKey(`match:${matchId}:pieces`),
  matchPieceLock: (matchId: string, pieceId: string) => RedisStringKey(`match:${matchId}:piece:${pieceId}:lock`),
  matchLocksPieces: (matchId: string) => RedisSetKey(`match:${matchId}:locks:pieces`),
  matchScore: (matchId: string) => RedisHashKey(`match:${matchId}:score`),
  matchTimer: (matchId: string) => RedisStringKey(`match:${matchId}:timer`),
} as const;
