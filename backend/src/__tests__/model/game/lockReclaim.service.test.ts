import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { reclaimLocksForUserAcrossMatches } from '../../../model/game/lockReclaimService.js';

describe('lockReclaimService', () => {
  test('clears holder and releases lock so others can grab', async () => {
    const redis = new MockRedisClient();
    const store = new RedisGameStore(redis as any);
    const matchId = 'm-reclaim-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false, holder: 'u1' } as any);
    // lock by u1
    await store.acquirePieceLock(matchId, 'p1', 'u1', 5);

    // reclaim for u1
    await reclaimLocksForUserAcrossMatches(redis as any, store, 'u1');

    // after reclaim, new user should be able to grab
    const g = await store.acquirePieceLock(matchId, 'p1', 'u2', 5);
    expect(g.isOk() && g.value === true).toBe(true);
    const p1 = await store.getPiece(matchId, 'p1');
    expect(p1.isOk() && (!p1.value || !('holder' in p1.value) || (p1.value as any).holder === undefined)).toBe(true);
  });

  test('idempotent when called multiple times', async () => {
    const redis = new MockRedisClient();
    const store = new RedisGameStore(redis as any);
    const matchId = 'm-reclaim-2';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false, holder: 'u1' } as any);
    await store.acquirePieceLock(matchId, 'p1', 'u1', 5);

    await reclaimLocksForUserAcrossMatches(redis as any, store, 'u1');
    await reclaimLocksForUserAcrossMatches(redis as any, store, 'u1');

    const p1 = await store.getPiece(matchId, 'p1');
    expect(p1.isOk()).toBe(true);
    if (p1.isOk() && p1.value) {
      expect((p1.value as any).holder).toBeUndefined();
    }
  });
});
