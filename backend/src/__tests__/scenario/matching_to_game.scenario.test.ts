import { MockRedisClient } from "../setup/MockRedisClient.js";
import { redisKeys } from "../../repository/redisKeys.js";
import {
  createTeam,
  addMember,
  startMatching,
  getTeam,
} from "../../model/team/team.js";
import { TeamStatus } from "../../model/team/types.js";
import { joinQueue } from "../../model/matching/matching.js";
import { recordPlayerConnected } from "../../model/game/session.js";

describe("Scenario: matching to game start (model integration)", () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it("runs full flow: matching -> preparing -> all connected -> ready/in-game", async () => {
    // Create two teams
    const teamARes = await createTeam(redis, "leader-A");
    const teamBRes = await createTeam(redis, "leader-B");
    expect(teamARes.isOk()).toBe(true);
    expect(teamBRes.isOk()).toBe(true);
    const teamAId = teamARes.isOk() ? teamARes.value.id : "";
    const teamBId = teamBRes.isOk() ? teamBRes.value.id : "";

    // Add members (2 per team)
    expect((await addMember(redis, teamAId, "a1")).isOk()).toBe(true);
    expect((await addMember(redis, teamAId, "a2")).isOk()).toBe(true);
    expect((await addMember(redis, teamBId, "b1")).isOk()).toBe(true);
    expect((await addMember(redis, teamBId, "b2")).isOk()).toBe(true);

    // Start matching for both
    expect((await startMatching(redis, teamAId)).isOk()).toBe(true);
    expect((await startMatching(redis, teamBId)).isOk()).toBe(true);
    const teamAAfterStart = await getTeam(redis, teamAId);
    const teamBAfterStart = await getTeam(redis, teamBId);
    expect(teamAAfterStart.isOk()).toBe(true);
    expect(teamBAfterStart.isOk()).toBe(true);
    if (teamAAfterStart.isOk() && teamBAfterStart.isOk()) {
      expect(teamAAfterStart.value?.status).toBe(TeamStatus.MATCHING);
      expect(teamBAfterStart.value?.status).toBe(TeamStatus.MATCHING);
    }

    // A joins queue first -> waiting
    const joinARes = await joinQueue(redis, teamAId);
    expect(joinARes.isOk()).toBe(true);
    if (joinARes.isOk()) expect(joinARes.value.type).toBe("waiting");

    // B joins -> found vs A
    const joinBRes = await joinQueue(redis, teamBId);
    expect(joinBRes.isOk()).toBe(true);
    if (!joinBRes.isOk() || joinBRes.value.type !== "found") throw new Error("expected match found");
    const { matchId, self, partner } = joinBRes.value;
    expect(self.teamId).toBe(teamBId);
    expect(partner.teamId).toBe(teamAId);

    // Teams moved to PREPARING
    const teamAPreparing = await getTeam(redis, teamAId);
    const teamBPreparing = await getTeam(redis, teamBId);
    expect(teamAPreparing.isOk()).toBe(true);
    expect(teamBPreparing.isOk()).toBe(true);
    if (teamAPreparing.isOk() && teamBPreparing.isOk()) {
      expect(teamAPreparing.value?.status).toBe(TeamStatus.PREPARING);
      expect(teamBPreparing.value?.status).toBe(TeamStatus.PREPARING);
    }

    // Match record saved as PREPARING
    const matchRaw = await redis.get(redisKeys.match(matchId));
    expect(matchRaw.isOk()).toBe(true);
    if (matchRaw.isOk()) {
      const matchDoc = matchRaw.value ? JSON.parse(matchRaw.value) : null;
      expect(matchDoc).not.toBeNull();
      expect(matchDoc.id).toBe(matchId);
      expect(matchDoc.status).toBe("PREPARING");
    }

    // Queue cleaned up: neither team should remain in the waiting set
    const queueMembers = await redis.smembers(redisKeys.matchingQueue());
    expect(queueMembers.isOk()).toBe(true);
    if (queueMembers.isOk()) {
      expect(queueMembers.value.includes(teamAId)).toBe(false);
      expect(queueMembers.value.includes(teamBId)).toBe(false);
    }

    // Locks/claims cleaned (pair claim)
    const pairKey = (teamAId < teamBId) ? `${teamAId}|${teamBId}` : `${teamBId}|${teamAId}`;
    const claimSet = await redis.smembers(redisKeys.matchPairClaims());
    expect(claimSet.isOk()).toBe(true);
    if (claimSet.isOk()) {
      expect(claimSet.value.includes(pairKey)).toBe(false);
    }
    const lockSet = await redis.smembers(redisKeys.matchTeamLocks());
    expect(lockSet.isOk()).toBe(true);
    if (lockSet.isOk()) {
      expect(lockSet.value.includes(teamAId)).toBe(false);
      expect(lockSet.value.includes(teamBId)).toBe(false);
    }

    // Record connections for all players
    const c1 = await recordPlayerConnected(redis, matchId, teamAId, "a1");
    expect(c1.isOk()).toBe(true);
    if (c1.isOk()) expect(c1.value.allConnected).toBe(false);
    const c2 = await recordPlayerConnected(redis, matchId, teamAId, "a2");
    expect(c2.isOk()).toBe(true);
    if (c2.isOk()) expect(c2.value.allConnected).toBe(false);
    const c3 = await recordPlayerConnected(redis, matchId, teamBId, "b1");
    expect(c3.isOk()).toBe(true);
    if (c3.isOk()) expect(c3.value.allConnected).toBe(false);
    const c4 = await recordPlayerConnected(redis, matchId, teamBId, "b2");
    expect(c4.isOk()).toBe(true);
    if (c4.isOk()) expect(c4.value.allConnected).toBe(true);

    // Match becomes READY, teams become IN_GAME
    const matchAfterReady = await redis.get(redisKeys.match(matchId));
    expect(matchAfterReady.isOk()).toBe(true);
    if (matchAfterReady.isOk()) {
      const m = matchAfterReady.value ? JSON.parse(matchAfterReady.value) : null;
      expect(m.status).toBe("READY");
    }
    const teamAInGame = await getTeam(redis, teamAId);
    const teamBInGame = await getTeam(redis, teamBId);
    expect(teamAInGame.isOk()).toBe(true);
    expect(teamBInGame.isOk()).toBe(true);
    if (teamAInGame.isOk() && teamBInGame.isOk()) {
      expect(teamAInGame.value?.status).toBe(TeamStatus.IN_GAME);
      expect(teamBInGame.value?.status).toBe(TeamStatus.IN_GAME);
    }

    // Connection sets include all expected users
    const aConn = await redis.smembers(redisKeys.matchTeamConnections(matchId, teamAId));
    const bConn = await redis.smembers(redisKeys.matchTeamConnections(matchId, teamBId));
    expect(aConn.isOk()).toBe(true);
    expect(bConn.isOk()).toBe(true);
    if (aConn.isOk() && bConn.isOk()) {
      expect(new Set(aConn.value)).toEqual(new Set(["a1", "a2"]));
      expect(new Set(bConn.value)).toEqual(new Set(["b1", "b2"]));
    }
  });
});

