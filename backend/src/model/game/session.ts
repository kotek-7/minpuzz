import { err, ok, Result } from "neverthrow";
import type { RedisClient } from "../../repository/redisClient.js";
import { redisKeys } from "../../repository/redisKeys.js";
import { TeamStatus } from "../team/types.js";
import { RedisTTL } from "../team/team.js";

type MatchRecord = {
  id: string;
  teamA: { teamId: string; memberCount: number };
  teamB: { teamId: string; memberCount: number };
  status: string; // 'PREPARING' | 'READY' など
  createdAt: string;
};

export async function recordPlayerConnected(
  redis: RedisClient,
  matchId: string,
  teamId: string,
  userId: string,
): Promise<Result<{ allConnected: boolean; counts: { teamA: number; teamB: number } }, string>> {
  // 1) マッチの検証
  const matchRaw = await redis.get(redisKeys.match(matchId));
  if (matchRaw.isErr()) return err(matchRaw.error);
  if (!matchRaw.value) return err("match not found");
  let matchRecord: MatchRecord;
  try {
    matchRecord = JSON.parse(matchRaw.value) as MatchRecord;
  } catch {
    return err("invalid match data");
  }

  if (matchRecord.status !== "PREPARING") return err("match is not in preparing state");
  const isTeamA = matchRecord.teamA.teamId === teamId;
  const isTeamB = matchRecord.teamB.teamId === teamId;
  if (!isTeamA && !isTeamB) return err("team not part of match");

  // 任意検証: チームのメンバーであること
  const memberCheck = await redis.hget(redisKeys.teamMembers(teamId), userId);
  if (memberCheck.isErr()) return err(memberCheck.error);
  // メンバー登録がまだであっても、接続自体は許容したいならこのガードを外す
  if (!memberCheck.value) return err("user not in team");

  // 2) 接続登録
  const addRes = await redis.sadd(redisKeys.matchTeamConnections(matchId, teamId), userId);
  if (addRes.isErr()) return err(addRes.error);

  // 3) カウント集計
  const teamAConnections = await redis.smembers(redisKeys.matchTeamConnections(matchId, matchRecord.teamA.teamId));
  if (teamAConnections.isErr()) return err(teamAConnections.error);
  const teamBConnections = await redis.smembers(redisKeys.matchTeamConnections(matchId, matchRecord.teamB.teamId));
  if (teamBConnections.isErr()) return err(teamBConnections.error);
  const counts = { teamA: teamAConnections.value.length, teamB: teamBConnections.value.length };

  const expectedA = matchRecord.teamA.memberCount;
  const expectedB = matchRecord.teamB.memberCount;
  const allConnected = counts.teamA >= expectedA && counts.teamB >= expectedB;

  if (!allConnected) return ok({ allConnected, counts });

  // 4) 達成: matchをREADY、チームをIN_GAMEへ
  const updatedMatchRecord: MatchRecord = { ...matchRecord, status: "READY" };
  const saveMatch = await redis.set(redisKeys.match(matchId), JSON.stringify(updatedMatchRecord), RedisTTL.MATCH_PREPARING);
  if (saveMatch.isErr() || !saveMatch.value) return err("failed to update match to READY");

  // チーム状態更新
  const updateTeamToInGame = async (targetTeamId: string): Promise<Result<void, string>> => {
    const teamRaw = await redis.get(redisKeys.team(targetTeamId));
    if (teamRaw.isErr()) return err(teamRaw.error);
    if (!teamRaw.value) return err("team not found");
    let team;
    try { team = JSON.parse(teamRaw.value); } catch { return err("invalid team data"); }
    team.status = TeamStatus.IN_GAME;
    team.updatedAt = new Date().toISOString();
    const stored = await redis.set(redisKeys.team(targetTeamId), JSON.stringify(team), RedisTTL.TEAM_SESSION);
    if (stored.isErr() || !stored.value) return err("failed to update team IN_GAME");
    return ok(void 0);
  };

  const updateTeamAResult = await updateTeamToInGame(matchRecord.teamA.teamId);
  if (updateTeamAResult.isErr()) return err(updateTeamAResult.error);
  const updateTeamBResult = await updateTeamToInGame(matchRecord.teamB.teamId);
  if (updateTeamBResult.isErr()) return err(updateTeamBResult.error);

  return ok({ allConnected: true, counts });
}
