
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { checkAllPlaced, completeMatchIfNeeded } from '../../../model/game/endService.js';

describe('end (click)', () => {
  test('complete when all pieces placed (small set)', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-end-click-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: true, row: 0, col: 0 } as any);
    await store.setPiece(matchId, { id: 'p2', x: 0, y: 0, placed: true, row: 0, col: 1 } as any);
    const all = await checkAllPlaced(store as any, matchId);
    expect(all.isOk() && all.value).toBe(true);
    const done = await completeMatchIfNeeded(store as any, matchId);
    expect(done.isOk() && done.value.completed).toBe(true);
    const again = await completeMatchIfNeeded(store as any, matchId);
    expect(again.isOk() && again.value.completed === false).toBe(true);
  });
});

