import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { joinQueue } from '../../../model/matching/matching.js';
import { createTeam, startMatching } from '../../../model/team/team.js';
import { redisKeys } from '../../../repository/redisKeys.js';

describe('model/matching/matching.joinQueue', () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it('returns waiting when no partner exists and keeps self in queue', async () => {
    const teamA = await createTeam(redis, 'leader-A');
    expect(teamA.isOk()).toBe(true);
    const teamAId = teamA.isOk() ? teamA.value.id : '';

    const startedA = await startMatching(redis, teamAId);
    expect(startedA.isOk()).toBe(true);

    const result = await joinQueue(redis, teamAId);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const v = result.value;
      expect(v.type).toBe('waiting');
      if (v.type === 'waiting') {
        expect(v.self.teamId).toBe(teamAId);
      }
    }

    // Check raw membership in the queue set to avoid any cleanup-side filtering
    const members = await redis.smembers(redisKeys.matchingQueue());
    expect(members.isOk()).toBe(true);
    if (members.isOk()) {
      expect(members.value.includes(teamAId)).toBe(true);
    }
  });

  it('matches with the oldest partner and removes both from queue', async () => {
    const teamA = await createTeam(redis, 'leader-A');
    const teamB = await createTeam(redis, 'leader-B');
    expect(teamA.isOk()).toBe(true);
    expect(teamB.isOk()).toBe(true);
    const aId = teamA.isOk() ? teamA.value.id : '';
    const bId = teamB.isOk() ? teamB.value.id : '';

    expect((await startMatching(redis, aId)).isOk()).toBe(true);
    expect((await startMatching(redis, bId)).isOk()).toBe(true);

    // A joins first (older in queue)
    const resA = await joinQueue(redis, aId);
    expect(resA.isOk()).toBe(true);
    if (resA.isOk()) expect(resA.value.type).toBe('waiting');

    // B joins next -> should match with A
    const resB = await joinQueue(redis, bId);
    expect(resB.isOk()).toBe(true);
    if (resB.isOk()) {
      const v = resB.value;
      expect(v.type).toBe('found');
      if (v.type === 'found') {
        expect(typeof v.matchId).toBe('string');
        expect(v.partner.teamId).toBe(aId);
        expect(v.self.teamId).toBe(bId);
      }
    }

    // Queue should be empty for both teams
    const members = await redis.smembers(redisKeys.matchingQueue());
    expect(members.isOk()).toBe(true);
    if (members.isOk()) {
      expect(members.value.includes(aId)).toBe(false);
      expect(members.value.includes(bId)).toBe(false);
    }
  });

  it('cleans up expired entries best-effort', async () => {
    const teamA = await createTeam(redis, 'leader-A');
    expect(teamA.isOk()).toBe(true);
    const aId = teamA.isOk() ? teamA.value.id : '';
    expect((await startMatching(redis, aId)).isOk()).toBe(true);

    // insert a stale entry that logic will consider expired relative to now
    const staleId = 'stale-team-id';
    await redis.sadd(redisKeys.matchingQueue(), staleId);
    await redis.set(
      redisKeys.matchingTeam(staleId),
      JSON.stringify({ teamId: staleId, memberCount: 2, joinedAt: '2023-01-01T00:00:00.000Z' })
    );

    const res = await joinQueue(redis, aId);
    expect(res.isOk()).toBe(true);

    // stale entry should be cleaned up
    const setMembers = await redis.smembers(redisKeys.matchingQueue());
    expect(setMembers.isOk()).toBe(true);
    if (setMembers.isOk()) {
      expect(setMembers.value.includes(staleId)).toBe(false);
    }
    const staleInfo = await redis.get(redisKeys.matchingTeam(staleId));
    expect(staleInfo.isOk()).toBe(true);
    if (staleInfo.isOk()) {
      expect(staleInfo.value).toBe(null);
    }
  });

  it('propagates error when team is not in MATCHING state', async () => {
    const teamA = await createTeam(redis, 'leader-A');
    expect(teamA.isOk()).toBe(true);
    const aId = teamA.isOk() ? teamA.value.id : '';

    const res = await joinQueue(redis, aId);
    expect(res.isErr()).toBe(true);
    if (res.isErr()) {
      expect(res.error).toMatch(/not in matching state|Team is not ready for matching|team is not in matching state/i);
    }
  });
});
