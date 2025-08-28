import { describe, test, expect } from '@jest/globals';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - pieces (click)', () => {
  test('set/get/list roundtrip (row/col/placed)', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-1';
    const piece = { id: 'p1', x: 0, y: 0, placed: false };
    const set1 = await store.setPiece(matchId, piece as any);
    expect(set1.isOk()).toBe(true);
    const got1 = await store.getPiece(matchId, 'p1');
    expect(got1.isOk() && got1.value && got1.value.placed === false).toBe(true);

    const placed = { ...piece, placed: true, row: 2, col: 3 };
    const set2 = await store.setPiece(matchId, placed as any);
    expect(set2.isOk()).toBe(true);
    const got2 = await store.getPiece(matchId, 'p1');
    expect(got2.isOk() && got2.value && got2.value.placed && got2.value.row === 2 && got2.value.col === 3).toBe(true);

    const list = await store.listPieces(matchId);
    expect(list.isOk() && list.value.length === 1 && list.value[0].id === 'p1').toBe(true);
  });
});

