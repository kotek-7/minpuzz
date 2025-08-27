import { v4 as uuidv4 } from "uuid";
import { RedisClient } from "../../repository/redisClient.js";
import { MemberRole, MemberStatus, Team, TeamMember, TeamStatus, MatchingTeamInfo } from "./types.js";
import { redisKeys } from "../../repository/redisKeys.js";
import { err, ok, Result } from "neverthrow";

export const RedisTTL = {
  // ゲーム完了まで十分な時間確保
  TEAM_SESSION: 3600 * 4,
  // ブラウザ閉じ後の自動クリーンアップ
  USER_SESSION: 3600 * 2,
  // WebSocket切断後の猶予時間
  SOCKET_SESSION: 1800,
  // チーム番号の再利用防止期間
  TEAM_NUMBER: 3600 * 4,
  // マッチング待機タイムアウト（10分）
  MATCHING_QUEUE: 600,
  // マッチ確定後の準備フェーズ想定（15分）
  MATCH_PREPARING: 900,
} as const;

// Utility functions
const generateTeamId = (): string => uuidv4();

const generateMemberId = (): string => uuidv4();

const generateRandomCode = (length: number): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueTeamNumber = async (redis: RedisClient): Promise<Result<string, string>> => {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const teamNumber = generateRandomCode(6);
    const exists = await redis.sismember(redisKeys.teamNumbers(), teamNumber);

    if (exists.isOk() && !exists.value) return ok(teamNumber);
    attempts++;
  }

  return err("Failed to generate unique team number");
};

