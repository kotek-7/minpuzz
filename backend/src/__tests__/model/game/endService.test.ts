import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { completeMatchIfNeeded, checkAllPlaced } from '../../../model/game/endService.js';

describe('endService', () => {
  test('completes once when all pieces placed', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-end';
    // seed match and pieces
    await store.setMatch(matchId, {
      id: matchId,
      teamA: { teamId: 'TA', memberCount: 2 },
      teamB: { teamId: 'TB', memberCount: 2 },
      status: 'IN_GAME',
      createdAt: new Date().toISOString(),
    });
    await store.setPiece(matchId, { id: 'p1', placed: true, row: 0, col: 0 } as any);
    await store.setPiece(matchId, { id: 'p2', placed: false } as any);

    const all1 = await checkAllPlaced(store, matchId);
    expect(all1.isOk() && all1.value).toBe(false);

    await store.setPiece(matchId, { id: 'p2', placed: true, row: 0, col: 1 } as any);
    const all2 = await checkAllPlaced(store, matchId);
    expect(all2.isOk() && all2.value).toBe(true);

    const c1 = await completeMatchIfNeeded(store, matchId);
    expect(c1.isOk() && c1.value.completed).toBe(true);

    const c2 = await completeMatchIfNeeded(store, matchId);
    expect(c2.isOk() && c2.value.completed).toBe(false); // idempotent
  });
});
