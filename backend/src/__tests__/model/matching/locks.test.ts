import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { acquireTeamLocks, releaseTeamLocks, claimPair, releasePairClaim } from '../../../model/matching/matching.js';
import { redisKeys } from '../../../repository/redisKeys.js';

describe('matching locks and claims', () => {
  let redis: MockRedisClient;
  const TTL = 5;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it('acquireTeamLocks acquires and blocks until released', async () => {
    const a = 'A';
    const b = 'B';
    const first = await acquireTeamLocks(redis, a, b, TTL);
    expect(first.isOk()).toBe(true);
    if (first.isOk()) expect(first.value).toBe(true);

    const second = await acquireTeamLocks(redis, a, b, TTL);
    expect(second.isOk()).toBe(true);
    if (second.isOk()) expect(second.value).toBe(false);

    const rel = await releaseTeamLocks(redis, a, b);
    expect(rel.isOk()).toBe(true);

    const third = await acquireTeamLocks(redis, a, b, TTL);
    expect(third.isOk()).toBe(true);
    if (third.isOk()) expect(third.value).toBe(true);
  });

  it('acquireTeamLocks heals stale set entries without string TTL', async () => {
    const a = 'A';
    const b = 'B';
    // Insert stale set member without corresponding string key
    await redis.sadd(redisKeys.matchTeamLocks(), a);
    const first = await acquireTeamLocks(redis, a, b, TTL);
    expect(first.isOk()).toBe(true);
    if (first.isOk()) expect(first.value).toBe(true);
  });

  it('claimPair allows only one claimant until released', async () => {
    const a = 'A';
    const b = 'B';
    const c1 = await claimPair(redis, a, b, TTL);
    expect(c1.isOk()).toBe(true);
    if (c1.isOk()) expect(c1.value.claimed).toBe(true);

    const c2 = await claimPair(redis, a, b, TTL);
    expect(c2.isOk()).toBe(true);
    if (c2.isOk()) expect(c2.value.claimed).toBe(false);

    if (c1.isOk()) {
      await releasePairClaim(redis, c1.value.key);
    }

    const c3 = await claimPair(redis, a, b, TTL);
    expect(c3.isOk()).toBe(true);
    if (c3.isOk()) expect(c3.value.claimed).toBe(true);
  });
});

