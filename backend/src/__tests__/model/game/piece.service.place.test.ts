import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import * as PieceService from '../../../model/game/pieceService.js';

describe('pieceService.place', () => {
  test('success: sets placed, row/col and releases lock', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm';
    const pieceId = 'p';
    await store.setPiece(matchId, { id: pieceId, x: 0, y: 0, placed: false });

    // acquire holder via grab
    const g = await PieceService.grab(store, { matchId, pieceId, userId: 'u1', lockTtlSec: 1 });
    expect(g.isOk()).toBe(true);

    const placed = await PieceService.place(store, { matchId, pieceId, userId: 'u1', row: 1, col: 2, x: 10, y: 11 });
    expect(placed.isOk()).toBe(true);
    if (placed.isOk()) {
      expect(placed.value.placed).toBe(true);
      expect(placed.value.row).toBe(1);
      expect(placed.value.col).toBe(2);
    }

    // further grab should be denied (already placed)
    const g2 = await PieceService.grab(store, { matchId, pieceId, userId: 'u2', lockTtlSec: 1 });
    expect(g2.isErr() && g2.error === 'placed').toBe(true);
  });

  test('rejects non-holder', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm2';
    const pieceId = 'p2';
    await store.setPiece(matchId, { id: pieceId, x: 0, y: 0, placed: false });
    await PieceService.grab(store, { matchId, pieceId, userId: 'u1', lockTtlSec: 1 });

    const r = await PieceService.place(store, { matchId, pieceId, userId: 'u2', row: 0, col: 0, x: 1, y: 2 });
    expect(r.isErr() && r.error === 'notHolder').toBe(true);
  });

  test('invalid cell', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm3';
    const pieceId = 'p3';
    await store.setPiece(matchId, { id: pieceId, x: 0, y: 0, placed: false });
    await PieceService.grab(store, { matchId, pieceId, userId: 'u1', lockTtlSec: 1 });
    const r = await PieceService.place(store, { matchId, pieceId, userId: 'u1', row: -1, col: 0, x: 0, y: 0 });
    expect(r.isErr() && r.error === 'invalidCell').toBe(true);
  });
});

