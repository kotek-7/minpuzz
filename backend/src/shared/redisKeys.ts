import { RedisHashKey, RedisSetKey, RedisStringKey } from "./redisKeyTypes";

// Redis のキー定義
export const redisKeys = {
  team: (teamId: string) => RedisStringKey(`team:${teamId}`),
  // チーム番号の一意性保証とO(1)検索用インデックス
  teamByNumber: (teamNumber: string) => RedisStringKey(`team:number:${teamNumber}`),
  // チームのメンバー管理
  teamMembers: (teamId: string) => RedisHashKey(`team:${teamId}:members`),
  teamMember: (teamId: string, memberId: string) => RedisStringKey(`team:${teamId}:member:${memberId}`),
  // Setでアクティブチーム番号重複防止
  teamNumbers: () => RedisSetKey("active:team:numbers"),
} as const;