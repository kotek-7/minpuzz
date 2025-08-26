import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { joinQueue } from '../../../model/matching/matching.js';
import { createTeam, startMatching } from '../../../model/team/team.js';
import { redisKeys } from '../../../repository/redisKeys.js';

describe('model/matching/matching.joinQueue concurrency', () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it('only one of two concurrent joinQueue calls results in found (the other waits)', async () => {
    const ta = await createTeam(redis, 'leader-A');
    const tb = await createTeam(redis, 'leader-B');
    if (!ta.isOk() || !tb.isOk()) throw new Error('team creation failed');
    const aId = ta.value.id;
    const bId = tb.value.id;

    expect((await startMatching(redis, aId)).isOk()).toBe(true);
    expect((await startMatching(redis, bId)).isOk()).toBe(true);

    const [ra, rb] = await Promise.all([
      joinQueue(redis, aId),
      joinQueue(redis, bId),
    ]);

    expect(ra.isOk()).toBe(true);
    expect(rb.isOk()).toBe(true);
    const types = [ra.isOk() ? ra.value.type : 'err', rb.isOk() ? rb.value.type : 'err'];
    const foundCount = types.filter(t => t === 'found').length;
    const waitingCount = types.filter(t => t === 'waiting').length;
    expect(foundCount).toBe(1);
    expect(waitingCount).toBe(1);

    const members = await redis.smembers(redisKeys.matchingQueue());
    expect(members.isOk()).toBe(true);
    if (members.isOk()) {
      expect(members.value.includes(aId)).toBe(false);
      expect(members.value.includes(bId)).toBe(false);
    }
  });

  it('when pair is already claimed, joinQueue returns waiting and keeps both teams in queue', async () => {
    const ta = await createTeam(redis, 'leader-A');
    const tb = await createTeam(redis, 'leader-B');
    if (!ta.isOk() || !tb.isOk()) throw new Error('team creation failed');
    const aId = ta.value.id;
    const bId = tb.value.id;

    expect((await startMatching(redis, aId)).isOk()).toBe(true);
    expect((await startMatching(redis, bId)).isOk()).toBe(true);

    // A joins first and waits in queue
    const ra = await joinQueue(redis, aId);
    expect(ra.isOk()).toBe(true);
    if (ra.isOk()) expect(ra.value.type).toBe('waiting');

    // Pre-claim the pair (simulate another node already claiming)
    const [t1, t2] = aId < bId ? [aId, bId] : [bId, aId];
    const pairKey = `${t1}|${t2}`;
    await redis.sadd(redisKeys.matchPairClaims(), pairKey);

    // B attempts to join and match with A but claimPair should fail
    const rb = await joinQueue(redis, bId);
    expect(rb.isOk()).toBe(true);
    if (rb.isOk()) expect(rb.value.type).toBe('waiting');

    // Both A and B should remain in the queue set
    const members = await redis.smembers(redisKeys.matchingQueue());
    expect(members.isOk()).toBe(true);
    if (members.isOk()) {
      expect(members.value.includes(aId)).toBe(true);
      expect(members.value.includes(bId)).toBe(true);
    }
  });
});

