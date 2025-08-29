
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { buildStateSnapshot } from '../../../model/game/state.js';
import { seedPiecesIfEmpty } from '../../../model/game/seed.js';

describe('state snapshot (click, 5x5)', () => {
  test('board is 5x5 and reflects seeded pieces', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-snap-1';
    await seedPiecesIfEmpty(store as any, { matchId, rows: 5, cols: 5 });
    const snapR = await buildStateSnapshot(store as any, matchId);
    expect(snapR.isOk()).toBe(true);
    if (snapR.isOk()) {
      const snap = snapR.value;
      expect(snap.board.rows).toBe(5);
      expect(snap.board.cols).toBe(5);
      expect(Array.isArray(snap.pieces) && snap.pieces.length).toBe(25);
    }
  });
});

