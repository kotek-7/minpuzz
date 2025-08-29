import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - pieces', () => {
  test('set/get/list pieces', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm1';
    await store.setPiece(matchId, { id: 'p1', placed: false } as any);
    await store.setPiece(matchId, { id: 'p2', placed: true, row: 0, col: 1 } as any);

    const p1 = await store.getPiece(matchId, 'p1');
    const p2 = await store.getPiece(matchId, 'p2');
    const list = await store.listPieces(matchId);

    expect(p1.isOk() && p1.value?.id === 'p1').toBe(true);
    expect(p2.isOk() && p2.value?.row === 0 && p2.value?.col === 1).toBe(true);
    expect(list.isOk() && list.value.length).toBe(2);
  });

  test('reject invalid placed piece', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const res = await store.setPiece('m1', { id: 'pX', placed: true } as any);
    expect(res.isErr()).toBe(true);
  });
});
