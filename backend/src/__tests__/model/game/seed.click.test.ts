
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { seedPiecesIfEmpty } from '../../../model/game/seed.js';

describe('seed (click, 5x5)', () => {
  test('seeds 25 pieces only once', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-seed-1';
    await seedPiecesIfEmpty(store as any, { matchId, rows: 5, cols: 5 });
    const list1 = await store.listPieces(matchId);
    expect(list1.isOk() && list1.value.length === 25).toBe(true);
    // call again: should remain 25
    await seedPiecesIfEmpty(store as any, { matchId, rows: 5, cols: 5 });
    const list2 = await store.listPieces(matchId);
    expect(list2.isOk() && list2.value.length === 25).toBe(true);
  });
});

