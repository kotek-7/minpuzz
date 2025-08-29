
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import * as PieceService from '../../../model/game/pieceService.js';

describe('pieceService.place (click)', () => {
  test('success without holder/lock; sets placed and row/col', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-place-1';
    const pieceId = 'p1';
    await store.setPiece(matchId, { id: pieceId, placed: false } as any);
    const r = await PieceService.place(store as any, { matchId, pieceId, userId: 'u1', teamId: 't1', row: 1, col: 2 });
    expect(r.isOk()).toBe(true);
    if (r.isOk()) {
      expect(r.value.placed).toBe(true);
      expect(r.value.row).toBe(1);
      expect(r.value.col).toBe(2);
    }
  });

  test('rejects out-of-range cell', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-place-2';
    await store.setPiece(matchId, { id: 'p1', placed: false } as any);
    const r = await PieceService.place(store as any, { matchId, pieceId: 'p1', userId: 'u1', teamId: 't1', row: 5, col: 0 });
    expect(r.isErr() && r.error === 'invalidCell').toBe(true);
  });

  test('rejects when cell is already occupied', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-place-3';
    await store.setPiece(matchId, { id: 'p1', placed: false } as any);
    await store.setPiece(matchId, { id: 'p2', placed: true, row: 0, col: 0 } as any);
    const r = await PieceService.place(store as any, { matchId, pieceId: 'p1', userId: 'u1', teamId: 't1', row: 0, col: 0 });
    expect(r.isErr() && r.error === 'invalidCell').toBe(true);
  });

  test('rejects already placed piece', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-place-4';
    await store.setPiece(matchId, { id: 'p1', placed: true, row: 1, col: 1 } as any);
    const r = await PieceService.place(store as any, { matchId, pieceId: 'p1', userId: 'u1', teamId: 't1', row: 1, col: 2 });
    expect(r.isErr() && r.error === 'placed').toBe(true);
  });
});