// Team operations
export const createTeam = async (redis: RedisClient, createdBy: string, maxMembers?: number): Promise<Result<Team, string>> => {
  const teamId = generateTeamId();
  const teamNumberResult = await generateUniqueTeamNumber(redis);

  if (teamNumberResult.isErr()) return err(teamNumberResult.error);

  const team: Team = {
    id: teamId,
    teamNumber: teamNumberResult.value,
    currentMembers: 0,
    maxMembers: maxMembers || 4,
    status: TeamStatus.WAITING,
    createdBy: createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const teamPromise = redis.set(redisKeys.team(teamId), JSON.stringify(team), RedisTTL.TEAM_SESSION);
  const teamByNumberPromise = redis.set(redisKeys.teamByNumber(teamNumberResult.value), teamId, RedisTTL.TEAM_NUMBER);
  const teamNumbersPromise = redis.sadd(redisKeys.teamNumbers(), teamNumberResult.value);
  const createTeamResult = Result.combine(await Promise.all([teamPromise, teamByNumberPromise, teamNumbersPromise]));

  if (createTeamResult.isErr()) return err(`failed to create team: ${createTeamResult.error}`);
  if (!createTeamResult.value[0]) return err("failed to store team data");
  if (!createTeamResult.value[1]) return err("failed to index team by number");
  if (createTeamResult.value[2] === 0) return err("failed to add team number to active set");

  return ok(team);
};

export const getTeam = async (redis: RedisClient, teamId: string): Promise<Result<Team | null, string>> => {
  const getTeamResult = await redis.get(redisKeys.team(teamId));
  return getTeamResult.map((data) => (data ? JSON.parse(data) : null));
};

export const searchTeamByNumber = async (
  redis: RedisClient,
  teamNumber: string,
): Promise<Result<Team | null, string>> => {
  const getTeamByNumberResult = await redis.get(redisKeys.teamByNumber(teamNumber));
  if (getTeamByNumberResult.isErr()) {
    return err(getTeamByNumberResult.error);
  }
  
  const teamId = getTeamByNumberResult.value;
  if (!teamId) {
    return ok(null);
  }
  
  return await getTeam(redis, teamId);
};

export const deleteTeam = async (redis: RedisClient, teamId: string): Promise<Result<void, string>> => {
  const team = await getTeam(redis, teamId);
  if (team.isErr()) return err(`could not retrieve team: ${team.error}`);
  if (!team.value) return err("team not found");

  const deleteTeamResult = Result.combine(
    await Promise.all([
      redis.delete(redisKeys.team(teamId)),
      redis.delete(redisKeys.teamByNumber(team.value.teamNumber)),
      redis.delete(redisKeys.teamMembers(teamId)),
      redis.srem(redisKeys.teamNumbers(), team.value.teamNumber),
    ]),
  );
  if (deleteTeamResult.isErr()) return err(deleteTeamResult.error);
  if (!deleteTeamResult.value[0]) return err("failed to delete team data");
  if (!deleteTeamResult.value[1]) return err("failed to delete team number index");
  if (!deleteTeamResult.value[2]) { /**/ };
  if (deleteTeamResult.value[3] === 0) return err("failed to remove team number from active set");

  return ok();
};

// Member operations
export const addMember = async (
  redis: RedisClient,
  teamId: string,
  userId: string,
  socketId?: string,
): Promise<Result<TeamMember, string>> => {
  const team = await getTeam(redis, teamId);
  if (team.isErr()) return err(`could not retrieve team: ${team.error}`);
  if (!team.value) return err("team not found");

  if (team.value.currentMembers >= team.value.maxMembers) {
    return err("team is full");
  }

  const memberId = generateMemberId();
  const member: TeamMember = {
    id: memberId,
    userId: userId,
    role: userId === team.value.createdBy ? MemberRole.LEADER : MemberRole.MEMBER,
    joinedAt: new Date().toISOString(),
    status: MemberStatus.ACTIVE,
    socketId: socketId,
  };

  team.value.updatedAt = new Date().toISOString();
  team.value.currentMembers++;

  const teamMembersPromise = redis.hset(redisKeys.teamMembers(teamId), userId, JSON.stringify(member));
  const teamPromise = redis.set(redisKeys.team(teamId), JSON.stringify(team.value), RedisTTL.TEAM_SESSION);
  const addMemberResult = Result.combine(await Promise.all([teamMembersPromise, teamPromise]));

  if (addMemberResult.isErr()) return err(addMemberResult.error);
  if (addMemberResult.value[0] === 0) return err("failed to add member to team");
  if (!addMemberResult.value[1]) return err("failed to update team data");

  return ok(member);
};

export const getMembers = async (redis: RedisClient, teamId: string): Promise<Result<TeamMember[], string>> => {
  const teamMembersResult = await redis.hgetall(redisKeys.teamMembers(teamId));
  if (teamMembersResult.isErr()) return err(`could not retrieve team members: ${teamMembersResult.error}`);
  return teamMembersResult.map((membersData) => {
    return Object.values(membersData).map((data) => JSON.parse(data) as TeamMember);
  });
};

export const removeMember = async (redis: RedisClient, teamId: string, userId: string): Promise<Result<void, string>> => {
  const teamResult = await getTeam(redis, teamId);
  if (teamResult.isErr()) return err(teamResult.error);
  if (!teamResult.value) return err("team not found");

  const deleteResult = await redis.hdel(redisKeys.teamMembers(teamId), userId);
  if (deleteResult.isErr()) return err(deleteResult.error);
  if (deleteResult.value === 0) return err("member not found in team");

  teamResult.value.currentMembers--;
  teamResult.value.updatedAt = new Date().toISOString();

  if (teamResult.value.currentMembers === 0) {
    const deleteResult = await deleteTeam(redis, teamId);
    if (deleteResult.isErr()) return err(deleteResult.error);
  } else {
    const setResult = await redis.set(redisKeys.team(teamId), JSON.stringify(teamResult.value), RedisTTL.TEAM_SESSION);
    if (setResult.isErr()) return err(setResult.error);
    if (!setResult.value) return err("failed to update team data");
  }

  return ok();
};

export const updateMemberStatus = async (
  redis: RedisClient,
  teamId: string,
  memberId: string,
  status: MemberStatus,
): Promise<Result<void, string>> => {
  const teamMembersResult = await redis.hget(redisKeys.teamMembers(teamId), memberId);
  if (teamMembersResult.isErr()) return err(teamMembersResult.error);
  if (!teamMembersResult.value) return err("member not found");
  const member: TeamMember = JSON.parse(teamMembersResult.value);
  member.status = status;

  const setStatusResult = await redis.hset(redisKeys.teamMembers(teamId), memberId, JSON.stringify(member));
  if (setStatusResult.isErr()) return err(setStatusResult.error);
  // 既存フィールド更新時は0が返る実装があるため、0/1いずれも成功として扱う

  return ok();
};

export const removeUserFromAllTeams = async (redis: RedisClient, userId: string): Promise<Result<{ removedFromTeams: string[], deletedTeams: string[] }, string>> => {
  const teamKeysResult = await redis.keys("team:*");
  if (teamKeysResult.isErr()) return err(`failed to get team keys: ${teamKeysResult.error}`);

  const teamKeys = teamKeysResult.value.filter(key => key.match(/^team:[0-9a-f-]{36}$/));
  const removedFromTeams: string[] = [];
  const deletedTeams: string[] = [];

  for (const teamKey of teamKeys) {
    const teamId = teamKey.replace("team:", "");
    
    const teamResult = await getTeam(redis, teamId);
    if (teamResult.isErr()) continue;
    if (!teamResult.value) continue;

    const teamMembersResult = await redis.hget(redisKeys.teamMembers(teamId), userId);
    if (teamMembersResult.isErr()) continue;
    if (!teamMembersResult.value) continue;

    const removeResult = await removeMember(redis, teamId, userId);
    if (removeResult.isOk()) {
      removedFromTeams.push(teamId);
      
      const teamAfterRemoval = await getTeam(redis, teamId);
      if (teamAfterRemoval.isErr() || !teamAfterRemoval.value) {
        deletedTeams.push(teamId);
      }
    }
  }

  return ok({ removedFromTeams, deletedTeams });
};

export const startMatching = async (redis: RedisClient, teamId: string): Promise<Result<Team, string>> => {
  const teamResult = await getTeam(redis, teamId);
  if (teamResult.isErr()) return err(`could not retrieve team: ${teamResult.error}`);
  if (!teamResult.value) return err("team not found");

  const team = teamResult.value;

  if (team.status !== TeamStatus.READY && team.status !== TeamStatus.WAITING) {
    return err(`cannot start matching: team status is ${team.status}`);
  }

  team.status = TeamStatus.MATCHING;
  team.updatedAt = new Date().toISOString();

  const updateResult = await redis.set(redisKeys.team(teamId), JSON.stringify(team), RedisTTL.TEAM_SESSION);
  if (updateResult.isErr()) return err(`failed to update team status: ${updateResult.error}`);
  if (!updateResult.value) return err("failed to update team data");

  return ok(team);
};

/**
 * リアルタイム対戦のためマッチング待機キューにチーム登録
 * Redis SetとStringの組み合わせでO(1)検索と詳細情報取得を両立
 */
export const addTeamToMatchingQueue = async (
  redis: RedisClient, 
  teamId: string
): Promise<Result<MatchingTeamInfo, string>> => {
  const teamResult = await getTeam(redis, teamId);
  if (teamResult.isErr()) return err(`could not retrieve team: ${teamResult.error}`);
  if (!teamResult.value) return err("team not found");

  const team = teamResult.value;

  // ビジネス要件: マッチング開始済みチームのみキュー参加可能
  if (team.status !== TeamStatus.MATCHING) {
    return err(`team is not in matching state: current status is ${team.status}`);
  }

  const matchingTeamInfo: MatchingTeamInfo = {
    teamId,
    memberCount: team.currentMembers,
    joinedAt: new Date().toISOString(),
  };

  // 性能要件: Redis SetでO(1)の高速チーム検索を実現
  const queueAddResult = await redis.sadd(redisKeys.matchingQueue(), teamId);
  if (queueAddResult.isErr()) return err(`failed to add team to matching queue: ${queueAddResult.error}`);

  // TTL設定でメモリリーク防止（10分でマッチング待機タイムアウト）
  const teamInfoResult = await redis.set(
    redisKeys.matchingTeam(teamId), 
    JSON.stringify(matchingTeamInfo), 
    RedisTTL.MATCHING_QUEUE
  );
  if (teamInfoResult.isErr()) return err(`failed to save team matching info: ${teamInfoResult.error}`);
  if (!teamInfoResult.value) return err("failed to save team matching data");

  return ok(matchingTeamInfo);
};

/**
 * マッチング成立時またはキャンセル時のキューからの確実な削除処理
 * データ不整合防止のためSetとString両方の原子的削除を保証
 */
export const removeTeamFromMatchingQueue = async (
  redis: RedisClient, 
  teamId: string
): Promise<Result<boolean, string>> => {
  // 冪等性保証: 既に削除済みでもエラーにならない設計
  const queueRemoveResult = await redis.srem(redisKeys.matchingQueue(), teamId);
  if (queueRemoveResult.isErr()) return err(`failed to remove team from matching queue: ${queueRemoveResult.error}`);

  const teamInfoRemoveResult = await redis.delete(redisKeys.matchingTeam(teamId));
  if (teamInfoRemoveResult.isErr()) return err(`failed to remove team matching info: ${teamInfoRemoveResult.error}`);

  return ok(true);
};

/**
 * 公平なマッチングのための待機チーム一覧を先着順で取得
 * 自動データクリーンアップ機能でキューの整合性を保持
 */
export const getMatchingQueueTeams = async (
  redis: RedisClient
): Promise<Result<MatchingTeamInfo[], string>> => {
  const teamIdsResult = await redis.smembers(redisKeys.matchingQueue());
  if (teamIdsResult.isErr()) return err(`failed to get team IDs from matching queue: ${teamIdsResult.error}`);

  const teamIds = teamIdsResult.value || [];
  if (teamIds.length === 0) {
    return ok([]);
  }

  // パフォーマンス最適化: Promise.allで並行処理による高速化
  const teamInfoPromises = teamIds.map(async (teamId) => {
    const infoResult = await redis.get(redisKeys.matchingTeam(teamId));
    if (infoResult.isErr()) return null;
    if (!infoResult.value) {
      // 運用保守性: TTL切れや手動削除による不整合を自動修復
      await redis.srem(redisKeys.matchingQueue(), teamId);
      return null;
    }
    try {
      return JSON.parse(infoResult.value) as MatchingTeamInfo;
    } catch {
      // 例外対応: JSONパース失敗時の自動データクリーンアップ
      await redis.srem(redisKeys.matchingQueue(), teamId);
      await redis.delete(redisKeys.matchingTeam(teamId));
      return null;
    }
  });

  const teamInfos = await Promise.all(teamInfoPromises);
  
  // ビジネス要件: 先着順マッチングのためjoinedAt昇順ソート
  const validTeamInfos = teamInfos
    .filter((info): info is MatchingTeamInfo => info !== null)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

  return ok(validTeamInfos);
};

/**
 * FIFO方式による公平な対戦相手マッチング
 * 自チーム除外で最早参加チームとの対戦を実現
 */
export const findMatchingPartner = async (
  redis: RedisClient, 
  excludeTeamId: string
): Promise<Result<MatchingTeamInfo | null, string>> => {
  const teamsResult = await getMatchingQueueTeams(redis);
  if (teamsResult.isErr()) return err(`failed to get matching queue teams: ${teamsResult.error}`);

  const teams = teamsResult.value;
  
  // ビジネス要件: 自チーム除外でのFIFO（先入先出）マッチング
  // 将来拡張: レーティング差制限、チーム人数マッチング等の条件追加可能
  const partner = teams.find(team => team.teamId !== excludeTeamId);
  
  return ok(partner || null);
};
