import { v4 as uuidv4 } from "uuid";
import { RedisClient } from "../../repository/redisClient.js";
import { MemberRole, MemberStatus, Team, TeamMember, TeamStatus } from "./types.js";
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
  if (setStatusResult.value === 0) return err("failed to update member status in team members hash");

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
