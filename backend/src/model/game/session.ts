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
  const raw = await redis.get(redisKeys.match(matchId));
  if (raw.isErr()) return err(raw.error);
  if (!raw.value) return err("match not found");
  let match: MatchRecord;
  try {
    match = JSON.parse(raw.value) as MatchRecord;
  } catch {
    return err("invalid match data");
  }

  if (match.status !== "PREPARING") return err("match is not in preparing state");
  const isTeamA = match.teamA.teamId === teamId;
  const isTeamB = match.teamB.teamId === teamId;
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
  const aMembers = await redis.smembers(redisKeys.matchTeamConnections(matchId, match.teamA.teamId));
  if (aMembers.isErr()) return err(aMembers.error);
  const bMembers = await redis.smembers(redisKeys.matchTeamConnections(matchId, match.teamB.teamId));
  if (bMembers.isErr()) return err(bMembers.error);
  const counts = { teamA: aMembers.value.length, teamB: bMembers.value.length };

  const expectedA = match.teamA.memberCount;
  const expectedB = match.teamB.memberCount;
  const allConnected = counts.teamA >= expectedA && counts.teamB >= expectedB;

  if (!allConnected) return ok({ allConnected, counts });

  // 4) 達成: matchをREADY、チームをIN_GAMEへ
  const updated: MatchRecord = { ...match, status: "READY" };
  const saveMatch = await redis.set(redisKeys.match(matchId), JSON.stringify(updated), RedisTTL.MATCH_PREPARING);
  if (saveMatch.isErr() || !saveMatch.value) return err("failed to update match to READY");

  // チーム状態更新
  const setTeam = async (tid: string): Promise<Result<void, string>> => {
    const tRaw = await redis.get(redisKeys.team(tid));
    if (tRaw.isErr()) return err(tRaw.error);
    if (!tRaw.value) return err("team not found");
    let t;
    try { t = JSON.parse(tRaw.value); } catch { return err("invalid team data"); }
    t.status = TeamStatus.IN_GAME;
    t.updatedAt = new Date().toISOString();
    const stored = await redis.set(redisKeys.team(tid), JSON.stringify(t), RedisTTL.TEAM_SESSION);
    if (stored.isErr() || !stored.value) return err("failed to update team IN_GAME");
    return ok(void 0);
  };

  const aSet = await setTeam(match.teamA.teamId);
  if (aSet.isErr()) return err(aSet.error);
  const bSet = await setTeam(match.teamB.teamId);
  if (bSet.isErr()) return err(bSet.error);

  return ok({ allConnected: true, counts });
}

